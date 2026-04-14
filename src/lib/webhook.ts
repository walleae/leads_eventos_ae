// Em dev: proxy Vite → walle.agendaedu.com (evita CORS)
// Em prod: Vercel serverless function /api/disparo (evita CORS)
const WEBHOOK_URL = import.meta.env.DEV
  ? '/api/walle/webhook/disparo_leads_eventos'
  : '/api/disparo';

export async function dispararMensagem(payload: object): Promise<Response> {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
}
