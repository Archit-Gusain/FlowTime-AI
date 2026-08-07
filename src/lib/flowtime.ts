export type Option = { value: string; label: string };

export const TRAFFIC_LEVELS = ["Low", "Moderate", "Heavy", "Severe"] as const;
export const ROAD_TYPES = ["Highway", "City Road", "Village Road", "Mountain Road"] as const;
export const WEATHERS = ["Sunny", "Windy", "Rain", "Fog", "Storm"] as const;
export const ROAD_CONDITIONS = ["Excellent", "Good", "Average", "Poor"] as const;
export const AREA_TYPES = ["Rural", "Suburban", "Urban"] as const;
export const TIMES_OF_DAY = ["Morning", "Afternoon", "Evening", "Night"] as const;
export const DAY_TYPES = ["Weekday", "Weekend", "Holiday"] as const;
export const VEHICLES = ["Car", "Bike"] as const;

/** Post-model vehicle adjustment (the trained model has no vehicle feature). */
export const VEHICLE_PROFILE: Record<
  string,
  { speedFactor: number; maxSpeedKmh: number; trafficSensitivity: number }
> = {
  Car: { speedFactor: 1, maxSpeedKmh: 130, trafficSensitivity: 1 },
  Bike: { speedFactor: 0.82, maxSpeedKmh: 70, trafficSensitivity: 0.7 },
};

export type PredictionInput = {
  distance_km: number;
  traffic_level: string;
  road_type: string;
  weather: string;
  road_condition: string;
  area_type: string;
  time_of_day: string;
  day_type: string;
  vehicle: string;
  origin?: string;
  destination?: string;
};

export type PredictionResult = {
  travel_time_minutes: number;
  traffic_factor: number;
  average_speed_kmh: number;
  distance_km: number;
  base_speed_kmh: number;
  source: "model" | "fallback";
};

/** Applies vehicle-specific speed caps and traffic sensitivity to a raw model factor. */
export function applyVehicle(
  distanceKm: number,
  roadBaseSpeed: number,
  rawFactor: number,
  vehicle: string,
) {
  const p = VEHICLE_PROFILE[vehicle] ?? VEHICLE_PROFILE["Car"]!;
  const baseSpeed = Math.min(roadBaseSpeed * p.speedFactor, p.maxSpeedKmh);
  const factor = Math.max(1, 1 + (rawFactor - 1) * p.trafficSensitivity);
  const minutes = (distanceKm / baseSpeed) * 60 * factor;
  return { baseSpeed, factor, minutes };
}

export const BASE_SPEED_KMH: Record<string, number> = {
  Highway: 90,
  "City Road": 45,
  "Village Road": 40,
  "Mountain Road": 35,
};

const TRAFFIC_W: Record<string, number> = { Low: 1.0, Moderate: 1.25, Heavy: 1.65, Severe: 2.1 };
const WEATHER_W: Record<string, number> = {
  Sunny: 1.0,
  Windy: 1.05,
  Rain: 1.18,
  Fog: 1.28,
  Storm: 1.4,
};
const CONDITION_W: Record<string, number> = {
  Excellent: 0.96,
  Good: 1.0,
  Average: 1.09,
  Poor: 1.22,
};
const AREA_W: Record<string, number> = { Rural: 0.96, Suburban: 1.05, Urban: 1.16 };
const TIME_W: Record<string, number> = {
  Morning: 1.12,
  Afternoon: 1.02,
  Evening: 1.18,
  Night: 0.92,
};
const DAY_W: Record<string, number> = { Weekday: 1.06, Weekend: 0.98, Holiday: 0.94 };

/** On-device mirror of the Flask/XGBoost service, used when the API is offline. */
export function estimateLocally(input: PredictionInput): PredictionResult {
  const raw = Math.min(
    5,
    Math.max(
      1,
      (TRAFFIC_W[input.traffic_level] ?? 1) *
        (WEATHER_W[input.weather] ?? 1) *
        (CONDITION_W[input.road_condition] ?? 1) *
        (AREA_W[input.area_type] ?? 1) *
        (TIME_W[input.time_of_day] ?? 1) *
        (DAY_W[input.day_type] ?? 1),
    ),
  );
  const roadBase = BASE_SPEED_KMH[input.road_type] ?? 50;
  const { baseSpeed, factor, minutes } = applyVehicle(
    input.distance_km,
    roadBase,
    raw,
    input.vehicle,
  );
  return {
    travel_time_minutes: Number(minutes.toFixed(2)),
    traffic_factor: Number(factor.toFixed(3)),
    average_speed_kmh: Number((input.distance_km / (minutes / 60)).toFixed(2)),
    distance_km: Number(input.distance_km.toFixed(2)),
    base_speed_kmh: Number(baseSpeed.toFixed(1)),
    source: "fallback",
  };
}

const API_BASE =
  (import.meta.env["VITE_FLOWTIME_API"] as string | undefined) ?? "http://localhost:5000";

export async function predictTravelTime(input: PredictionInput): Promise<PredictionResult> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as Omit<PredictionResult, "source">;
    return { ...data, source: "model" };
  } catch {
    return estimateLocally(input);
  }
}

export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

export function confidenceScore(input: PredictionInput, factor: number): number {
  let score = 96;
  if (input.traffic_level === "Severe") score -= 9;
  if (input.traffic_level === "Heavy") score -= 5;
  if (input.weather === "Storm" || input.weather === "Fog") score -= 7;
  if (input.road_condition === "Poor") score -= 5;
  if (input.distance_km > 200) score -= 4;
  if (factor > 2.2) score -= 4;
  return Math.max(58, Math.min(98, Math.round(score)));
}

export function buildInsights(input: PredictionInput, result: PredictionResult): string[] {
  const out: string[] = [];
  if (input.traffic_level === "Heavy" || input.traffic_level === "Severe") {
    out.push(
      `${input.traffic_level} ${input.time_of_day.toLowerCase()} traffic on ${input.road_type.toLowerCase()}s is the primary cause of delay.`,
    );
  }
  if (["Rain", "Fog", "Storm"].includes(input.weather)) {
    out.push(`${input.weather} is expected to increase travel time and reduce visibility.`);
  }
  if (input.area_type === "Urban") out.push("Urban congestion contributes significantly.");
  if (input.road_condition === "Poor" || input.road_condition === "Average") {
    out.push(`${input.road_condition} road condition lowers achievable cruising speed.`);
  }
  if (input.road_type === "Highway" && input.traffic_level === "Low") {
    out.push("Free-flowing highway conditions keep this route close to optimal.");
  }
  if (input.day_type === "Holiday") out.push("Holiday travel reduces commuter volume on this route.");
  if (input.time_of_day === "Night") out.push("Night-time travel benefits from lighter road usage.");
  if (input.vehicle === "Bike") {
    out.push("Bike mode: lower cruising speed but better filtering through congestion.");
  }
  out.push(`Estimated traffic factor: ${result.traffic_factor.toFixed(2)}`);
  out.push(
    `Average predicted speed of ${result.average_speed_kmh.toFixed(0)} km/h across ${result.distance_km.toFixed(1)} km.`,
  );
  return out.slice(0, 5);
}