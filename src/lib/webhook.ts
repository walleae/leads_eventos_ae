export async function dispararMensagem(payload: object): Promise<Response> {
  const response = await fetch('https://walle.agendaedu.com/webhook/disparo_leads_eventos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response;
}
