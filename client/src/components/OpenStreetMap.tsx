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
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    markerLayerRef.current = markerLayer;
    map.on("click", (event) => {
      onLocationSelectRef.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
    mapRef.current = map;
    setReady(true);
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, [initialCenter.latitude, initialCenter.longitude, initialZoom]);

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
    }
  }, [initialZoom, markers, ready, selectedId]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-muted/20", className)}>
      <div ref={containerRef} className="h-full min-h-[320px] w-full" role="region" aria-label={ariaLabel} />
      {onLocationSelect && (
        <p className="pointer-events-none absolute left-3 top-3 z-[500] rounded-md bg-background/90 px-2 py-1 text-xs text-foreground shadow-sm backdrop-blur">
          Clique no mapa para definir o ponto
        </p>
      )}
    </div>
  );
}
