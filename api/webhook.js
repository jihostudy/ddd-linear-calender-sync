import { verifyLinearSignature } from '../lib/verify-signature.js';
import { handleWebhook } from '../lib/handler.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('failed to read body', err);
    return res.status(400).json({ error: 'invalid body' });
  }

  const signature = req.headers['linear-signature'];
  const secret = process.env.LINEAR_WEBHOOK_SECRET;

  if (!secret) {
    console.error('LINEAR_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'server misconfigured' });
  }

  if (!verifyLinearSignature(rawBody, signature, secret)) {
    console.warn('signature verification failed');
    return res.status(400).json({ error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).json({ error: 'invalid json' });
  }

  try {
    const result = await handleWebhook(payload);
    console.log('webhook handled', result);
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('handler error', err);
    return res.status(500).json({ error: 'handler failed', message: err.message });
  }
}
