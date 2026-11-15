/** Compares dotted numeric versions ("1.2.10" > "1.2.9"). Returns -1, 0 or 1. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function isVersionBelow(version: string, target: string | null | undefined): boolean {
  if (!target) return false;
  return compareVersions(version, target) < 0;
}

export function isValidVersion(v: string): boolean {
  return /^\d+(\.\d+){0,3}$/.test(v.trim());
}

function parseVersion(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, '')
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .map((n) => (Number.isFinite(n) ? n : 0));
}
