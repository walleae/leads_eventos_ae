export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb',
  },
};

export default async function handler(req, res) {
  // Path capturado pelo rewrite no vercel.json via _p=
  const graphPath = req.query._p || '';
  const extraParams = { ...req.query };
  delete extraParams._p;

  const qs = new URLSearchParams(extraParams).toString();
  const targetUrl = `https://graph.facebook.com/${graphPath}${qs ? '?' + qs : ''}`;

  // Monta headers sem os que quebram o proxy
  const forward = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lower = k.toLowerCase();
    if (lower !== 'host' && lower !== 'content-length' && lower !== 'transfer-encoding') {
      forward[k] = v;
    }
  }

  // Lê body raw (necessário para uploads binários)
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (chunks.length) body = Buffer.concat(chunks);
  }

  const upstream = await fetch(targetUrl, {
    method: req.method,
    headers: forward,
    body,
  });

  const skip = new Set(['content-encoding', 'transfer-encoding', 'connection']);
  for (const [k, v] of upstream.headers.entries()) {
    if (!skip.has(k.toLowerCase())) res.setHeader(k, v);
  }

  const buf = await upstream.arrayBuffer();
  res.status(upstream.status).send(Buffer.from(buf));
}
