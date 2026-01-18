export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  userId: string;
  date: string;
  weight: number;
  calories: number;
  createdAt: string;
  updatedAt: string;
}

export interface TDEEStats {
  currentTDEE: number;
  weeklyAverageWeight: number;
  weeklyAverageCalories: number;
  weightTrend: "gaining" | "losing" | "maintaining";
  dataPoints: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
