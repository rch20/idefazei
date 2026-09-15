import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type OpenStreetMapMarker = {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
};

type OpenStreetMapProps = {
  markers: OpenStreetMapMarker[];
  selectedId?: number | null;
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
  onSelect?: (id: number) => void;
  onLocationSelect?: (location: { latitude: number; longitude: number }) => void;
  className?: string;
  ariaLabel?: string;
};

const DEFAULT_CENTER = { latitude: -15.7797, longitude: -47.9297 };
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY?.trim() ?? "";
const MAP_TILE_URL =
  import.meta.env.VITE_MAP_TILE_URL?.trim() ||
  (MAPTILER_KEY
    ? `https://api.maptiler.com/maps/streets-v4/256/{z}/{x}/{y}.png?key=${encodeURIComponent(MAPTILER_KEY)}`
    : "");
const MAP_TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_TILE_ATTRIBUTION?.trim() ||
  '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">&copy; OpenStreetMap contributors</a>';


function createMarkerIcon(selected: boolean) {
  return L.divIcon({
    className: "cell-map-marker-shell",
    html: `<span class="cell-map-marker${selected ? " cell-map-marker--selected" : ""}" aria-hidden="true"></span>`,
    iconSize: selected ? [30, 30] : [24, 24],
    iconAnchor: selected ? [15, 15] : [12, 12],
  });
}

export function OpenStreetMap({
  markers,
  selectedId,
  initialCenter = DEFAULT_CENTER,
  initialZoom = 12,
  onSelect,
  onLocationSelect,
  className,
  ariaLabel = "Mapa de células",
}: OpenStreetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onLocationSelectRef = useRef(onLocationSelect);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(!MAP_TILE_URL);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onLocationSelectRef.current = onLocationSelect; }, [onLocationSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [initialCenter.latitude, initialCenter.longitude],
      zoom: initialZoom,
      scrollWheelZoom: false,
      zoomControl: true,
    });
    if (MAP_TILE_URL) {
      L.tileLayer(MAP_TILE_URL, {
        minZoom: 1,
        maxZoom: 19,
        attribution: MAP_TILE_ATTRIBUTION,
        crossOrigin: true,
      })
        .on("tileerror", () => setTileError(true))
        .on("load", () => setTileError(false))
        .addTo(map);
    }
    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;
    map.on("click", (event) => {
      onLocationSelectRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    mapRef.current = map;
    setReady(true);
    const container = containerRef.current;
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(container);
    requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
    // O mapa deve ser criado uma vez por montagem. Mudanças de marcadores ou centro não podem removê-lo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!ready || !map || !layer) return;
    layer.clearLayers();
    const bounds: L.LatLngTuple[] = [];
    markers.forEach((item) => {
      const position: L.LatLngTuple = [item.latitude, item.longitude];
      bounds.push(position);
      const marker = L.marker(position, { icon: createMarkerIcon(item.id === selectedId), title: item.title });
      const tooltip = document.createElement("span");
      tooltip.textContent = item.title;
      marker.bindTooltip(tooltip, { direction: "top", offset: [0, -10] });
      marker.on("click", () => onSelectRef.current?.(item.id));
      marker.addTo(layer);
    });
    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], Math.max(initialZoom, 14));
    } else if (markers.length > 1) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    } else {
      map.setView([initialCenter.latitude, initialCenter.longitude], initialZoom);
    }
  }, [initialCenter.latitude, initialCenter.longitude, initialZoom, markers, ready, selectedId]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-muted/20", className)}>
      <div ref={containerRef} className="h-full min-h-[320px] w-full" role="region" aria-label={ariaLabel} />
      {onLocationSelect && (
        <p className="pointer-events-none absolute left-3 top-3 z-[500] rounded-md bg-background/90 px-2 py-1 text-xs text-foreground shadow-sm backdrop-blur">
          Clique no mapa para definir o ponto
        </p>
      )}
      {tileError && (
        <p
          className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[min(92%,28rem)] rounded-md border border-amber-200 bg-background/95 px-3 py-2 text-xs text-foreground shadow-sm backdrop-blur"
          role="status"
          aria-live="polite"
        >
          Mapa de ruas temporariamente indisponível. Os marcadores continuam disponíveis.
        </p>
      )}
    </div>
  );
}
