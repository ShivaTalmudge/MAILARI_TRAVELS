// Provider-agnostic location layer. Today this talks to OpenStreetMap's
// public Nominatim (geocoding) and OSRM (routing) services, but every call
// site in the app goes through the functions below rather than hitting
// those hosts directly — swapping in Google Maps/Mapbox/a paid provider
// later only means changing this file. Also keeps the actual third-party
// requests server-side (never issued from the browser), per the
// "no uncontrolled client-side Nominatim calls in production" requirement.
export interface GeoResult {
  displayName: string;
  lat: number;
  lon: number;
}

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const USER_AGENT = 'MailariTravelsCRM/1.0 (booking-engine)';

// Small TTL cache — typeahead search naturally repeats the same partial
// queries within a few seconds, and this is a considerate way to stay
// within Nominatim's public usage policy now that every user's requests
// funnel through this one server process.
const CACHE_TTL_MS = 60_000;
const searchCache = new Map<string, { at: number; data: GeoResult[] }>();
const reverseCache = new Map<string, { at: number; data: string }>();

function getCached<T>(cache: Map<string, { at: number; data: T }>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

export async function searchLocations(query: string): Promise<GeoResult[]> {
  const key = query.trim().toLowerCase();
  const cached = getCached(searchCache, key);
  if (cached) return cached;

  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Location search upstream error: ${res.status}`);

  const data = (await res.json()) as any[];
  const results: GeoResult[] = data.map((d) => ({
    displayName: String(d.display_name),
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
  }));

  searchCache.set(key, { at: Date.now(), data: results });
  return results;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const cached = getCached(reverseCache, key);
  if (cached) return cached;

  const url = `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Reverse geocoding upstream error: ${res.status}`);

  const data = (await res.json()) as any;
  const displayName = data?.display_name ? String(data.display_name) : 'Unknown location';

  reverseCache.set(key, { at: Date.now(), data: displayName });
  return displayName;
}

export async function calculateRoute(
  pickup: { lat: number; lon: number },
  drop: { lat: number; lon: number }
): Promise<RouteResult> {
  const url = `${OSRM_BASE}/route/v1/driving/${pickup.lon},${pickup.lat};${drop.lon},${drop.lat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing upstream error: ${res.status}`);

  const data = (await res.json()) as any;
  const route = data?.routes?.[0];
  if (!route) throw new Error('No route found between the given locations.');

  return {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.round(route.duration / 60),
  };
}
