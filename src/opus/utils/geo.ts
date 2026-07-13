// Geocoding and distance calculation utilities

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Mocks geocoding for UK postcodes using fixed coordinates for demo postcodes 
 * and a consistent hash-based generator for any other postcodes.
 */
export const getPostcodeCoordinates = (postcode: string): Coords => {
  const code = postcode.trim().toUpperCase().replace(/\s+/g, '');
  
  // Hardcoded coordinates for demo postcodes
  if (code.startsWith('SW1A')) return { lat: 51.5012, lng: -0.1419 }; // London Westminster / Riverside
  if (code.startsWith('M1')) return { lat: 53.4808, lng: -2.2350 };   // Manchester
  if (code.startsWith('CM14')) return { lat: 51.6216, lng: 0.3017 }; // Brentwood Hub
  if (code.startsWith('B1')) return { lat: 52.4797, lng: -1.9027 };   // Birmingham Central
  if (code.startsWith('EH1')) return { lat: 55.9533, lng: -3.1883 };  // Edinburgh Marina
  
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
