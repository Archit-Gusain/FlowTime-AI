import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { CloudSun, Clock, Gauge, MapPin, Route, Timer, TrendingUp, Zap } from "lucide-react";
import { buildInsights, confidenceScore, formatDuration, type PredictionInput, type PredictionResult } from "@/lib/flowtime";

function useCountUp(target: number, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function Ring({ percent, label }: { percent: number; label: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--secondary)" strokeWidth="8" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#ftGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * percent) / 100 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ftGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="50%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-xl font-bold">{Math.round(percent)}%</p>
        <p className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</p>
      </div>
    </div>
  );
}

function Meter({ value }: { value: number }) {
  const pct = Math.min(100, ((value - 1) / 2.5) * 100);
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11px] tracking-wider text-muted-foreground uppercase">
        <span>Traffic severity</span>
        <span className="text-accent">×{value.toFixed(2)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary/60">
        <motion.div
          className="h-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

const stat = (icon: React.ReactNode, label: string, value: string) => ({ icon, label, value });

export default function ResultCard({
  input,
  result,
}: {
  input: PredictionInput;
  result: PredictionResult;
}) {
  const minutes = useCountUp(result.travel_time_minutes);
  const confidence = confidenceScore(input, result.traffic_factor);
  const insights = buildInsights(input, result);

  const stats = [
    stat(<Gauge className="h-4 w-4" />, "Traffic factor", `×${result.traffic_factor.toFixed(2)}`),
    stat(<Route className="h-4 w-4" />, "Distance", `${result.distance_km.toFixed(1)} km`),
    stat(<TrendingUp className="h-4 w-4" />, "Average speed", `${result.average_speed_kmh.toFixed(0)} km/h`),
    stat(<Timer className="h-4 w-4" />, "Free-flow", `${result.base_speed_kmh} km/h`),
  ];

  const chips = [
    { icon: <Route className="h-3.5 w-3.5" />, text: input.road_type },
    { icon: <Route className="h-3.5 w-3.5" />, text: input.vehicle },
    { icon: <CloudSun className="h-3.5 w-3.5" />, text: input.weather },
    { icon: <Gauge className="h-3.5 w-3.5" />, text: input.traffic_level },
    { icon: <MapPin className="h-3.5 w-3.5" />, text: input.area_type },
    { icon: <Clock className="h-3.5 w-3.5" />, text: `${input.time_of_day} · ${input.day_type}` },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass rounded-3xl p-6"
    >
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.25em] text-muted-foreground uppercase">
            Estimated travel time
          </p>
          <p className="font-display mt-2 text-4xl font-black text-gradient sm:text-5xl">
            {formatDuration(minutes)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {result.source === "model"
              ? "Predicted by the FlowTime XGBoost model"
              : "On-device estimate — start the Flask service for model predictions"}
          </p>
        </div>
        <Ring percent={confidence} label="confidence" />
      </div>

      <div className="mt-6">
        <Meter value={result.traffic_factor} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            className="rounded-2xl border border-border bg-secondary/30 p-3"
          >
            <span className="flex items-center gap-1.5 text-[11px] tracking-wide text-muted-foreground uppercase">
              <span className="text-accent">{s.icon}</span>
              {s.label}
            </span>
            <p className="font-display mt-1 text-lg font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.text}
            className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground"
          >
            <span className="text-accent">{c.icon}</span>
            {c.text}
          </span>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-accent/25 bg-accent/8 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Zap className="h-4 w-4 text-accent" /> AI insights
        </p>
        <ul className="mt-3 grid gap-2">
          {insights.map((text, i) => (
            <motion.li
              key={text}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="flex gap-2 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {text}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.section>
  );
}