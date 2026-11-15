import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({ CapacitorHttp: {}, Capacitor: { isNativePlatform: () => false } }));
const { fixPronoteContent } = await import('./fetcher');

const page = (start: string) => `<script>window.addEventListener("load", () => {${start} (e) {IE.sendLogFailStart (1, e)}});</script>`;

describe('fixPronoteContent', () => {
  const url = new URL('https://0690032K.index-education.net/pronote/mobile.eleve.html?fd=1');

  it('removes the semicolon Pronote 2026 adds after Start(...)', () => {
    const fixed = fixPronoteContent(url, page('try{Start ({"h":2941950,"a":6});} catch'));
    expect(fixed).toContain('Start ({"h":2941950,"a":6})} catch');
    // What pawnote does with the page:
    const e = fixed.replace(/ /g, '');
    const json = e.substring(e.indexOf('Start(') + 6, e.indexOf(')}catch'));
    expect(JSON.parse(json)).toEqual({ h: 2941950, a: 6 });
  });

  it('leaves the old format and other responses untouched', () => {
    const old = page('try{Start ({"h":1,"a":6})} catch');
    expect(fixPronoteContent(url, old)).toBe(old);
    const api = new URL('https://x.index-education.net/pronote/appelfonction/6/1/abc');
    expect(fixPronoteContent(api, '{"a":"Start ({});}"}')).toBe('{"a":"Start ({});}"}');
  });
});
