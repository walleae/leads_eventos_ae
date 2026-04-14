export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const response = await fetch(
      'https://walle.agendaedu.com/webhook/disparo_leads_eventos',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
      }
    );
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
