// Vercel Cron Job: roda a cada hora e dispara cadências agendadas
// Configurado em vercel.json como cron: "0 * * * *"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEBHOOK_URL = 'https://walle.agendaedu.com/webhook/disparo_leads_eventos';
const CRON_SECRET = process.env.CRON_SECRET;

// Mapa de segmentos → filtros (espelha Disparar.tsx)
const SEGMENTOS = {
  quentes:     { niveis: ['quente'] },
  mornos:      { niveis: ['morno'] },
  frios:       { niveis: ['frio'] },
  proposta:    { stages: ['proposta'] },
  negociacao:  { stages: ['negociacao'] },
  aquecimento: { stages: ['aquecimento'] },
  clientes:    { jaECliente: true },
  convertidos: { stages: ['convertido'] },
  novos:       { stages: ['novo'] },
};

function matchesSegmento(lead, segId) {
  const f = SEGMENTOS[segId];
  if (!f) return true;
  if (f.stages && !f.stages.includes(lead.stage)) return false;
  if (f.niveis && lead.nivel_interesse !== f.niveis[0]) return false;
  if (f.jaECliente !== undefined && Boolean(lead.ja_e_cliente) !== f.jaECliente) return false;
  return true;
}

function filterLeads(leads, cadencia) {
  let result = leads;

  if (cadencia.origem_ids && cadencia.origem_ids.length > 0) {
    result = result.filter((l) => cadencia.origem_ids.includes(l.origem));
  }

  if (cadencia.segmento_ids && cadencia.segmento_ids.length > 0) {
    result = result.filter((l) =>
      cadencia.segmento_ids.some((segId) => matchesSegmento(l, segId))
    );
  }

  return result;
}

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
  // Protege o endpoint com secret opcional
  if (CRON_SECRET && req.headers['x-cron-secret'] !== CRON_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // Hora atual em BRT (UTC-3)
  const now = new Date();
  const brtOffset = -3 * 60; // minutos
  const brtNow = new Date(now.getTime() + (now.getTimezoneOffset() + brtOffset) * 60000);
  const brtHour = brtNow.getHours();
  const brtDay  = brtNow.getDay(); // 0=dom, 1=seg, ..., 6=sab

  const log = { brtHour, brtDay, fired: [], skipped: [], errors: [] };

  try {
    // Busca cadências ativas agendadas para esta hora
    const cadencias = await supabaseGet(
      'cadencias',
      `ativo=eq.true&horario=eq.${brtHour}&select=*`
    );

    for (const cadencia of cadencias) {
      try {
        // Verifica se o dia da semana bate
        if (!cadencia.dias_semana.includes(brtDay)) {
          log.skipped.push({ id: cadencia.id, reason: 'dia_semana' });
          continue;
        }

        // Evita disparo duplo: ignora se já executou nas últimas 2h
        if (cadencia.ultima_execucao) {
          const lastRun = new Date(cadencia.ultima_execucao);
          const diffHours = (now - lastRun) / 3600000;
          if (diffHours < 2) {
            log.skipped.push({ id: cadencia.id, reason: 'ja_executou', diffHours });
            continue;
          }
        }

        // Busca leads paginados (máx 5000)
        let allLeads = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const page = await supabaseGet(
            'leads',
            `select=id,nome,telefone,email,nome_escola,stage,estado,origem,nivel_interesse,ja_e_cliente&limit=${pageSize}&offset=${from}`
          );
          allLeads = allLeads.concat(page);
          if (page.length < pageSize) break;
          from += pageSize;
        }

        const leadsAlvo = filterLeads(allLeads, cadencia);

        if (leadsAlvo.length === 0) {
          log.skipped.push({ id: cadencia.id, reason: 'sem_leads' });
          await supabasePatch('cadencias', cadencia.id, { ultima_execucao: now.toISOString() });
          continue;
        }

        const mediaType = cadencia.image_url?.toLowerCase().endsWith('.pdf') ? 'document'
          : cadencia.has_image ? 'image'
          : 'text';

        const payload = {
          template_nome: cadencia.template_nome,
          template_corpo: cadencia.template_corpo,
          media_type: mediaType,
          image_url: cadencia.image_url ?? undefined,
          segmento: (cadencia.segmento_ids ?? []).join(',') || 'todos',
          telefones: leadsAlvo.map((l) => l.telefone).join(','),
          leads: leadsAlvo.map((l) => ({
            id: l.id,
            nome: l.nome,
            telefone: l.telefone,
            email: l.email,
            nomeEscola: l.nome_escola,
            stage: l.stage,
            estado: l.estado,
          })),
        };

        const webhookRes = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        await supabasePatch('cadencias', cadencia.id, { ultima_execucao: now.toISOString() });
        log.fired.push({ id: cadencia.id, nome: cadencia.nome, leads: leadsAlvo.length, status: webhookRes.status });
      } catch (err) {
        log.errors.push({ id: cadencia.id, error: String(err) });
      }
    }

    return res.status(200).json({ ok: true, ...log });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
