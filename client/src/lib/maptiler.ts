export type MapLocationInput = {
  address?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  neighborhood?: string | null;
};

export const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() ?? "";
export const MAP_TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL?.trim() ||
  (MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${encodeURIComponent(MAPTILER_KEY)}`
    : "");
export const MAP_TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() ||
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors</a>';

export function isSuspiciousCoordinatePair(latitude: number, longitude: number) {
  return Math.abs(latitude) < 1 && Math.abs(longitude) < 1;
}

export function buildMapLocationQuery(input: MapLocationInput) {
  const street = [input.address?.trim(), input.addressNumber?.trim()].filter(Boolean).join(", ");
  const postalCode = input.zipCode?.replace(/\D/g, "") ?? "";
  const formattedPostalCode = postalCode.length === 8 ? `${postalCode.slice(0, 5)}-${postalCode.slice(5)}` : postalCode;
  return [
    street,
    input.addressComplement?.trim(),
    input.neighborhood?.trim(),
    input.city?.trim(),
    input.state?.trim(),
    formattedPostalCode,
    "Brasil",
  ].filter(Boolean).join(", ");
}

export async function geocodeMapLocation(query: string) {
  if (!MAPTILER_KEY || !query.trim()) return null;
  const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query.trim())}.json?language=pt&limit=1&key=${encodeURIComponent(MAPTILER_KEY)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`MapTiler geocoding failed: ${response.status}`);
  const payload = await response.json() as { features?: Array<{ center?: [number, number] }> };
  const center = payload.features?.[0]?.center;
  if (!center || center.length < 2) return null;
  const longitude = Number(center[0]);
  const latitude = Number(center[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || isSuspiciousCoordinatePair(latitude, longitude)) return null;
  return { latitude, longitude };
}
