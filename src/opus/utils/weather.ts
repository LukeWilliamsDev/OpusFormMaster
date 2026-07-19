// @ts-nocheck
import { useEffect, useState } from "react";
import { WeatherRisk } from "../types/erp";
import { parseLocalISODate, toLocalISODate } from "./week";

export interface WeatherInfo extends WeatherRisk {
  temperature: number;
  advice: string;
  isImpactful: boolean; // True if it's High or Medium risk that affects the pour
}

const FORECAST_WINDOW_DAYS = 14;
const FORECAST_AHEAD_DAYS = 16;

// ---- Geocoding (Nominatim/OSM — free, keyless, resolves UK postcodes) -----
const geoCache = new Map<string, Promise<{ lat: number; lon: number } | null>>();

export function geocodePostcode(postcode: string): Promise<{ lat: number; lon: number } | null> {
  const key = postcode.trim().toUpperCase();
  if (!key) return Promise.resolve(null);
  if (!geoCache.has(key)) {
    geoCache.set(
      key,
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(key)}&countrycodes=gb&limit=1`,
        { headers: { "User-Agent": "OpusForm/1.0 (admin@opusform.co.uk)" } },
      )
        .then((res) => res.json())
        .then((data) =>
          data?.[0] ? { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) } : null,
        )
        .catch(() => null),
    );
  }
  return geoCache.get(key)!;
}

// ---- Forecast (Open-Meteo — free, keyless, 14 days past + 16 days ahead) --
// WMO weather codes: https://open-meteo.com/en/docs
const FROST_CODES = new Set([71, 73, 75, 77, 85, 86]); // snow
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const HEAVY_RAIN_CODES = new Set([65, 67, 82, 95, 96, 99]);
const WIND_RISK_KMH = 30;

export function classifyDay(weathercode: number, tempMin: number, tempMax: number, windMax: number): WeatherInfo {
  if (tempMin <= 2 || FROST_CODES.has(weathercode)) {
    return {
      postcode: "",
      condition: "Frost",
      riskLevel: "High",
      temperature: Math.round(tempMin),
      isImpactful: true,
      advice:
        "Critical hydration arrest risk. Freezing halts curing and degrades structural strength. Apply insulated curing blankets; do not pour if ambient temperature drops below 5°C.",
    };
  }

  if (RAIN_CODES.has(weathercode)) {
    const heavy = HEAVY_RAIN_CODES.has(weathercode);
    return {
      postcode: "",
      condition: "Rain",
      riskLevel: heavy ? "High" : "Medium",
      temperature: Math.round(tempMax),
      isImpactful: true,
      advice: heavy
        ? "Heavy showers forecast. High risk of cement-paste dilution on fresh slab. Recommend delaying the pour if drainage or cover cannot be guaranteed."
        : "Surface wash-out risk. Ensure polythene sheeting and protective tarps are on standby to cover fresh bays immediately upon sudden rain.",
    };
  }

  if (windMax >= WIND_RISK_KMH) {
    return {
      postcode: "",
      condition: "Wind",
      riskLevel: "Medium",
      temperature: Math.round(tempMax),
      isImpactful: true,
      advice:
        "Plastic shrinkage risk. Strong dry gusts accelerate moisture loss, inducing micro-cracks. Apply spray-on curing membranes or wet burlap immediately after finishing.",
    };
  }

  return {
    postcode: "",
    condition: "Clear",
    riskLevel: "Low",
    temperature: Math.round(tempMax),
    isImpactful: false,
    advice:
      "Optimal curing parameters. Ideal ambient temperature. Maintain standard hydration checks and keep the surface moist for optimal strength development.",
  };
}

const forecastCache = new Map<string, Promise<Map<string, WeatherInfo> | null>>();

function fetchForecastForPostcode(postcode: string): Promise<Map<string, WeatherInfo> | null> {
  const key = postcode.trim().toUpperCase();
  if (!key) return Promise.resolve(null);
  if (!forecastCache.has(key)) {
    forecastCache.set(
      key,
      (async () => {
        const coords = await geocodePostcode(key);
        if (!coords) return null;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,windspeed_10m_max&past_days=${FORECAST_WINDOW_DAYS}&forecast_days=${FORECAST_AHEAD_DAYS}&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.daily?.time) return null;

        const map = new Map<string, WeatherInfo>();
        data.daily.time.forEach((date: string, i: number) => {
          map.set(
            date,
            classifyDay(
              data.daily.weathercode[i],
              data.daily.temperature_2m_min[i],
              data.daily.temperature_2m_max[i],
              data.daily.windspeed_10m_max[i],
            ),
          );
        });
        return map;
      })().catch(() => null),
    );
  }
  return forecastCache.get(key)!;
}

/** Fetches (and caches per postcode) the live 14-day-past/16-day-ahead forecast for a job's site. */
export function useJobForecast(postcode: string | undefined): {
  loading: boolean;
  forecast: Map<string, WeatherInfo> | null;
} {
  const [state, setState] = useState<{ loading: boolean; forecast: Map<string, WeatherInfo> | null }>(
    { loading: Boolean(postcode), forecast: null },
  );

  useEffect(() => {
    if (!postcode) {
      setState({ loading: false, forecast: null });
      return;
    }
    let cancelled = false;
    setState({ loading: true, forecast: null });
    fetchForecastForPostcode(postcode).then((forecast) => {
      if (!cancelled) setState({ loading: false, forecast });
    });
    return () => {
      cancelled = true;
    };
  }, [postcode]);

  return state;
}

/**
 * Looks up the forecast for a specific calendar day. Returns null once that
 * date falls outside the fetched window (more than 14 days in the past, or
 * more than 16 days ahead) — nothing meaningful to show there.
 */
export function getWeatherOnDate(
  forecast: Map<string, WeatherInfo> | null,
  date: string,
): WeatherInfo | null {
  if (!forecast) return null;
  const daysFromToday = Math.floor(
    (parseLocalISODate(toLocalISODate(new Date())).getTime() - parseLocalISODate(date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (daysFromToday > FORECAST_WINDOW_DAYS || daysFromToday < -FORECAST_AHEAD_DAYS) return null;
  return forecast.get(date) ?? null;
}
