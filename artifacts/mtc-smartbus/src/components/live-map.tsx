import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BusFront, Compass, LocateFixed, MapPin, Maximize2, Navigation } from 'lucide-react';

export interface MapPoint {
  id?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  sequence?: number;
}

export interface LiveBusTelemetry {
  id?: string;
  number?: string;
  routeNumber?: string;
  currentLocation?: string;
  gps?: {
    latitude?: number;
    longitude?: number;
    speed?: number;
    heading?: number;
    timestamp?: string;
  };
}

export interface MiniMapProps {
  points?: MapPoint[];
  busPoint?: boolean;
  bus?: LiveBusTelemetry;
  activeStopId?: string;
  height?: string;
  className?: string;
}

export function MiniMap({
  points = [],
  busPoint = true,
  bus,
  activeStopId,
  height = '320px',
  className = '',
}: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const busMarkerRef = useRef<L.Marker | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [followBus, setFollowBus] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Extract bus GPS coords
  const busLat = bus?.gps?.latitude;
  const busLng = bus?.gps?.longitude;
  const busSpeed = bus?.gps?.speed ?? 24;
  const busHeading = bus?.gps?.heading ?? 90;

  // Filter valid points with valid coordinates
  const validPoints = points.filter(
    (p): p is MapPoint & { latitude: number; longitude: number } =>
      typeof p.latitude === 'number' &&
      typeof p.longitude === 'number' &&
      !isNaN(p.latitude) &&
      !isNaN(p.longitude)
  );

  // Fallback center: Chennai central if no points
  const defaultCenter: [number, number] = [13.0827, 80.2707];

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapInstanceRef.current) return;

    try {
      const initialCenter: [number, number] =
        busLat && busLng
          ? [busLat, busLng]
          : validPoints.length > 0
          ? [validPoints[0].latitude, validPoints[0].longitude]
          : defaultCenter;

      const map = L.map(containerRef.current, {
        center: initialCenter,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });

      // Sleek, high-contrast light OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>')
        .addTo(map);

      // Layer groups for markers & polyline
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
      setMapReady(true);

      // Invalidate size after layout completes
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        busMarkerRef.current = null;
        polylineRef.current = null;
      }
    };
  }, []);

  // Update stops markers & route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear previous stop markers & polyline
    markersLayer.clearLayers();
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const latLngs: [number, number][] = [];

    // Plot Stop Pins
    validPoints.forEach((point, index) => {
      const isSelected = activeStopId && point.id === activeStopId;
      const latLng: [number, number] = [point.latitude, point.longitude];
      latLngs.push(latLng);

      const stopIconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
          <div class="w-6 h-6 rounded-full border-2 ${
            isSelected
              ? 'bg-amber-500 border-white ring-4 ring-amber-500/40'
              : 'bg-primary border-white shadow-md'
          } flex items-center justify-center text-[10px] font-bold text-white transition-transform group-hover:scale-125">
            ${point.sequence ?? index + 1}
          </div>
          <div class="absolute -top-7 whitespace-nowrap rounded bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            ${point.name || `Stop ${index + 1}`}
          </div>
        </div>
      `;

      const customStopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: stopIconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(latLng, { icon: customStopIcon });
      marker.bindPopup(`
        <div class="p-1 text-xs">
          <strong class="font-bold text-slate-900">${point.name || 'Bus Stop'}</strong>
          <div class="text-[11px] text-slate-600 mt-0.5">Stop sequence #${point.sequence ?? index + 1}</div>
          <div class="text-[10px] text-slate-500 mt-0.5">${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}</div>
        </div>
      `);
      markersLayer.addLayer(marker);
    });

    // Draw route path line connecting all stops
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: '#0f172a',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 6',
        lineCap: 'round',
      }).addTo(map);
      polylineRef.current = polyline;
    }

    // Fit bounds if no bus position is actively locking view
    if (!followBus || (!busLat && !busLng)) {
      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [validPoints.length, activeStopId, mapReady]);

  // Update Bus Live Position & Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // If bus point is disabled, remove bus marker if it exists
    if (!busPoint) {
      if (busMarkerRef.current) {
        busMarkerRef.current.remove();
        busMarkerRef.current = null;
      }
      return;
    }

    // Determine bus coordinates (from bus prop or fallback to mid-stop)
    let currentBusLat = busLat;
    let currentBusLng = busLng;

    if (!currentBusLat || !currentBusLng) {
      if (validPoints.length > 0) {
        const midPoint = validPoints[Math.floor(validPoints.length / 2)];
        currentBusLat = midPoint.latitude;
        currentBusLng = midPoint.longitude;
      }
    }

    if (!currentBusLat || !currentBusLng) return;

    const busPos: [number, number] = [currentBusLat, currentBusLng];
    const busLabel = bus?.number ? `BUS ${bus.number}` : bus?.routeNumber ? `R-${bus.routeNumber}` : 'BUS';

    const busIconHtml = `
      <div class="relative flex items-center justify-center" style="transform: translate(-50%, -50%);">
        <!-- Pulsing radar ring -->
        <div class="absolute w-12 h-12 rounded-full bg-emerald-500/25 animate-ping"></div>
        <div class="absolute w-9 h-9 rounded-full bg-emerald-500/35 animate-pulse"></div>
        
        <!-- Direction indicator arrow -->
        <div class="absolute -top-3.5 transition-transform duration-500" style="transform: rotate(${busHeading}deg);">
          <svg class="w-3.5 h-3.5 text-emerald-600 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>

        <!-- Central Bus Badge -->
        <div class="relative z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900 border-2 border-emerald-400 text-white font-mono text-[10px] font-black shadow-xl">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>${busLabel}</span>
        </div>
      </div>
    `;

    const customBusIcon = L.divIcon({
      className: 'live-bus-marker',
      html: busIconHtml,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });

    if (!busMarkerRef.current) {
      const marker = L.marker(busPos, { icon: customBusIcon, zIndexOffset: 1000 });
      marker.bindPopup(`
        <div class="p-1 text-xs">
          <div class="flex items-center gap-1.5 font-bold text-slate-900">
            <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            ${bus?.routeNumber ? `Route ${bus.routeNumber} · ` : ''}${busLabel}
          </div>
          <div class="text-[11px] text-slate-600 mt-1">Location: <strong>${bus?.currentLocation || 'En route'}</strong></div>
          <div class="text-[11px] text-slate-600">Speed: <strong>${busSpeed} km/h</strong></div>
          <div class="text-[10px] text-slate-400 mt-1 font-mono">${currentBusLat.toFixed(5)}, ${currentBusLng.toFixed(5)}</div>
        </div>
      `);
      marker.addTo(map);
      busMarkerRef.current = marker;
    } else {
      busMarkerRef.current.setLatLng(busPos);
      busMarkerRef.current.setIcon(customBusIcon);
    }

    if (followBus) {
      map.panTo(busPos, { animate: true, duration: 1 });
    }
  }, [busLat, busLng, busSpeed, busHeading, bus?.number, busPoint, followBus, mapReady]);

  // Recenter button action
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (busLat && busLng) {
      setFollowBus(true);
      map.setView([busLat, busLng], 14, { animate: true });
    } else if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints.map((p) => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  const handleZoom = (delta: number) => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setZoom(map.getZoom() + delta);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-slate-100 ${
        isZoomed ? 'fixed inset-4 z-50 shadow-2xl' : ''
      } ${className}`}
      style={{ height: isZoomed ? 'calc(100vh - 32px)' : height }}
      data-testid="map-treatment"
    >
      {/* Real Map Canvas Container */}
      <div ref={containerRef} className="h-full w-full z-0" />

      {/* Top Floating Telemetry Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-background/95 backdrop-blur px-3 py-1.5 shadow-sm font-data text-[11px] text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold">Live GPS Telemetry</span>
          {busLat && busLng ? (
            <span className="hidden sm:inline text-muted-foreground">
              · {busLat.toFixed(4)}, {busLng.toFixed(4)} ({busSpeed} km/h)
            </span>
          ) : (
            <span className="text-muted-foreground">· Chennai Network</span>
          )}
        </div>

        {validPoints.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/95 backdrop-blur px-2.5 py-1.5 shadow-sm font-data text-[10px] text-muted-foreground">
            <MapPin size={12} className="text-primary" />
            <span>{validPoints.length} stops mapped</span>
          </div>
        )}
      </div>

      {/* Top Right Map Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          title="Recenter on bus"
          className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-background shadow-sm transition-colors hover:bg-secondary text-primary ${
            followBus ? 'ring-2 ring-primary text-primary' : 'text-muted-foreground'
          }`}
        >
          <LocateFixed size={16} />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(1)}
          title="Zoom in"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background shadow-sm transition-colors hover:bg-secondary text-primary font-bold text-base"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => handleZoom(-1)}
          title="Zoom out"
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background shadow-sm transition-colors hover:bg-secondary text-primary font-bold text-base"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setIsZoomed(!isZoomed)}
          title={isZoomed ? 'Exit fullscreen' : 'Expand map'}
          className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background shadow-sm transition-colors hover:bg-secondary text-muted-foreground hover:text-primary"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Bottom Floating Legend / Status */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="rounded-lg border border-border/80 bg-background/90 backdrop-blur px-2.5 py-1 font-data text-[10px] text-muted-foreground shadow-sm">
          {bus?.currentLocation ? (
            <span className="flex items-center gap-1.5">
              <Navigation size={11} className="text-emerald-600" />
              Near <strong>{bus.currentLocation}</strong>
            </span>
          ) : (
            <span>Chennai Metropolitan Bus Network</span>
          )}
        </div>
      </div>
    </div>
  );
}
