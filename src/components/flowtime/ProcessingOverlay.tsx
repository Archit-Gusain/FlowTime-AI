import { motion } from "framer-motion";

const NODES = [
  [12, 20],
  [12, 50],
  [12, 80],
  [50, 30],
  [50, 65],
  [88, 50],
];

export default function ProcessingOverlay({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="glass relative overflow-hidden rounded-3xl p-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-brand opacity-15 animate-scan" />

      <div className="flex flex-col items-center gap-6">
        <div className="relative grid h-32 w-32 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "var(--neon)", borderRightColor: "var(--violet)" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            className="absolute inset-4 rounded-full border border-primary/60"
            animate={{ rotate: -360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
          <span className="font-display text-2xl font-bold text-gradient">{Math.round(progress)}%</span>
        </div>

        <svg viewBox="0 0 100 100" className="h-24 w-full max-w-xs">
          {NODES.map(([x1, y1], i) =>
            NODES.slice(i + 1).map(([x2, y2], j) => (
              <motion.line
                key={`${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--neon)"
                strokeWidth={0.4}
                initial={{ opacity: 0.05 }}
                animate={{ opacity: [0.05, 0.6, 0.05] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: (i + j) * 0.12 }}
              />
            )),
          )}
          {NODES.map(([cx, cy], i) => (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={2.6}
              fill="var(--azure)"
              animate={{ r: [2.2, 3.6, 2.2], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.3, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </svg>

        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60">
            <motion.div
              className="h-full bg-brand"
              animate={{ width: `${progress}%` }}
              transition={{ ease: "easeOut", duration: 0.2 }}
            />
          </div>
          <p className="mt-3 text-center text-xs tracking-[0.2em] text-muted-foreground uppercase">
            Neural inference in progress
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 text-[11px] text-accent">
          {["scanning geometry", "weighting traffic", "modelling weather", "estimating ETA"].map((t, i) => (
            <motion.span
              key={t}
              className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1"
              animate={{ opacity: [0.3, 1, 0.3], y: [2, -2, 2] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}
            >
              {t}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}