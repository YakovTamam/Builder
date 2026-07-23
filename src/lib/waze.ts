// Builds a Waze deep link for navigating to a project location. Prefers precise
// coordinates when available; otherwise falls back to a free-text address search.
// Returns null when there is nothing to navigate to.

export type WazeTarget = {
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Coerce a possibly-blank value from an untrusted body/form to a number.
// Returns undefined for empty input and NaN for anything non-numeric.
function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return typeof value === "number" ? value : Number(value);
}

// Validate an optional lat/lng pair from untrusted input.
// - undefined       → no coordinates supplied (both blank)
// - { lat, lng }    → a valid, in-range pair
// - "invalid"       → partially supplied or out of range
export function parseCoordinates(
  latInput: unknown,
  lngInput: unknown,
): { lat: number; lng: number } | undefined | "invalid" {
  const lat = toNumber(latInput);
  const lng = toNumber(lngInput);

  if (lat === undefined && lng === undefined) return undefined;

  if (
    !isFiniteNumber(lat) ||
    !isFiniteNumber(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return "invalid";
  }

  return { lat, lng };
}

export function wazeUrl(target: WazeTarget): string | null {
  if (isFiniteNumber(target.lat) && isFiniteNumber(target.lng)) {
    return `https://waze.com/ul?ll=${target.lat}%2C${target.lng}&navigate=yes`;
  }

  const address = typeof target.address === "string" ? target.address.trim() : "";
  if (address) {
    return `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
  }

  return null;
}
