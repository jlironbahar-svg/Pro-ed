import { geolocation } from 'pawnote';
import { getFetcher } from './fetcher';

export interface School {
  name: string;
  url: string;
  postalCode: string;
  distanceKm: number;
}

/** Finds the coordinates of a French city or postcode (Géoplateforme, CORS enabled, no key). */
async function geocode(query: string): Promise<{ latitude: number; longitude: number } | null> {
  const url = `https://data.geopf.fr/geocodage/search?index=address&type=municipality&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { geometry: { coordinates: [number, number] } }[] };
  const point = data.features?.[0]?.geometry.coordinates;
  return point ? { longitude: point[0], latitude: point[1] } : null;
}

async function schoolsAround(position: { latitude: number; longitude: number }): Promise<School[]> {
  const list = await geolocation(position, getFetcher());
  return list
    .map((s) => ({
      name: titleCase(s.name),
      url: s.url,
      postalCode: String(s.postalCode).padStart(5, '0'),
      distanceKm: s.distance / 1000,
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function searchSchools(query: string): Promise<School[]> {
  const position = await geocode(query.trim());
  if (!position) return [];
  return schoolsAround(position);
}

export function searchSchoolsNearMe(): Promise<School[]> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unavailable'));
    navigator.geolocation.getCurrentPosition(
      (pos) => schoolsAround({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }).then(resolve, reject),
      () => reject(new Error('denied')),
      { timeout: 10_000, maximumAge: 600_000 },
    );
  });
}

function titleCase(name: string): string {
  const small = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', "d'", "l'"]);
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .replace(/\b(D|L)'(\w)/g, (_, a: string, b: string) => `${a.toLowerCase()}'${b.toUpperCase()}`);
}

/** Accepts what students usually paste: the login page URL, with or without /eleve.html. */
export function normalizePronoteUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') url.protocol = 'https:';
    let path = url.pathname.replace(/\/(mobile\.)?(eleve|parent|professeur)\.html.*$/i, '').replace(/\/+$/, '');
    if (!/pronote/i.test(path) && /index-education\.net$/i.test(url.hostname)) path = '/pronote';
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}
