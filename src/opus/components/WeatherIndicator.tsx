import React from "react";

interface WeatherProps {
  weather: {
    condition: string;
    temperature: number;
    riskLevel: string;
  };
}

export const WeatherIndicator: React.FC<WeatherProps> = ({ weather }) => {
  return (
    <div className="flex items-center justify-between bg-card px-1.5 py-1 rounded border border-border">
      <span className="text-[9px] font-medium text-muted-foreground">
        {weather.condition} &bull; {weather.temperature}°C
      </span>
      <span
        className={`text-[8px] px-1 py-0.5 rounded font-medium ${
          weather.riskLevel === "High"
            ? "bg-red-500/10 text-red-400"
            : weather.riskLevel === "Medium"
              ? "bg-amber-500/10 text-amber-400"
              : "bg-emerald-500/10 text-emerald-400"
        }`}
      >
        {weather.riskLevel} Risk
      </span>
    </div>
  );
};
