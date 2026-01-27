import type { Entry } from "../db/schema.ts";

export interface TDEEResult {
  currentTDEE: number;
  weeklyAverageWeight: number;
  weeklyAverageCalories: number;
  weightTrend: "gaining" | "losing" | "maintaining";
  dataPoints: number;
}

const CALORIES_PER_POUND = 3500;
// Weight change threshold for "maintaining" (lbs/day). ~0.14 lbs/week.
const MAINTAINING_THRESHOLD = 0.02;
const MIN_DATA_POINTS = 3;

/**
 * Compute linear regression slope for (x, y) pairs.
 * Returns the slope (change in y per unit x).
 */
export function linearRegressionSlope(
  points: { x: number; y: number }[]
): number {
  const n = points.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Calculate TDEE and weight stats from a set of daily entries.
 *
 * Algorithm:
 * 1. Compute average daily calorie intake.
 * 2. Fit a linear regression to weight over time to get daily weight change rate.
 * 3. Apply energy balance: TDEE = avgCalories - (dailyWeightChange × 3500)
 *
 * Entries should be pre-filtered to the desired analysis window (e.g. last 28 days).
 * Returns null if insufficient data.
 */
export function calculateTDEE(entries: Entry[]): TDEEResult | null {
  if (entries.length < MIN_DATA_POINTS) {
    return null;
  }

  // Sort by date ascending for regression
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  // Parse the first date as day-0 reference
  const baseDate = new Date(sorted[0].date + "T00:00:00Z").getTime();
  const msPerDay = 86_400_000;

  const weightPoints: { x: number; y: number }[] = [];
  let totalCalories = 0;
  let totalWeight = 0;

  for (const entry of sorted) {
    const dayIndex =
      (new Date(entry.date + "T00:00:00Z").getTime() - baseDate) / msPerDay;
    const weight = parseFloat(entry.weight);

    weightPoints.push({ x: dayIndex, y: weight });
    totalCalories += entry.calories;
    totalWeight += weight;
  }

  const avgCalories = totalCalories / sorted.length;
  const avgWeight = totalWeight / sorted.length;

  // Daily weight change rate (lbs/day) via linear regression
  const dailyWeightChange = linearRegressionSlope(weightPoints);

  // Energy balance: surplus/deficit = (TDEE - intake) causes weight change
  // weightChange (lbs/day) = (intake - TDEE) / CALORIES_PER_POUND
  // => TDEE = intake - weightChange * CALORIES_PER_POUND
  const tdee = Math.round(avgCalories - dailyWeightChange * CALORIES_PER_POUND);

  let weightTrend: TDEEResult["weightTrend"];
  if (dailyWeightChange > MAINTAINING_THRESHOLD) {
    weightTrend = "gaining";
  } else if (dailyWeightChange < -MAINTAINING_THRESHOLD) {
    weightTrend = "losing";
  } else {
    weightTrend = "maintaining";
  }

  return {
    currentTDEE: tdee,
    weeklyAverageWeight: Math.round(avgWeight * 100) / 100,
    weeklyAverageCalories: Math.round(avgCalories),
    weightTrend,
    dataPoints: sorted.length,
  };
}
