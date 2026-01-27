import { assertEquals } from "@std/assert";
import { calculateTDEE, linearRegressionSlope } from "@src/services/tdee.ts";
import type { Entry } from "@src/db/schema.ts";

function makeEntry(
  date: string,
  weight: number,
  calories: number,
  userId = "user-1"
): Entry {
  return {
    id: crypto.randomUUID(),
    userId,
    date,
    weight: weight.toString(),
    calories,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

Deno.test("linearRegressionSlope", async (t) => {
  await t.step("returns 0 for a single point", () => {
    const slope = linearRegressionSlope([{ x: 0, y: 100 }]);
    assertEquals(slope, 0);
  });

  await t.step("returns 0 for flat data", () => {
    const slope = linearRegressionSlope([
      { x: 0, y: 180 },
      { x: 1, y: 180 },
      { x: 2, y: 180 },
    ]);
    assertEquals(slope, 0);
  });

  await t.step("computes positive slope", () => {
    // Perfect line: y = 180 + 0.1x
    const slope = linearRegressionSlope([
      { x: 0, y: 180 },
      { x: 10, y: 181 },
      { x: 20, y: 182 },
    ]);
    assertEquals(Math.abs(slope - 0.1) < 0.001, true);
  });

  await t.step("computes negative slope", () => {
    const slope = linearRegressionSlope([
      { x: 0, y: 185 },
      { x: 7, y: 184 },
      { x: 14, y: 183 },
    ]);
    const expected = -1 / 7;
    assertEquals(Math.abs(slope - expected) < 0.001, true);
  });
});

Deno.test("calculateTDEE", async (t) => {
  await t.step("returns null with fewer than 3 entries", () => {
    const entries = [
      makeEntry("2024-06-01", 185, 2100),
      makeEntry("2024-06-02", 185, 2100),
    ];
    assertEquals(calculateTDEE(entries), null);
  });

  await t.step("returns null with empty entries", () => {
    assertEquals(calculateTDEE([]), null);
  });

  await t.step("calculates TDEE for stable weight (maintaining)", () => {
    // Weight is constant at 185 lbs, eating 2200 cal/day
    // slope = 0, so TDEE = avgCalories - 0 = 2200
    const entries = [
      makeEntry("2024-06-01", 185, 2200),
      makeEntry("2024-06-02", 185, 2200),
      makeEntry("2024-06-03", 185, 2200),
      makeEntry("2024-06-04", 185, 2200),
      makeEntry("2024-06-05", 185, 2200),
      makeEntry("2024-06-06", 185, 2200),
      makeEntry("2024-06-07", 185, 2200),
    ];

    const result = calculateTDEE(entries);
    assertEquals(result !== null, true);
    assertEquals(result!.currentTDEE, 2200);
    assertEquals(result!.weightTrend, "maintaining");
    assertEquals(result!.dataPoints, 7);
    assertEquals(result!.weeklyAverageWeight, 185);
    assertEquals(result!.weeklyAverageCalories, 2200);
  });

  await t.step("calculates TDEE when gaining weight", () => {
    // Gaining 1 lb over 7 days = ~0.143 lbs/day
    // Eating 2700 cal/day
    // TDEE = 2700 - (0.143 * 3500) = 2700 - 500 = 2200
    const entries = [
      makeEntry("2024-06-01", 185.0, 2700),
      makeEntry("2024-06-02", 185.14, 2700),
      makeEntry("2024-06-03", 185.29, 2700),
      makeEntry("2024-06-04", 185.43, 2700),
      makeEntry("2024-06-05", 185.57, 2700),
      makeEntry("2024-06-06", 185.71, 2700),
      makeEntry("2024-06-07", 185.86, 2700),
      makeEntry("2024-06-08", 186.0, 2700),
    ];

    const result = calculateTDEE(entries);
    assertEquals(result !== null, true);
    assertEquals(result!.weightTrend, "gaining");
    // TDEE should be approximately 2200 (intake 2700 minus ~500 surplus)
    assertEquals(result!.currentTDEE >= 2150 && result!.currentTDEE <= 2250, true);
  });

  await t.step("calculates TDEE when losing weight", () => {
    // Losing 1 lb over 7 days = ~-0.143 lbs/day
    // Eating 1700 cal/day
    // TDEE = 1700 - (-0.143 * 3500) = 1700 + 500 = 2200
    const entries = [
      makeEntry("2024-06-01", 186.0, 1700),
      makeEntry("2024-06-02", 185.86, 1700),
      makeEntry("2024-06-03", 185.71, 1700),
      makeEntry("2024-06-04", 185.57, 1700),
      makeEntry("2024-06-05", 185.43, 1700),
      makeEntry("2024-06-06", 185.29, 1700),
      makeEntry("2024-06-07", 185.14, 1700),
      makeEntry("2024-06-08", 185.0, 1700),
    ];

    const result = calculateTDEE(entries);
    assertEquals(result !== null, true);
    assertEquals(result!.weightTrend, "losing");
    // TDEE should be approximately 2200 (intake 1700 plus ~500 deficit)
    assertEquals(result!.currentTDEE >= 2150 && result!.currentTDEE <= 2250, true);
  });

  await t.step("handles unordered entries", () => {
    // Same data as stable weight, but shuffled
    const entries = [
      makeEntry("2024-06-04", 185, 2200),
      makeEntry("2024-06-01", 185, 2200),
      makeEntry("2024-06-07", 185, 2200),
      makeEntry("2024-06-02", 185, 2200),
      makeEntry("2024-06-06", 185, 2200),
      makeEntry("2024-06-03", 185, 2200),
      makeEntry("2024-06-05", 185, 2200),
    ];

    const result = calculateTDEE(entries);
    assertEquals(result !== null, true);
    assertEquals(result!.currentTDEE, 2200);
    assertEquals(result!.weightTrend, "maintaining");
  });

  await t.step("returns correct dataPoints count", () => {
    const entries = [
      makeEntry("2024-06-01", 185, 2200),
      makeEntry("2024-06-03", 185, 2200),
      makeEntry("2024-06-05", 185, 2200),
    ];

    const result = calculateTDEE(entries);
    assertEquals(result!.dataPoints, 3);
  });
});
