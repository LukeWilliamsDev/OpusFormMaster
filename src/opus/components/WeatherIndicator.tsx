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
            ? "bg-status-error/10 text-status-error"
            : weather.riskLevel === "Medium"
              ? "bg-status-warning/10 text-status-warning"
              : "bg-status-success/10 text-status-success"
        }`}
      >
        {weather.riskLevel} Risk
      </span>
    </div>
  );
};
