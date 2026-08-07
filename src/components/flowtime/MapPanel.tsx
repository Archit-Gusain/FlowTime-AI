import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline, LayerGroup } from "leaflet";
import { Crosshair, Loader2, Search, Trash2 } from "lucide-react";

export type Place = { lat: number; lng: number; label: string };

type Props = {
  origin: Place | null;
  destination: Place | null;
  onOrigin: (p: Place | null) => void;
  onDestination: (p: Place | null) => void;
  onRoute: (info: { distanceKm: number; durationMin: number } | null) => void;
  animateVehicle: boolean;
};

async function reverseLabel(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14`,
      { headers: { Accept: "application/json" } },
    );
    const data = (await res.json()) as { display_name?: string };
    return data.display_name?.split(",").slice(0, 3).join(",").trim() ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export default function MapPanel({
  origin,
  destination,
  onOrigin,
  onDestination,
  onRoute,
  animateVehicle,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<{ origin?: Marker; destination?: Marker }>({});
  const routeRef = useRef<{ base?: Polyline; anim?: Polyline; group?: LayerGroup }>({});
  const vehicleRef = useRef<Marker | null>(null);
  const rafRef = useRef<number | null>(null);
  const coordsRef = useRef<[number, number][]>([]);
  const pickRef = useRef<"origin" | "destination">("origin");

  const [ready, setReady] = useState(false);
  const [pick, setPick] = useState<"origin" | "destination">("origin");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    pickRef.current = pick;
  }, [pick]);

  const setPoint = useCallback(
    async (lat: number, lng: number, which: "origin" | "destination") => {
      const label = await reverseLabel(lat, lng);
      const place = { lat, lng, label };
      if (which === "origin") {
        onOrigin(place);
        setPick("destination");
      } else {
        onDestination(place);
      }
    },
    [onOrigin, onDestination],
  );

  // Initialise map (browser only)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true }).setView(
        [20.5937, 78.9629],
        5,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      routeRef.current.group = L.layerGroup().addTo(map);
      map.on("click", (e) => {
        void setPoint(e.latlng.lat, e.latlng.lng, pickRef.current);
      });
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [setPoint]);

  // Markers
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const icon = (color: string, glyph: string) =>
      L.divIcon({
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        html: `<div style="width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
          background:${color};color:#050816;font:700 13px/1 sans-serif;
          box-shadow:0 0 0 6px ${color}33, 0 6px 18px rgba(0,0,0,.5)">${glyph}</div>`,
      });

    for (const key of ["origin", "destination"] as const) {
      const place = key === "origin" ? origin : destination;
      const existing = markersRef.current[key];
      if (!place) {
        if (existing) map.removeLayer(existing);
        delete markersRef.current[key];
        continue;
      }
      if (existing) {
        existing.setLatLng([place.lat, place.lng]);
      } else {
        markersRef.current[key] = L.marker([place.lat, place.lng], {
          icon: icon(key === "origin" ? "#06B6D4" : "#7C3AED", key === "origin" ? "A" : "B"),
        })
          .addTo(map)
          .bindTooltip(key === "origin" ? "Origin" : "Destination");
      }
    }
  }, [origin, destination]);

  // Routing via OSRM
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = routeRef.current.group;
    if (!L || !map || !group) return;

    if (!origin || !destination) {
      group.clearLayers();
      coordsRef.current = [];
      onRoute(null);
      return;
    }

    let cancelled = false;
    setRouting(true);
    (async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = (await res.json()) as {
          routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
        };
        if (cancelled) return;
        const route = data.routes?.[0];
        if (!route) throw new Error("no route");
        const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
        coordsRef.current = coords;
        group.clearLayers();
        L.polyline(coords, { color: "#3B82F6", weight: 9, opacity: 0.25 }).addTo(group);
        const anim = L.polyline(coords, { color: "#06B6D4", weight: 4, opacity: 0.95 }).addTo(group);
        anim.getElement()?.classList.add("ft-route-anim");
        map.fitBounds(L.latLngBounds(coords).pad(0.15));
        onRoute({ distanceKm: route.distance / 1000, durationMin: route.duration / 60 });
      } catch {
        if (!cancelled) onRoute(null);
      } finally {
        if (!cancelled) setRouting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, destination, onRoute]);

  // Animated vehicle along the route
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const coords = coordsRef.current;
    if (!L || !map) return;
    if (vehicleRef.current) {
      map.removeLayer(vehicleRef.current);
      vehicleRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (!animateVehicle || coords.length < 2) return;

    const marker = L.marker(coords[0]!, {
      icon: L.divIcon({
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;
          background:#fff;box-shadow:0 0 0 8px rgba(6,182,212,.25),0 0 22px rgba(6,182,212,.9)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#050816"><path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11v7a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H8v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-7zm2.2-1h9.6l-1-3H8.2l-1 3zM7.5 15a1 1 0 100-2 1 1 0 000 2zm9 0a1 1 0 100-2 1 1 0 000 2z"/></svg>
        </div>`,
      }),
    }).addTo(map);
    vehicleRef.current = marker;

    const start = performance.now();
    const duration = 9000;
    const step = (now: number) => {
      const t = ((now - start) % duration) / duration;
      const idx = Math.min(coords.length - 1, Math.floor(t * (coords.length - 1)));
      marker.setLatLng(coords[idx]!);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (vehicleRef.current) map.removeLayer(vehicleRef.current);
      vehicleRef.current = null;
    };
  }, [animateVehicle, origin, destination, routing]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      );
      const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      const hit = data[0];
      if (hit) {
        const place = {
          lat: Number(hit.lat),
          lng: Number(hit.lon),
          label: hit.display_name.split(",").slice(0, 3).join(",").trim(),
        };
        if (pick === "origin") {
          onOrigin(place);
          setPick("destination");
        } else {
          onDestination(place);
        }
        mapRef.current?.setView([place.lat, place.lng], 12);
        setQuery("");
      }
    } finally {
      setSearching(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      mapRef.current?.setView([latitude, longitude], 13);
      void setPoint(latitude, longitude, pickRef.current);
    });
  };

  const clearAll = () => {
    onOrigin(null);
    onDestination(null);
    setPick("origin");
  };

  return (
    <div className="glass relative overflow-hidden rounded-3xl">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 rounded-full border border-border bg-secondary/50 p-1 text-xs font-semibold">
          {(["origin", "destination"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPick(mode)}
              className={`rounded-full px-3 py-1.5 capitalize transition-colors ${
                pick === mode ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <form onSubmit={search} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${pick} location`}
              className="h-10 w-full rounded-full border border-border bg-secondary/40 pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/70 focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground transition-transform hover:scale-105 disabled:opacity-60"
            aria-label="Search location"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={locate}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-secondary/40 transition-colors hover:text-accent"
            aria-label="Use current location"
          >
            <Crosshair className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-secondary/40 transition-colors hover:text-destructive"
            aria-label="Clear route"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="relative">
        <div ref={containerRef} className="h-[340px] w-full sm:h-[460px] lg:h-[620px]" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading OpenStreetMap…
            </span>
          </div>
        )}
        {routing && (
          <div className="glass absolute top-4 left-4 rounded-full px-3 py-1.5 text-xs text-accent">
            Fetching route geometry…
          </div>
        )}
        <div className="glass pointer-events-none absolute bottom-6 left-4 max-w-[70%] rounded-2xl px-3 py-2 text-xs text-muted-foreground">
          Click the map to set the <span className="text-accent">{pick}</span> point.
        </div>
      </div>
    </div>
  );
}