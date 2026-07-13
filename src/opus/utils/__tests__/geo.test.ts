import { describe, test, expect, vi, beforeEach } from 'vitest';
import { isValidUKPostcode, getPostcodeCoordinates, fetchPostcodeCoordinates, calculateDistance } from '../geo';

describe('isValidUKPostcode', () => {
  test('validates standard UK postcodes correctly', () => {
    expect(isValidUKPostcode('SW1A 1AA')).toBe(true);
    expect(isValidUKPostcode('M1 1AE')).toBe(true);
    expect(isValidUKPostcode('CM14 4BA')).toBe(true);
    expect(isValidUKPostcode('B1 1BB')).toBe(true);
    expect(isValidUKPostcode('EH1 1YZ')).toBe(true);
    expect(isValidUKPostcode('cr0 2yr')).toBe(true); // lower case and spaces
    expect(isValidUKPostcode('DN551PT')).toBe(true); // no spaces
  });

  test('invalidates incorrect postcode formats', () => {
    expect(isValidUKPostcode('12345')).toBe(false);
    expect(isValidUKPostcode('ABC XYZ')).toBe(false);
    expect(isValidUKPostcode('')).toBe(false);
    expect(isValidUKPostcode('SW1A')).toBe(false);
  });
});

describe('getPostcodeCoordinates', () => {
  test('returns specific coordinates for hardcoded demo postcodes', () => {
    const london = getPostcodeCoordinates('SW1A 1AA');
    expect(london.lat).toBe(51.5012);
    expect(london.lng).toBe(-0.1419);

    const manchester = getPostcodeCoordinates('M1 1AE');
    expect(manchester.lat).toBe(53.4808);
    expect(manchester.lng).toBe(-2.2350);
  });

  test('generates consistent fallback coordinates for other postcodes', () => {
    const coords1 = getPostcodeCoordinates('AB12 3CD');
    const coords2 = getPostcodeCoordinates('AB12 3CD');
    const coords3 = getPostcodeCoordinates('XY99 9ZZ');

    expect(coords1).toEqual(coords2);
    expect(coords1.lat).toBeGreaterThan(52.0);
    expect(coords1.lat).toBeLessThan(54.5);
    expect(coords1).not.toEqual(coords3);
  });
});

describe('calculateDistance', () => {
  test('calculates correct distance in miles between coordinates', () => {
    const london = { lat: 51.5012, lng: -0.1419 };
    const manchester = { lat: 53.4808, lng: -2.2350 };
    
    const distance = calculateDistance(london, manchester);
    // London to Manchester is roughly 163 miles
    expect(distance).toBeGreaterThan(150);
    expect(distance).toBeLessThan(180);
  });
});

describe('fetchPostcodeCoordinates', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('uses cached coordinates on subsequent calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    
    // Mock success response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 200,
        result: { latitude: 54.1, longitude: -1.9 }
      })
    } as Response);

    const coords1 = await fetchPostcodeCoordinates('TEST 1AA');
    expect(coords1).toEqual({ lat: 54.1, lng: -1.9 });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Call again, should hits cache
    const coords2 = await fetchPostcodeCoordinates('TEST 1AA');
    expect(coords2).toEqual({ lat: 54.1, lng: -1.9 });
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1
  });

  test('falls back to local coordinates on fetch error', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'));

    const coords = await fetchPostcodeCoordinates('FALLBACK 1AA');
    expect(coords).toBeDefined();
    expect(coords.lat).toBeDefined();
    expect(coords.lng).toBeDefined();
  });
});
