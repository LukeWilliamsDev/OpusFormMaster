// @ts-nocheck
import { Job, WeatherRisk } from "../types/erp";

export interface WeatherInfo extends WeatherRisk {
  temperature: number;
  advice: string;
  isImpactful: boolean; // True if it's High or Medium risk that affects the pour
}

export function getWeatherForJob(job: Job): WeatherInfo {
  // Generate stable weather based on postcode character
  const postcode = job.postcode.trim().toUpperCase();
  const postCodeChar = postcode[0] || "L";
  const charCode = postCodeChar.charCodeAt(0);

  // Use a reproducible hash/index to provide interesting variation
  const index = (charCode + postcode.length) % 5;

  switch (index) {
    case 0:
      return {
        postcode,
        condition: "Rain",
        riskLevel: "Medium",
        temperature: 13,
        isImpactful: true,
        advice:
          "Surface wash-out risk. Ensure polythene sheeting and protective tarps are on standby to cover fresh bays immediately upon sudden rain.",
      };
    case 1:
      return {
        postcode,
        condition: "Frost",
        riskLevel: "High",
        temperature: 1,
        isImpactful: true,
        advice:
          "Critical hydration arrest risk. Freezing halts curing and degrades structural strength. Apply insulated curing blankets; do not pour if ambient temperature drops below 5°C.",
      };
    case 2:
      return {
        postcode,
        condition: "Wind",
        riskLevel: "Medium",
        temperature: 15,
        isImpactful: true,
        advice:
          "Plastic shrinkage risk. Strong dry gusts accelerate moisture loss, inducing micro-cracks. Apply spray-on curing membranes or wet burlap immediately after finishing.",
      };
    case 3:
      return {
        postcode,
        condition: "Rain",
        riskLevel: "Medium",
        temperature: 11,
        isImpactful: true,
        advice:
          "Heavy showers forecast. High risk of cement-paste dilution on fresh slab. Recommend delaying the pour if drainage or cover cannot be guaranteed.",
      };
    case 4:
    default:
      return {
        postcode,
        condition: "Clear",
        riskLevel: "Low",
        temperature: 20,
        isImpactful: false,
        advice:
          "Optimal curing parameters. Ideal ambient temperature. Maintain standard hydration checks and keep the surface moist for optimal strength development.",
      };
  }
}
