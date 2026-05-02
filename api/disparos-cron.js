// Vercel Cron Job: roda a cada 5 minutos e dispara mensagens agendadas
// Configurado em vercel.json como cron: "*/5 * * * *"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEBHOOK_URL = 'https://walle.agendaedu.com/webhook/disparo_leads_eventos';
const CRON_SECRET = process.env.CRON_SECRET;

async function supabaseGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  if (!res.ok) throw new Error(`Supabase GET ${table} failed: ${res.status}`);
  return res.json();
}

async function supabasePatch(table, id, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase PATCH ${table} failed: ${res.status}`);
}

export default async function handler(req, res) {
  if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const now = new Date();
  const log = { fired: [], errors: [] };

  try {
    const pendentes = await supabaseGet(
      'disparos_agendados',
      `status=eq.pendente&agendar_para=lte.${encodeURIComponent(now.toISOString())}&select=*`
    );

    for (const disparo of pendentes) {
      try {
        const leads = disparo.leads_json;

        const payload = {
          template_nome: disparo.template_nome,
          template_corpo: disparo.template_corpo,
          has_image: disparo.has_image,
          image_url: disparo.image_url ?? undefined,
          segmento: disparo.segmento,
          telefones: leads.map((l) => l.telefone).join(','),
          leads,
        };

        const webhookRes = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        await supabasePatch('disparos_agendados', disparo.id, {
          status: webhookRes.ok ? 'enviado' : 'erro',
          enviado_em: now.toISOString(),
        });

        log.fired.push({ id: disparo.id, leads: leads.length, webhookStatus: webhookRes.status });
      } catch (err) {
        try {
          await supabasePatch('disparos_agendados', disparo.id, { status: 'erro' });
        } catch (_) {}
        log.errors.push({ id: disparo.id, error: String(err) });
      }
    }

    return res.status(200).json({ ok: true, checked: pendentes.length, ...log });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
