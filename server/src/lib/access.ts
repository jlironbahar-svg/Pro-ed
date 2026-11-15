import type { AccessClaims, Channel, DenyReason, FeatureFlag, SystemSettings } from '@proed/shared/core';
import { resolveFlags } from '@proed/shared/core';

export interface CheckUser {
  id: string;
  channel: Channel;
  blocked: boolean;
  usernameHash: string | null;
}

export interface CheckDecision {
  allowed: boolean;
  reason?: DenyReason;
  /** True when this check should bind the username hash to the invite code. */
  bind: boolean;
}

/**
 * Who may use the app. The system state does not change "allowed": the app reads
 * the state from the token (RECOVERY, SHUTDOWN) and adapts.
 */
export function decideCheck(user: CheckUser | undefined, usernameHash: string | undefined): CheckDecision {
  if (!user) return { allowed: false, reason: 'unknown_code', bind: false };
  if (user.blocked) return { allowed: false, reason: 'blocked', bind: false };
  if (usernameHash && user.usernameHash && user.usernameHash !== usernameHash) {
    return { allowed: false, reason: 'code_in_use', bind: false };
  }
  return { allowed: true, bind: !!usernameHash && !user.usernameHash };
}

export function buildClaims(
  decision: CheckDecision,
  user: CheckUser | undefined,
  system: SystemSettings,
  flags: FeatureFlag[],
  rev: number,
): AccessClaims {
  const channel: Channel = user?.channel ?? 'normal';
  return {
    allowed: decision.allowed,
    ...(decision.reason ? { reason: decision.reason } : {}),
    channel,
    state: system.state,
    message: system.message,
    flags: decision.allowed ? resolveFlags(flags, channel) : {},
    minVersion: system.minVersion,
    latestApk: system.latestApk ? { version: system.latestApk.version, url: system.latestApk.url } : null,
    rev,
    ...(user && decision.allowed ? { sub: user.id } : {}),
  };
}
