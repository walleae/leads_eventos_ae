const WEBHOOK_URL = import.meta.env.DEV
  ? '/api/walle/webhook/disparo_leads_eventos'
  : 'https://walle.agendaedu.com/webhook/disparo_leads_eventos';

export async function dispararMensagem(payload: object): Promise<Response> {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
}
