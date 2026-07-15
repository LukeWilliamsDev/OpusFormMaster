// Geocoding and distance calculation utilities

export interface Coords {
  lat: number;
  lng: number;
}

// In-memory cache for postcode coordinates to prevent duplicate network requests
const postcodeCache: Record<string, Coords> = {};

/**
 * Validates if the given string matches the UK postcode regex.
 */
export const isValidUKPostcode = (postcode: string): boolean => {
  const clean = postcode.trim().toUpperCase().replace(/\s+/g, "");
  // Standard UK Postcode regex (matches outbound + inbound codes)
  const regex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
  return regex.test(clean);
};

/**
 * Mocks geocoding for UK postcodes using fixed coordinates for demo postcodes
 * and a consistent hash-based generator for any other postcodes.
 */
export const getPostcodeCoordinates = (postcode: string): Coords => {
  const code = postcode.trim().toUpperCase().replace(/\s+/g, "");

  // Hardcoded coordinates for demo postcodes
  if (code.startsWith("SW1A")) return { lat: 51.5012, lng: -0.1419 }; // London Westminster / Riverside
  if (code.startsWith("M1")) return { lat: 53.4808, lng: -2.235 }; // Manchester
  if (code.startsWith("CM14")) return { lat: 51.6216, lng: 0.3017 }; // Brentwood Hub
  if (code.startsWith("B1")) return { lat: 52.4797, lng: -1.9027 }; // Birmingham Central
  if (code.startsWith("EH1")) return { lat: 55.9533, lng: -3.1883 }; // Edinburgh Marina

  // Consistent hash generation for other postcodes
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Distribute within a reasonable bounds around Central England (near Derby/Birmingham)
  const lat = 52.5 + (Math.abs(hash % 100) / 100) * 1.5;
  const lng = -1.5 - (Math.abs((hash >> 2) % 100) / 100) * 1.5;
  return { lat, lng };
};

/**
 * Asynchronously fetches actual coordinates for a UK postcode using the free postcodes.io API.
 * Falls back to the local hash-based coordinates if the API is offline, returns 404, or fails.
 */
export const fetchPostcodeCoordinates = async (postcode: string): Promise<Coords> => {
  const code = postcode.trim().toUpperCase().replace(/\s+/g, "");

  if (!code) {
    return { lat: 52.5, lng: -1.5 };
  }

  // Check cache first
  if (postcodeCache[code]) {
    return postcodeCache[code];
  }

  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(code)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.status === 200 && data.result) {
        const coords = {
          lat: data.result.latitude,
          lng: data.result.longitude,
        };
        postcodeCache[code] = coords;
        return coords;
      }
    }
  } catch (error) {
    console.warn(
      `Postcode geocoding API failed for ${code}, falling back to local generator.`,
      error,
    );
  }

  // Fallback to the local generator
  const fallbackCoords = getPostcodeCoordinates(code);
  postcodeCache[code] = fallbackCoords;
  return fallbackCoords;
};

/**
 * Calculates the Haversine distance in miles between two coordinates.
 */
export const calculateDistance = (coords1: Coords, coords2: Coords): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = ((coords2.lat - coords1.lat) * Math.PI) / 180;
  const dLng = ((coords2.lng - coords1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coords1.lat * Math.PI) / 180) *
      Math.cos((coords2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
