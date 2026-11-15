import {
  AccessDeniedError,
  AccountDisabledError,
  AuthenticateError,
  BadCredentialsError,
  BusyPageError,
  PageUnavailableError,
  RateLimitedError,
  SessionExpiredError,
  SuspendedIPError,
  UnreachableError,
} from 'pawnote';
import type { TKey } from '../lib/i18n';
import { NetworkError, lastPronoteExchange } from './fetcher';

/** An error with a translated message key. */
export class AppError extends Error {
  constructor(
    public readonly key: TKey,
    /** Technical detail shown in small print, to help fix problems. */
    public readonly detail = '',
  ) {
    super(key);
  }
}

export function toAppError(e: unknown, context: 'credentials' | 'qr' | 'data' = 'data'): AppError {
  if (e instanceof AppError) return e;
  const mapped = mapError(e, context);
  const reason = e instanceof Error ? e.message || e.name : String(e);
  return new AppError(mapped.key, [reason.slice(0, 120), lastPronoteExchange()].filter(Boolean).join(' · '));
}

function mapError(e: unknown, context: 'credentials' | 'qr' | 'data'): AppError {
  if (e instanceof NetworkError) {
    if (e.code === 'rate_limited') return new AppError('error.suspended');
    if (e.code === 'blocked') return new AppError('error.unreachable');
    return new AppError('error.network');
  }
  if (e instanceof BadCredentialsError || e instanceof AccessDeniedError || e instanceof AccountDisabledError) {
    return new AppError(context === 'qr' ? 'error.badQr' : 'error.badCredentials');
  }
  if (e instanceof AuthenticateError) return new AppError(context === 'qr' ? 'error.badQr' : 'error.badCredentials');
  if (e instanceof SuspendedIPError || e instanceof RateLimitedError) return new AppError('error.suspended');
  if (e instanceof SessionExpiredError) return new AppError('error.sessionExpired');
  if (e instanceof UnreachableError || e instanceof PageUnavailableError || e instanceof BusyPageError) {
    return new AppError('error.unreachable');
  }
  if (e instanceof TypeError && /fetch|network/i.test(e.message)) return new AppError('error.network');
  return new AppError('error.generic');
}
