import { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '@/components/shared';
import {
  Play,
  Pause,
  RotateCcw,
  Bus,
  ShieldAlert,
  UserPlus,
  Video,
  Ticket,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  Loader2,
  ChevronRight,
  Wifi,
  WifiOff,
  ExternalLink,
  Layers,
  Filter,
  SlidersHorizontal,
} from 'lucide-react';

interface Stop {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  routes: string[];
}

interface Route {
  id: string;
  routeNumber: string;
  origin: string;
  destination: string;
  serviceType: string;
  liveTracking: boolean;
  stops: Stop[];
}

interface LiveBus {
  id: string;
  number: string;
  routeId: string;
  routeNumber: string;
  origin: string;
  destination: string;
  serviceType: string;
  currentLocation: string;
  etaMinutes: number;
  currentOccupancy: number;
  predictedOccupancy: number;
  capacity: number;
  crowding: string;
  status: string;
  lastUpdatedSeconds: number;
  stopIndex?: number;
  gps?: { latitude: number; longitude: number; speed: number; heading: number };
}

interface LogEntry {
  id: string;
  ts: string;
  type: 'ETM' | 'CAMERA' | 'SECURITY' | 'RECONCILIATION' | 'API';
  status: 'SUCCESS' | 'DISCREPANCY' | 'ERROR' | 'INFO';
  msg: string;
  detail?: string;
}

interface ReconciliationState {
  delta: number;
  status: 'NORMAL_MATCH' | 'CAMERA_VALUE_DIFFERENT';
  reconciledVal: number;
  etm: number;
  cam: number;
}

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function SimulatorComponent() {
  const [buses, setBuses] = useState<LiveBus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [routeFilter, setRouteFilter] = useState<string>('ALL');

  const [selectedBus, setSelectedBus] = useState<LiveBus | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

  const [simStopIndex, setSimStopIndex] = useState(0);
  const [etmOccupancy, setEtmOccupancy] = useState(0);
  const [cameraOccupancy, setCameraOccupancy] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [discrepancyCount, setDiscrepancyCount] = useState(0);
  const [recon, setRecon] = useState<ReconciliationState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalBoardings, setTotalBoardings] = useState(0);
  const [totalAlightings, setTotalAlightings] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = useCallback(
    (
      type: LogEntry['type'],
      status: LogEntry['status'],
      msg: string,
      detail?: string
    ) => {
      setLogs((prev) => [
        {
          id: Math.random().toString(36).slice(2, 9),
          ts: new Date().toLocaleTimeString([], { hour12: false }),
          type,
          status,
          msg,
          detail,
        },
        ...prev.slice(0, 99),
      ]);
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [busesData, routesData] = await Promise.all([
          apiFetch('/buses'),
          apiFetch('/routes'),
        ]);
        if (!mounted) return;

        setBuses(busesData);
        setRoutes(routesData);
        setApiError(null);
        setApiLoading(false);

        if (!selectedBus && busesData.length > 0) {
          const firstBus = busesData[0];
          const firstRoute = routesData.find((r: Route) => r.id === firstBus.routeId) ?? routesData[0];
          setSelectedBus(firstBus);
          setSelectedRoute(firstRoute);
          setSimStopIndex(firstBus.stopIndex ?? 0);
          setEtmOccupancy(firstBus.currentOccupancy);
          setCameraOccupancy(firstBus.currentOccupancy);
          addLog(
            'API',
            'INFO',
            `Connected to MTC API — loaded ${busesData.length} live buses`,
            `Auto-selected Bus ${firstBus.number} (${firstBus.serviceType})`
          );
        }
      } catch (err: any) {
        if (!mounted) return;
        setApiError(err.message || 'Failed to reach MTC API server');
        setApiLoading(false);
      }
    }

    loadData();

    const refreshInterval = setInterval(loadData, 7000);
    return () => {
      mounted = false;
      clearInterval(refreshInterval);
    };
  }, [addLog]);

  const selectBus = useCallback(
    (bus: LiveBus) => {
      if (isPlaying) setIsPlaying(false);
      const route = routes.find((r) => r.id === bus.routeId) ?? routes[0];
      setSelectedBus(bus);
      setSelectedRoute(route);
      setSimStopIndex(0);
      setEtmOccupancy(bus.currentOccupancy);
      setCameraOccupancy(bus.currentOccupancy);
      setDiscrepancyCount(0);
      setRecon(null);
      setTotalBoardings(0);
      setTotalAlightings(0);
      setLogs([]);
      addLog(
        'API',
        'INFO',
        `Bus ${bus.number} selected — ${route ? `${route.origin} → ${route.destination}` : bus.serviceType}`,
        `Initial Occupancy: ${bus.currentOccupancy}/${bus.capacity} (${bus.crowding})`
      );
    },
    [isPlaying, routes, addLog]
  );

  const simulationStep = useCallback(async () => {
    if (!selectedBus || !selectedRoute) return;

    const nextIdx = (simStopIndex + 1) % selectedRoute.stops.length;
    const stop = selectedRoute.stops[nextIdx];

    const capacity = selectedBus.capacity;
    const maxBoard = Math.min(randomBetween(1, 8), capacity - etmOccupancy);
    const boardings = Math.max(0, maxBoard);
    const maxAlight = Math.min(randomBetween(0, 5), etmOccupancy);
    const alightings = Math.max(0, maxAlight);

    const newEtm = Math.max(0, Math.min(capacity, etmOccupancy + boardings - alightings));
    const camNoise = randomBetween(-1, 3);
    const newCam = Math.max(0, Math.min(capacity + 4, cameraOccupancy + boardings - alightings + camNoise));

    setSimStopIndex(nextIdx);
    setEtmOccupancy(newEtm);
    setCameraOccupancy(newCam);
    setTotalBoardings((p) => p + boardings);
    setTotalAlightings((p) => p + alightings);

    const delta = Math.abs(newCam - newEtm);
    const isDiscrep = delta > 2;
    const reconciledVal = isDiscrep ? Math.round((newEtm + newCam) / 2) : newEtm;
    const newRecon: ReconciliationState = {
      delta,
      status: isDiscrep ? 'CAMERA_VALUE_DIFFERENT' : 'NORMAL_MATCH',
      reconciledVal,
      etm: newEtm,
      cam: newCam,
    };
    setRecon(newRecon);
    if (isDiscrep) setDiscrepancyCount((p) => p + 1);

    try {
      await apiFetch('/feeds/etm', {
        method: 'POST',
        body: JSON.stringify({
          busId: selectedBus.number,
          stage: stop.name,
          occupancy: newEtm,
          boardings,
          alightings,
          timestamp: new Date().toISOString(),
        }),
      });
      addLog(
        'ETM',
        'SUCCESS',
        `Stage ${stop.sequence}: ${stop.name} — Ticket Issued: +${boardings}, Alighted: -${alightings}`,
        `Server occupancy updated → ${newEtm}/${capacity}`
      );
    } catch {
      addLog('ETM', 'ERROR', `ETM feed POST failed for stop: ${stop.name}`);
    }

    try {
      const camRes = await apiFetch('/feeds/camera', {
        method: 'POST',
        body: JSON.stringify({
          busId: selectedBus.number,
          cameraId: `CAM-DOOR-${selectedBus.number}-FRONT`,
          inCount: boardings,
          outCount: alightings,
          calculatedCamOccupancy: newCam,
          timestamp: new Date().toISOString(),
        }),
      });
      addLog(
        'CAMERA',
        isDiscrep ? 'DISCREPANCY' : 'SUCCESS',
        `Door CCTV AI — Optical In: +${boardings}, Out: -${alightings} | Count: ${newCam}`,
        `Reconciliation output: ${camRes.reconciledOccupancy ?? reconciledVal}`
      );
    } catch {
      addLog('CAMERA', 'ERROR', `Camera feed POST failed for stop: ${stop.name}`);
    }

    if (isDiscrep) {
      addLog(
        'RECONCILIATION',
        'DISCREPANCY',
        `⚠️ Tolerance Exceeded: |ETM ${newEtm} - Cam ${newCam}| = ${delta} > 2`,
        `Applied Fallback Mean: ${reconciledVal}`
      );
    } else {
      addLog(
        'RECONCILIATION',
        'SUCCESS',
        `✅ Synchronized: δ = ${delta} ≤ 2 tolerance. State synchronized: ${newEtm}`
      );
    }
  }, [selectedBus, selectedRoute, simStopIndex, etmOccupancy, cameraOccupancy, addLog]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isPlaying && selectedBus && selectedRoute) {
      timerRef.current = setInterval(() => {
        simulationStep();
      }, Math.round(4000 / speed));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, simulationStep, selectedBus, selectedRoute]);

  const injectTicketless = useCallback(async () => {
    if (!selectedBus || !selectedRoute) return;
    const extra = randomBetween(3, 5);
    const newCam = cameraOccupancy + extra;
    setCameraOccupancy(newCam);
    const stop = selectedRoute.stops[simStopIndex];
    addLog('CAMERA', 'DISCREPANCY', `⚡ TICKETLESS ANOMALY INJECTED: +${extra} passengers entered rear door at ${stop.name}`);

    const delta = Math.abs(newCam - etmOccupancy);
    const reconVal = Math.round((etmOccupancy + newCam) / 2);
    try {
      await apiFetch('/feeds/camera', {
        method: 'POST',
        body: JSON.stringify({
          busId: selectedBus.number,
          cameraId: `CAM-DOOR-${selectedBus.number}-REAR`,
          inCount: extra,
          outCount: 0,
          calculatedCamOccupancy: newCam,
          timestamp: new Date().toISOString(),
        }),
      });
      addLog(
        'RECONCILIATION',
        'DISCREPANCY',
        `⚠️ Discrepancy Alert Triggered: δ = ${delta} > 2. Server applying mean fallback (${reconVal})`,
        `Main MTC app on port 3000 updated live`
      );
    } catch {
      addLog('RECONCILIATION', 'ERROR', 'Failed to inject anomaly into API');
    }
    if (delta > 2) setDiscrepancyCount((p) => p + 1);
  }, [selectedBus, selectedRoute, simStopIndex, etmOccupancy, cameraOccupancy, addLog]);

  const injectSecurityAlert = useCallback(async () => {
    if (!selectedBus || !selectedRoute) return;
    const stop = selectedRoute.stops[simStopIndex];
    addLog('SECURITY', 'DISCREPANCY', `🚨 SECURITY AI ALERT: Suspicious hand-to-pocket pattern detected at ${stop.name}`);
    try {
      await apiFetch('/feeds/security-events', {
        method: 'POST',
        body: JSON.stringify({
          busId: selectedBus.number,
          cameraId: `CAM-CABIN-${selectedBus.number}-MAIN`,
          eventType: 'THEFT_SUSPECTED',
          location: stop.name,
          timestamp: new Date().toISOString(),
        }),
      });
      addLog('SECURITY', 'INFO', 'Alert dispatched to MTC Operator Console');
    } catch {
      addLog('SECURITY', 'ERROR', 'Security event dispatch failed');
    }
  }, [selectedBus, selectedRoute, simStopIndex, addLog]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (selectedBus) {
      setEtmOccupancy(selectedBus.currentOccupancy);
      setCameraOccupancy(selectedBus.currentOccupancy);
      setSimStopIndex(selectedBus.stopIndex ?? 0);
      setDiscrepancyCount(0);
      setRecon(null);
      setTotalBoardings(0);
      setTotalAlightings(0);
      addLog('API', 'INFO', `Reset simulation state for Bus ${selectedBus.number}`);
    }
  }, [selectedBus, addLog]);

  const filteredBuses = buses.filter((bus) => {
    if (routeFilter === 'ALL') return true;
    return bus.routeNumber === routeFilter || bus.routeId.includes(routeFilter.toLowerCase());
  });

  const currentStop = selectedRoute?.stops[simStopIndex];

  return (
    <div className="rounded-2xl bg-[#0b151c] text-slate-100 flex flex-col font-sans overflow-hidden border border-slate-800 shadow-2xl">
      <header className="bg-[#0f1b24]/90 border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/40">
            <Radio size={20} className={isPlaying ? 'animate-pulse text-slate-950' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg leading-none tracking-tight text-white">
                MTC SmartBus Telemetry Hub
              </h1>
              <span className="bg-amber-500/15 text-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
              <span>ETM & AI CCTV Door Sensor Feed Generator</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-medium">Synced with Live App Engine</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border font-mono transition-all ${
            apiError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            {apiError ? (
              <>
                <WifiOff size={14} className="text-rose-400" />
                <span>API Offline</span>
              </>
            ) : apiLoading ? (
              <>
                <Loader2 size={14} className="animate-spin text-emerald-400" />
                <span>Connecting…</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>API Live ({buses.length} buses)</span>
              </>
            )}
          </div>

          <div className="flex items-center bg-[#14232f] rounded-xl p-1 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono px-2 flex items-center gap-1">
              <SlidersHorizontal size={11} /> Speed
            </span>
            {[1, 2, 5].map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  speed === s
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsPlaying((p) => !p)}
            disabled={!selectedBus || apiLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold shadow-amber-500/20'
            }`}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            {isPlaying ? 'PAUSE SIMULATION' : 'START TELEMETRY STREAM'}
          </button>

          <button
            onClick={handleReset}
            disabled={!selectedBus}
            className="p-2 bg-[#14232f] hover:bg-slate-800 text-slate-300 rounded-xl transition-all border border-slate-800 disabled:opacity-40"
            title="Reset simulation parameters"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </header>

      <main className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-[#0f1b24] border border-slate-800 rounded-2xl p-4 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800/80">
              <h2 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Bus size={14} className="text-amber-400" />
                Live Fleet ({filteredBuses.length})
              </h2>
              <div className="flex items-center gap-1">
                <Filter size={12} className="text-slate-500" />
                <select
                  value={routeFilter}
                  onChange={(e) => setRouteFilter(e.target.value)}
                  className="bg-[#14232f] border border-slate-700 text-slate-300 text-[11px] font-mono rounded-lg px-2 py-1 outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Routes</option>
                  <option value="102">Route 102 (OMR)</option>
                  <option value="21G">Route 21G (GST)</option>
                  <option value="23C">Route 23C</option>
                  <option value="570">Route 570 (Volvo)</option>
                  <option value="500">Route 500</option>
                </select>
              </div>
            </div>

            {apiLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 size={28} className="animate-spin mb-3 text-amber-400" />
                <span className="text-xs font-mono">Fetching buses from MTC API…</span>
              </div>
            ) : apiError ? (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs font-mono">
                <strong className="block mb-1">API Disconnected</strong>
                <span>{apiError}</span>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto max-h-[500px] pr-1.5 flex-1">
                {filteredBuses.map((bus) => {
                  const route = routes.find((r) => r.id === bus.routeId);
                  const isSelected = selectedBus?.id === bus.id;
                  const crowdColor =
                    bus.crowding === 'Low' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                    bus.crowding === 'Moderate' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    bus.crowding === 'High' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                    'bg-rose-500/15 text-rose-400 border-rose-500/30';

                  return (
                    <button
                      key={bus.id}
                      onClick={() => selectBus(bus)}
                      disabled={isPlaying}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                          : 'bg-[#13222d]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#142532]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400 text-sm tracking-tight">
                            Bus {bus.number}
                          </span>
                          <span className="bg-slate-800/90 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700/60">
                            {bus.serviceType}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${crowdColor}`}>
                          {bus.crowding}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 truncate font-medium">
                        {route ? `${route.origin} → ${route.destination}` : bus.serviceType}
                      </div>

                      <div className="flex items-center justify-between mt-2 text-[11px] font-mono text-slate-400">
                        <span>Current Load:</span>
                        <span className="font-bold text-slate-200">
                          {bus.currentOccupancy} / {bus.capacity}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            bus.crowding === 'Low' ? 'bg-emerald-500' :
                            bus.crowding === 'Moderate' ? 'bg-amber-400' :
                            bus.crowding === 'High' ? 'bg-orange-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, (bus.currentOccupancy / bus.capacity) * 100)}%` }}
                        />
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1 border-t border-amber-500/20 pt-1.5">
                          <ChevronRight size={12} className="animate-pulse" />
                          <span>TARGETED FOR SIMULATION</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-[#0f1b24] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-500/15 p-2 rounded-xl border border-amber-500/30 text-amber-400">
                  <Activity size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Bus {selectedBus?.number ?? '—'} Telemetry Target</span>
                    {selectedBus && (
                      <span className="text-[11px] font-mono font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {selectedBus.serviceType}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedRoute ? `${selectedRoute.origin} ↔ ${selectedRoute.destination}` : 'Select a bus'}
                  </p>
                </div>
              </div>

              {currentStop && (
                <span className="text-xs font-mono bg-teal-500/15 text-teal-300 px-3 py-1 rounded-full border border-teal-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                  At: {currentStop.name}
                </span>
              )}
            </div>

            {!selectedRoute ? (
              <div className="text-center py-12 text-slate-500 text-xs font-mono">
                Select a bus from the left fleet panel to initialize telemetry stream
              </div>
            ) : (
              <>
                <div className="relative py-4 my-2 flex items-start justify-between px-2 overflow-x-auto gap-2">
                  <div className="absolute top-[28px] left-4 right-4 h-0.5 bg-slate-800 z-0" />
                  {selectedRoute.stops.map((stop, idx) => {
                    const isCurrent = idx === simStopIndex;
                    const isPassed = idx < simStopIndex;
                    return (
                      <div key={stop.id} className="relative z-10 flex flex-col items-center min-w-[56px]">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all ${
                            isCurrent
                              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 ring-4 ring-amber-500/20 scale-110'
                              : isPassed
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {stop.sequence}
                        </div>
                        <span
                          className={`text-[10px] mt-2 max-w-[60px] text-center font-medium leading-tight ${
                            isCurrent ? 'text-amber-400 font-bold' : isPassed ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {stop.name}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3.5 mt-4">
                  <div className="bg-[#13222d] border border-blue-500/20 p-4 rounded-xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono mb-2">
                      <span className="flex items-center gap-1.5 font-bold text-blue-400">
                        <Ticket size={14} /> ETM Hardware Feed
                      </span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20">
                        Ticket POS
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      {etmOccupancy}
                      <span className="text-xs font-mono font-normal text-slate-500 ml-1.5">
                        / {selectedBus?.capacity} cap
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (etmOccupancy / (selectedBus?.capacity ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-[#13222d] border border-purple-500/20 p-4 rounded-xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-slate-300 font-mono mb-2">
                      <span className="flex items-center gap-1.5 font-bold text-purple-400">
                        <Video size={14} /> Door AI CCTV Sensor
                      </span>
                      <span className="text-[10px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">
                        Optical Counter
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      {cameraOccupancy}
                      <span className="text-xs font-mono font-normal text-slate-500 ml-1.5">
                        / {selectedBus?.capacity} cap
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (cameraOccupancy / (selectedBus?.capacity ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-3.5 text-center font-mono">
                  <div className="bg-[#13222d] border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Boarded</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">+{totalBoardings}</div>
                  </div>
                  <div className="bg-[#13222d] border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Alighted</div>
                    <div className="text-base font-bold text-rose-400 mt-0.5">-{totalAlightings}</div>
                  </div>
                  <div className="bg-[#13222d] border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Discrepancies</div>
                    <div className={`text-base font-bold mt-0.5 ${discrepancyCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {discrepancyCount}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#0f1b24] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider mb-3 flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              Manual Hardware Anomaly Console
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={injectTicketless}
                disabled={!selectedBus}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group text-left"
              >
                <div className="bg-amber-500/20 p-2 rounded-lg text-amber-400 group-hover:scale-105 transition-all">
                  <UserPlus size={16} />
                </div>
                <div>
                  <div className="font-bold text-white">Ticketless Entry</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">+3-5 door entry without ETM</div>
                </div>
              </button>

              <button
                onClick={injectSecurityAlert}
                disabled={!selectedBus}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed group text-left"
              >
                <div className="bg-rose-500/20 p-2 rounded-lg text-rose-400 group-hover:scale-105 transition-all">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <div className="font-bold text-white">Theft AI Security Event</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Post alert to Operator Console</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-5">
          <div className="bg-[#0f1b24] border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h2 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider mb-3 flex items-center gap-1.5">
              <Layers size={14} className="text-amber-400" />
              Server ±2 Tolerance Reconciliation
            </h2>

            {!recon ? (
              <div className="text-center py-6 text-slate-500 text-xs font-mono">
                Start simulation to observe real-time server reconciliation
              </div>
            ) : (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                  recon.status === 'CAMERA_VALUE_DIFFERENT'
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                }`}
              >
                {recon.status === 'CAMERA_VALUE_DIFFERENT' ? (
                  <AlertTriangle size={22} className="text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div className="font-mono text-xs">
                  <div className="font-bold text-sm tracking-tight text-white mb-0.5">{recon.status}</div>
                  <div className="opacity-90 leading-relaxed">
                    {recon.status === 'CAMERA_VALUE_DIFFERENT' ? (
                      <>
                        Variance δ = <strong>{recon.delta}</strong> &gt; 2. Fallback mean applied:{' '}
                        <strong className="text-amber-400 font-bold">{recon.reconciledVal}</strong>
                      </>
                    ) : (
                      <>
                        Variance δ = <strong>{recon.delta}</strong> ≤ 2. Accepted occupancy:{' '}
                        <strong className="text-emerald-400 font-bold">{recon.reconciledVal}</strong>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2 border-t border-slate-800/60 pt-1.5">
                    <span>ETM Count: {recon.etm}</span>
                    <span>•</span>
                    <span>Camera Count: {recon.cam}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#0f1b24] border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col min-h-[360px]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
              <h2 className="text-xs font-mono font-bold uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Radio size={14} className="text-emerald-400" />
                Live Telemetry Event Log Stream
              </h2>
              <span className="text-[10px] font-mono text-slate-500">{logs.length} events</span>
            </div>

            <div className="flex-1 bg-[#091117] border border-slate-800/90 rounded-xl p-3 font-mono text-xs overflow-y-auto space-y-2.5 max-h-[460px]">
              {logs.length === 0 ? (
                <div className="text-slate-600 text-center py-16 text-xs italic">
                  No telemetry logged yet. Select a bus and click "Start Telemetry Stream".
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-slate-800/60 pb-2 last:border-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-slate-500 text-[10px]">{log.ts}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          log.type === 'ETM' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          log.type === 'CAMERA' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          log.type === 'SECURITY' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          log.type === 'API' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {log.type}
                      </span>
                    </div>

                    <p
                      className={`text-[11px] leading-snug ${
                        log.status === 'DISCREPANCY' ? 'text-amber-300 font-semibold' :
                        log.status === 'ERROR' ? 'text-rose-300' :
                        'text-slate-300'
                      }`}
                    >
                      {log.msg}
                    </p>

                    {log.detail && (
                      <p className="text-slate-500 text-[10px] mt-0.5 truncate">{log.detail}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function SimulatorPage() {
  return (
    <AppShell>
      <SimulatorComponent />
    </AppShell>
  );
}
