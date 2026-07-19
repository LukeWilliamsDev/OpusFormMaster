import { describe, test, expect } from "vitest";
import { classifyDay } from "../weather";

describe("classifyDay", () => {
  test("frost takes priority at exactly 2°C", () => {
    expect(classifyDay(0, 2, 8, 5).condition).toBe("Frost");
  });

  test("no frost just above threshold", () => {
    expect(classifyDay(0, 2.1, 8, 5).condition).not.toBe("Frost");
  });

  test("snow code forces frost even with warm temps", () => {
    expect(classifyDay(71, 10, 15, 5).condition).toBe("Frost");
  });

  test("heavy rain code is High risk", () => {
    const result = classifyDay(65, 10, 15, 5);
    expect(result.condition).toBe("Rain");
    expect(result.riskLevel).toBe("High");
  });

  test("light rain code is Medium risk", () => {
    const result = classifyDay(51, 10, 15, 5);
    expect(result.condition).toBe("Rain");
    expect(result.riskLevel).toBe("Medium");
  });

  test("wind risk triggers at exactly 30km/h with no rain/frost", () => {
    const result = classifyDay(0, 10, 15, 30);
    expect(result.condition).toBe("Wind");
    expect(result.riskLevel).toBe("Medium");
  });

  test("no wind risk just below threshold", () => {
    expect(classifyDay(0, 10, 15, 29.9).condition).toBe("Clear");
  });

  test("clear when no risk factors present", () => {
    const result = classifyDay(0, 10, 15, 5);
    expect(result.condition).toBe("Clear");
    expect(result.riskLevel).toBe("Low");
    expect(result.isImpactful).toBe(false);
  });

  test("rain takes priority over wind when both present", () => {
    expect(classifyDay(51, 10, 15, 40).condition).toBe("Rain");
  });
});
