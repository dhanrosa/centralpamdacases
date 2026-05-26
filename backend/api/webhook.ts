import type { IncomingMessage, ServerResponse } from 'http';

type QueryValue = string | string[] | undefined;

interface VercelRequestLike extends IncomingMessage {
  query?: Record<string, QueryValue>;
  body?: unknown;
}

interface VercelResponseLike extends ServerResponse {
  status: (code: number) => VercelResponseLike;
  json: (body: unknown) => void;
  send: (body: string) => void;
}

function first(value: QueryValue) {
  return Array.isArray(value) ? value[0] : value;
}

function getQuery(req: VercelRequestLike) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const queryFromUrl = Object.fromEntries(url.searchParams.entries());
  return { ...queryFromUrl, ...(req.query ?? {}) };
}

export default function handler(req: VercelRequestLike, res: VercelResponseLike) {
  const query = getQuery(req);

  console.log('WhatsApp webhook request', {
    method: req.method,
    query,
    body: req.body ?? null
  });

  if (req.method === 'GET') {
    const mode = first(query['hub.mode']);
    const verifyToken = first(query['hub.verify_token']);
    const challenge = first(query['hub.challenge']);

    if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN && typeof challenge === 'string') {
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    return res.status(200).json({ received: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
