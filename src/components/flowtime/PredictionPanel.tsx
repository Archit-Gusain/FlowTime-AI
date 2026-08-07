import { motion } from "framer-motion";
import {
  AREA_TYPES,
  DAY_TYPES,
  ROAD_CONDITIONS,
  ROAD_TYPES,
  TIMES_OF_DAY,
  TRAFFIC_LEVELS,
  WEATHERS,
  VEHICLES,
} from "@/lib/flowtime";
import type { Place } from "./MapPanel";
import { Bike, CircleDot, Cloud, Flag, Gauge, MapPin, Mountain, Route, Sparkles, Sun } from "lucide-react";

export type Conditions = {
  vehicle: string;
  traffic_level: string;
  road_type: string;
  weather: string;
  road_condition: string;
  area_type: string;
  time_of_day: string;
  day_type: string;
};

type Props = {
  origin: Place | null;
  destination: Place | null;
  distanceKm: number | null;
  conditions: Conditions;
  onChange: (key: keyof Conditions, value: string) => void;
  onPredict: () => void;
  loading: boolean;
};

function Field({
  label,
  icon,
  value,
  options,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  options: readonly string[];
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <span className="text-accent">{icon}</span>
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onSelect(opt)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              value === opt
                ? "border-transparent bg-brand text-primary-foreground glow"
                : "border-border bg-secondary/40 text-muted-foreground hover:border-accent/50 hover:text-foreground"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PredictionPanel({
  origin,
  destination,
  distanceKm,
  conditions,
  onChange,
  onPredict,
  loading,
}: Props) {
  const ready = Boolean(origin && destination && distanceKm && distanceKm > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass rounded-3xl p-5 sm:p-6"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="h-5 w-5 text-accent" />
        Prediction Panel
      </h2>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-border bg-secondary/30 p-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <CircleDot className="h-3.5 w-3.5 text-accent" /> Origin
          </p>
          <p className="mt-1 truncate text-sm">{origin?.label ?? "Pick a start point on the map"}</p>
          {origin && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-secondary/30 p-3">
          <p className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <Flag className="h-3.5 w-3.5 text-violet" /> Destination
          </p>
          <p className="mt-1 truncate text-sm">{destination?.label ?? "Pick a destination on the map"}</p>
          {destination && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/10 p-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Route className="h-4 w-4 text-accent" /> Route distance
          </span>
          <span className="font-display text-xl font-bold text-gradient">
            {distanceKm ? `${distanceKm.toFixed(1)} km` : "—"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-5">
        <Field
          label="Vehicle"
          icon={<Bike className="h-3.5 w-3.5" />}
          value={conditions.vehicle}
          options={VEHICLES}
          onSelect={(v) => onChange("vehicle", v)}
        />
        <Field
          label="Traffic level"
          icon={<Gauge className="h-3.5 w-3.5" />}
          value={conditions.traffic_level}
          options={TRAFFIC_LEVELS}
          onSelect={(v) => onChange("traffic_level", v)}
        />
        <Field
          label="Road type"
          icon={<Route className="h-3.5 w-3.5" />}
          value={conditions.road_type}
          options={ROAD_TYPES}
          onSelect={(v) => onChange("road_type", v)}
        />
        <Field
          label="Weather"
          icon={<Cloud className="h-3.5 w-3.5" />}
          value={conditions.weather}
          options={WEATHERS}
          onSelect={(v) => onChange("weather", v)}
        />
        <Field
          label="Road condition"
          icon={<Mountain className="h-3.5 w-3.5" />}
          value={conditions.road_condition}
          options={ROAD_CONDITIONS}
          onSelect={(v) => onChange("road_condition", v)}
        />
        <Field
          label="Area type"
          icon={<MapPin className="h-3.5 w-3.5" />}
          value={conditions.area_type}
          options={AREA_TYPES}
          onSelect={(v) => onChange("area_type", v)}
        />
        <Field
          label="Time of day"
          icon={<Sun className="h-3.5 w-3.5" />}
          value={conditions.time_of_day}
          options={TIMES_OF_DAY}
          onSelect={(v) => onChange("time_of_day", v)}
        />
        <Field
          label="Day type"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          value={conditions.day_type}
          options={DAY_TYPES}
          onSelect={(v) => onChange("day_type", v)}
        />
      </div>

      <motion.button
        type="button"
        whileHover={{ scale: ready && !loading ? 1.02 : 1 }}
        whileTap={{ scale: ready && !loading ? 0.98 : 1 }}
        onClick={onPredict}
        disabled={!ready || loading}
        className="mt-7 h-14 w-full rounded-2xl bg-brand text-base font-bold tracking-wide text-primary-foreground glow transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
      >
        {loading ? "Analysing route…" : ready ? "Predict travel time" : "Select origin & destination"}
      </motion.button>
    </motion.section>
  );
}