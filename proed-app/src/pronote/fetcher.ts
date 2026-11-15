import { CapacitorHttp } from '@capacitor/core';
import { createSessionHandle } from 'pawnote';
import { isNative, serverUrl } from '../lib/platform';

export type Fetcher = NonNullable<Parameters<typeof createSessionHandle>[0]>;
type FetcherRequest = Parameters<Fetcher>[0];

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: req.url.href,
        method: req.method ?? 'GET',
        headers: plainHeaders(req.headers),
        body: req.content,
        redirect: req.redirect ?? 'follow',
      }),
    });
  } catch {
    throw new NetworkError('offline');
  }
  if (res.status === 429) throw new NetworkError('rate_limited');
  if (res.status === 403) throw new NetworkError('blocked');
  if (!res.ok) throw new NetworkError('relay');
  const data = (await res.json()) as { status: number; headers: Record<string, string>; body: string };
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
    });
    const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    return { status: res.status, content, headers: res.headers };
  } catch {
    throw new NetworkError('offline');
  }
};

export function getFetcher(): Fetcher {
  return isNative() ? nativeFetcher : relayFetcher;
}
