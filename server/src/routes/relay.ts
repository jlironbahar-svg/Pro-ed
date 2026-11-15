import type { FastifyInstance } from 'fastify';
import { isIP } from 'node:net';

/*
  Pronote relay for the PWA. Browsers can't call Pronote directly (CORS, forbidden
  headers), so the app sends a JSON envelope and we forward it.
  Privacy: request and response bodies are never stored or logged. Nothing here
  writes to the database. Only HTTPS targets on Pronote hosts are allowed.
*/

interface RelayBody {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  redirect?: 'follow' | 'manual';
}

const FORWARD_HEADERS = new Set(['content-type', 'cookie', 'user-agent', 'accept', 'accept-language']);
const RETURN_HEADERS = ['content-type', 'location'];
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 20_000;

export function isAllowedTarget(raw: string, extraHosts: string[]): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (url.port && url.port !== '443') return null;
  const host = url.hostname.toLowerCase();
  if (isIP(host) || host === 'localhost') return null;
  const ok = host.endsWith('.index-education.net') || host === 'www.index-education.com' || extraHosts.includes(host);
  return ok ? url : null;
}

export async function relayRoutes(app: FastifyInstance, opts: { extraHosts: string[] }): Promise<void> {
  app.post<{ Body: RelayBody }>(
    '/relay',
    {
      bodyLimit: 1024 * 1024,
      logLevel: 'warn',
      config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['url'],
          additionalProperties: false,
          properties: {
            url: { type: 'string', maxLength: 4096 },
            method: { type: 'string', enum: ['GET', 'POST'] },
            headers: { type: 'object', additionalProperties: { type: 'string', maxLength: 8192 } },
            body: { type: 'string' },
            redirect: { type: 'string', enum: ['follow', 'manual'] },
          },
        },
      },
    },
    async (req, reply) => {
      reply.header('cache-control', 'no-store');
      const target = isAllowedTarget(req.body.url, opts.extraHosts);
      if (!target) return reply.code(403).send({ error: 'target_not_allowed' });

      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(req.body.headers ?? {})) {
        if (FORWARD_HEADERS.has(k.toLowerCase())) headers[k.toLowerCase()] = v;
      }
      const method = req.body.method ?? 'GET';

      let upstream: Response;
      try {
        upstream = await fetch(target, {
          method,
          headers,
          body: method === 'POST' ? (req.body.body ?? '') : undefined,
          redirect: req.body.redirect === 'manual' ? 'manual' : 'follow',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        return reply.code(502).send({ error: 'unreachable' });
      }

      const length = Number(upstream.headers.get('content-length') ?? 0);
      if (length > MAX_RESPONSE_BYTES) return reply.code(502).send({ error: 'too_large' });
      const body = await upstream.text();
      if (body.length > MAX_RESPONSE_BYTES) return reply.code(502).send({ error: 'too_large' });

      const outHeaders: Record<string, string> = {};
      for (const name of RETURN_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) outHeaders[name] = value;
      }
      return { status: upstream.status, headers: outHeaders, body };
    },
  );
}
