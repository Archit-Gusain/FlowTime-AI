import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Activity, Cpu, Satellite } from "lucide-react";
import type { Place } from "@/components/flowtime/MapPanel";
import PredictionPanel, { type Conditions } from "@/components/flowtime/PredictionPanel";
import ProcessingOverlay from "@/components/flowtime/ProcessingOverlay";
import ResultCard from "@/components/flowtime/ResultCard";
import { predictTravelTime, type PredictionInput, type PredictionResult } from "@/lib/flowtime";

const MapPanel = lazy(() => import("@/components/flowtime/MapPanel"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlowTime AI — Intelligent Travel Time Prediction" },
      {
        name: "description",
        content:
          "FlowTime AI predicts travel time between any two locations using machine learning, live OpenStreetMap routing and real-world traffic, weather and road conditions.",
      },
      { property: "og:title", content: "FlowTime AI — Intelligent Travel Time Prediction" },
      {
        property: "og:description",
        content:
          "AI-powered ETA prediction with interactive OpenStreetMap routing, traffic factors and instant insights.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlowTimePage,
});

const MAP_FALLBACK = (
  <div className="glass grid h-[420px] place-items-center rounded-3xl text-sm text-muted-foreground lg:h-[700px]">
    Preparing interactive map…
  </div>
);

function FlowTimePage() {
  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [usedInput, setUsedInput] = useState<PredictionInput | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [conditions, setConditions] = useState<Conditions>({
    vehicle: "Car",
    traffic_level: "Moderate",
    road_type: "Highway",
    weather: "Sunny",
    road_condition: "Good",
    area_type: "Urban",
    time_of_day: "Morning",
    day_type: "Weekday",
  });

  const handleRoute = useCallback((info: { distanceKm: number; durationMin: number } | null) => {
    setDistanceKm(info ? info.distanceKm : null);
    setResult(null);
  }, []);

  const change = (key: keyof Conditions, value: string) =>
    setConditions((prev) => ({ ...prev, [key]: value }));

  const predict = async () => {
    if (!distanceKm || !origin || !destination) return;
    const input: PredictionInput = {
      distance_km: Number(distanceKm.toFixed(2)),
      ...conditions,
      origin: origin.label,
      destination: destination.label,
    };
    setLoading(true);
    setResult(null);
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setProgress((p) => Math.min(96, p + Math.random() * 9));
    }, 90);

    const [prediction] = await Promise.all([
      predictTravelTime(input),
      new Promise((r) => setTimeout(r, 2000)),
    ]);

    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setUsedInput(input);
    setResult(prediction);
    setLoading(false);
  };

  const badges = useMemo(
    () => [
      { icon: <Satellite className="h-3.5 w-3.5" />, text: "OpenStreetMap routing" },
      { icon: <Cpu className="h-3.5 w-3.5" />, text: "Gradient-boosted model" },
      { icon: <Activity className="h-3.5 w-3.5" />, text: "Live condition weighting" },
    ],
    [],
  );

  return (
    <div className="min-h-screen">
      <header className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl px-5 py-4 sm:flex sm:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand font-black text-primary-foreground glow">
              FT
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold sm:text-xl">
                FlowTime <span className="text-gradient">AI</span>
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Next-generation travel time intelligence
              </p>
            </div>
          </div>
          <div className="hidden gap-2 sm:flex">
            {badges.map((b) => (
              <span
                key={b.text}
                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground"
              >
                <span className="text-accent">{b.icon}</span>
                {b.text}
              </span>
            ))}
          </div>
        </motion.div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-8 max-w-2xl"
        >
          <h2 className="text-3xl leading-tight font-black sm:text-4xl">
            Predict any journey with <span className="text-gradient">AI precision</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Drop two points on the map, tune the road and weather conditions, and FlowTime AI returns a
            realistic ETA with traffic factors, confidence scoring and route insights.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <ClientOnly fallback={MAP_FALLBACK}>
              <Suspense fallback={MAP_FALLBACK}>
                <MapPanel
                  origin={origin}
                  destination={destination}
                  onOrigin={setOrigin}
                  onDestination={setDestination}
                  onRoute={handleRoute}
                  animateVehicle={Boolean(result)}
                />
              </Suspense>
            </ClientOnly>

            <AnimatePresence mode="wait">
              {result && usedInput && (
                <div key="result-lg" className="hidden lg:block">
                  <ResultCard input={usedInput} result={result} />
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {loading && <ProcessingOverlay key="processing" progress={progress} />}
            </AnimatePresence>

            <PredictionPanel
              origin={origin}
              destination={destination}
              distanceKm={distanceKm}
              conditions={conditions}
              onChange={change}
              onPredict={predict}
              loading={loading}
            />

            <AnimatePresence mode="wait">
              {result && usedInput && (
                <div key="result-sm" className="lg:hidden">
                  <ResultCard input={usedInput} result={result} />
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="glass flex flex-col items-center gap-1 rounded-3xl px-6 py-6 text-center">
          <p className="font-display text-lg font-bold">
            FlowTime <span className="text-gradient">AI</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Artificial Intelligence and OpenStreetMap.
          </p>
        </div>
      </footer>
    </div>
  );
}
