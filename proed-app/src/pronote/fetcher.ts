import { CapacitorHttp } from '@capacitor/core';
import { createSessionHandle } from '@blockshub/pawnote-lts';
import { isNative, serverUrl } from '../lib/platform';

export type Fetcher = NonNullable<Parameters<typeof createSessionHandle>[0]>;
type FetcherRequest = Parameters<Fetcher>[0];

let lastExchange = '';

/** Last Pronote request, for the technical detail shown under login errors. No bodies, no query strings. */
export function lastPronoteExchange(): string {
  return lastExchange;
}

function remember(req: FetcherRequest, status: number | string, size?: number): void {
  const path = req.url.pathname.split('/').slice(-2).join('/');
  lastExchange = `${req.method ?? 'GET'} ${req.url.hostname}/…/${path} -> ${status}${size !== undefined ? ` (${size} o)` : ''}`;
}

/** Thrown when the network or the relay fails (not a Pronote error). */
export class NetworkError extends Error {
  constructor(public readonly code: 'offline' | 'relay' | 'blocked' | 'rate_limited') {
    super(code);
  }
}

function plainHeaders(h: FetcherRequest['headers']): Record<string, string> {
  const out: Record<string, string> = {};
  if (!h) return out;
  if (typeof Headers !== 'undefined' && h instanceof Headers) h.forEach((v, k) => (out[k] = v));
  else Object.assign(out, h);
  return out;
}

/**
 * Web/PWA: browsers block cross-origin calls to Pronote (CORS) and forbid headers
 * like Cookie, so requests go through the ProEd server relay as a JSON envelope.
 */
const relayFetcher: Fetcher = async (req) => {
  let res: Response;
  try {
    res = await fetch(serverUrl('/relay'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify({
        url: req.url.href,
        method: req.method ?? 'GET',
        headers: plainHeaders(req.headers),
        body: req.content,
        redirect: req.redirect ?? 'follow',
      }),
    });
  } catch {
    remember(req, 'relay unreachable');
    throw new NetworkError('offline');
  }
  if (!res.ok) remember(req, `relay ${res.status}`);
  if (res.status === 429) throw new NetworkError('rate_limited');
  if (res.status === 403) throw new NetworkError('blocked');
  if (!res.ok) throw new NetworkError('relay');
  const data = (await res.json()) as { status: number; headers: Record<string, string>; body: string };
  remember(req, data.status, data.body.length);
  return { status: data.status, content: data.body, headers: data.headers };
};

/** Android APK: native HTTP through CapacitorHttp, no CORS, no relay. */
const nativeFetcher: Fetcher = async (req) => {
  try {
    const res = await CapacitorHttp.request({
      url: req.url.href,
      method: req.method ?? 'GET',
      headers: plainHeaders(req.headers),
      data: req.content,
      responseType: 'text',
      disableRedirects: req.redirect === 'manual',
      connectTimeout: 15_000,
      readTimeout: 30_000,
    }).catch((e: unknown) => {
      remember(req, `native error: ${e instanceof Error ? e.message.slice(0, 80) : 'unknown'}`);
      throw e;
    });
    const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    remember(req, res.status, content.length);
    return { status: res.status, content, headers: res.headers };
  } catch {
    throw new NetworkError('offline');
  }
};

export function getFetcher(): Fetcher {
  return isNative() ? nativeFetcher : relayFetcher;
}
