import { Router, type IRouter } from "express";
import {
  GetBusQueryParams,
  GetOperatorBusQueryParams,
  GetRouteQueryParams,
  GetRouteStopsQueryParams,
  GetStopQueryParams,
  GetStopsQueryParams,
} from "@workspace/api-zod";

type Crowding = "Low" | "Moderate" | "High" | "Very high";
type BusStatus = "LIVE" | "DELAYED" | "UNAVAILABLE";

type Stop = {
  id: string;
  name: string;
  sequence: number;
  latitude: number;
  longitude: number;
  routes: string[];
};

type Route = {
  id: string;
  routeNumber: string;
  origin: string;
  destination: string;
  serviceType: string;
  liveTracking: boolean;
  stops: Stop[];
};

type BusSummary = {
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
  crowding: Crowding;
  status: BusStatus;
  lastUpdatedSeconds: number;
};

type BusState = {
  occupancy: number;
  stopIndex: number;
  entries: number;
  exits: number;
  tick: number;
  updatedAt: string;
};

const routeStops: Stop[] = [
  { id: "island-ground", name: "Island Ground", sequence: 1, latitude: 13.0758, longitude: 80.2862, routes: ["102"] },
  { id: "secretariat", name: "Secretariat", sequence: 2, latitude: 13.0718, longitude: 80.2797, routes: ["102"] },
  { id: "chepauk", name: "Chepauk", sequence: 3, latitude: 13.0634, longitude: 80.2792, routes: ["102"] },
  { id: "qmc", name: "Q.M.C", sequence: 4, latitude: 13.0506, longitude: 80.2676, routes: ["102"] },
  { id: "foreshore-estate", name: "Foreshore Estate", sequence: 5, latitude: 13.0334, longitude: 80.2738, routes: ["102"] },
  { id: "adyar-ot", name: "Adyar O.T.", sequence: 6, latitude: 13.0065, longitude: 80.2561, routes: ["102", "21G", "23C"] },
  { id: "indira-nagar", name: "Indira Nagar", sequence: 7, latitude: 12.9986, longitude: 80.2567, routes: ["102"] },
  { id: "srp-tools", name: "SRP Tools", sequence: 8, latitude: 12.9842, longitude: 80.2464, routes: ["102"] },
  { id: "kandanchavadi", name: "Kandanchavadi", sequence: 9, latitude: 12.9632, longitude: 80.2448, routes: ["102"] },
  { id: "sholinganallur", name: "Sholinganallur", sequence: 10, latitude: 12.901, longitude: 80.2279, routes: ["102"] },
  { id: "kelambakkam", name: "Kelambakkam", sequence: 11, latitude: 12.7876, longitude: 80.2191, routes: ["102"] },
];

const routes: Route[] = [
  {
    id: "route-102",
    routeNumber: "102",
    origin: "Island Ground",
    destination: "Kelambakkam",
    serviceType: "Express",
    liveTracking: true,
    stops: routeStops,
  },
  {
    id: "route-21g",
    routeNumber: "21G",
    origin: "Tambaram",
    destination: "Broadway",
    serviceType: "Ordinary",
    liveTracking: true,
    stops: [
      { id: "tambaram", name: "Tambaram", sequence: 1, latitude: 12.9249, longitude: 80.100, routes: ["21G"] },
      { id: "guindy", name: "Guindy", sequence: 2, latitude: 13.0067, longitude: 80.2206, routes: ["21G"] },
      routeStops[5],
      { id: "saidapet", name: "Saidapet", sequence: 4, latitude: 13.0228, longitude: 80.2231, routes: ["21G"] },
      { id: "broadway", name: "Broadway", sequence: 5, latitude: 13.0878, longitude: 80.2853, routes: ["21G"] },
    ],
  },
  {
    id: "route-23c",
    routeNumber: "23C",
    origin: "Adyar",
    destination: "Central",
    serviceType: "Deluxe",
    liveTracking: true,
    stops: [
      { id: "adyar-depot", name: "Adyar Depot", sequence: 1, latitude: 13.0012, longitude: 80.2565, routes: ["23C"] },
      routeStops[5],
      { id: "mylapore", name: "Mylapore", sequence: 3, latitude: 13.0339, longitude: 80.2671, routes: ["23C"] },
      { id: "central", name: "Chennai Central", sequence: 4, latitude: 13.0827, longitude: 80.2707, routes: ["23C"] },
    ],
  },
];

const buses = [
  { id: "bus-102", number: "102", routeId: "route-102", serviceType: "Express", capacity: 52, stopIndex: 5, occupancy: 32 },
  { id: "bus-21g", number: "21G", routeId: "route-21g", serviceType: "Ordinary", capacity: 48, stopIndex: 1, occupancy: 41 },
  { id: "bus-23c", number: "23C", routeId: "route-23c", serviceType: "Deluxe", capacity: 44, stopIndex: 1, occupancy: 23 },
  { id: "bus-70c", number: "70C", routeId: "route-102", serviceType: "Ordinary", capacity: 52, stopIndex: 3, occupancy: 51 },
  { id: "bus-18d", number: "18D", routeId: "route-21g", serviceType: "E/V Deluxe", capacity: 52, stopIndex: 0, occupancy: 18 },
  { id: "bus-5e", number: "5E", routeId: "route-23c", serviceType: "Pink", capacity: 46, stopIndex: 2, occupancy: 36 },
];

const state = new Map<string, BusState>(
  buses.map((bus) => [
    bus.id,
    {
      occupancy: bus.occupancy,
      stopIndex: bus.stopIndex,
      entries: 4,
      exits: 2,
      tick: 0,
      updatedAt: new Date().toISOString(),
    },
  ]),
);

const securityEvents = [
  {
    id: "security-102-1",
    busNumber: "102",
    location: "Adyar",
    time: "10:42 AM",
    eventType: "Potential suspicious interaction",
    confidence: 87,
    status: "Under review",
    source: "CCTV camera 02",
  },
  {
    id: "security-21g-1",
    busNumber: "21G",
    location: "Guindy",
    time: "10:36 AM",
    eventType: "Hand-to-bag interaction",
    confidence: 72,
    status: "Acknowledged",
    source: "CCTV camera 01",
  },
];

const operatorRouter: IRouter = Router();
const publicRouter: IRouter = Router();

function routeFor(id: string) {
  return routes.find((route) => route.id === id) ?? routes[0];
}

function getBusState(busId: string) {
  return state.get(busId) ?? state.get("bus-102")!;
}

function crowdingFor(occupancy: number, capacity: number): Crowding {
  const ratio = occupancy / capacity;
  if (ratio < 0.35) return "Low";
  if (ratio < 0.65) return "Moderate";
  if (ratio < 0.88) return "High";
  return "Very high";
}

function stopForecast(bus: (typeof buses)[number], targetStopId?: string) {
  const route = routeFor(bus.routeId);
  const busState = getBusState(bus.id);
  const target = route.stops.find((stop) => stop.id === targetStopId) ?? route.stops[Math.min(busState.stopIndex + 4, route.stops.length - 1)];
  const distance = Math.max(0, target.sequence - route.stops[busState.stopIndex].sequence);
  const expectedAlighting = Math.min(Math.max(1, Math.round(distance * 0.8)), Math.max(1, busState.occupancy - 4));
  return Math.max(4, busState.occupancy - expectedAlighting + Math.round(Math.sin(busState.tick / 2)));
}

function busSummary(bus: (typeof buses)[number]): BusSummary {
  const route = routeFor(bus.routeId);
  const busState = getBusState(bus.id);
  const stop = route.stops[busState.stopIndex] ?? route.stops[0];
  const predicted = stopForecast(bus);
  return {
    id: bus.id,
    number: bus.number,
    routeId: bus.routeId,
    routeNumber: route.routeNumber,
    origin: route.origin,
    destination: route.destination,
    serviceType: bus.serviceType,
    currentLocation: stop.name,
    etaMinutes: Math.max(3, 4 + (busState.tick % 4)),
    currentOccupancy: busState.occupancy,
    predictedOccupancy: predicted,
    capacity: bus.capacity,
    crowding: crowdingFor(busState.occupancy, bus.capacity),
    status: "LIVE",
    lastUpdatedSeconds: Math.max(3, Math.floor((Date.now() - new Date(busState.updatedAt).getTime()) / 1000)),
  };
}

function busDetails(bus: (typeof buses)[number], targetStopId?: string) {
  const route = routeFor(bus.routeId);
  const busState = getBusState(bus.id);
  const summary = busSummary(bus);
  const target = route.stops.find((stop) => stop.id === targetStopId) ?? route.stops[Math.min(busState.stopIndex + 4, route.stops.length - 1)];
  const targetIndex = route.stops.findIndex((stop) => stop.id === target.id);
  const currentIndex = busState.stopIndex;
  const predictedAtTarget = stopForecast(bus, target.id);
  return {
    ...summary,
    predictedOccupancy: predictedAtTarget,
    targetStop: target,
    nextStops: route.stops.slice(currentIndex, Math.min(route.stops.length, currentIndex + 5)).map((stop, index) => ({
      stop,
      etaMinutes: index * 3 + 2,
      predictedOccupancy: Math.max(4, busState.occupancy - Math.max(0, stop.sequence - route.stops[currentIndex].sequence) + Math.round(Math.sin((busState.tick + index) / 2))),
    })),
    gps: {
      latitude: route.stops[currentIndex].latitude,
      longitude: route.stops[currentIndex].longitude,
      speed: 22 + (busState.tick % 8),
      heading: currentIndex < route.stops.length - 1 ? 125 : 300,
      timestamp: busState.updatedAt,
    },
    flow: {
      entriesRecent: busState.entries,
      exitsRecent: busState.exits,
      timestamp: busState.updatedAt,
      source: "Onboard CCTV edge model",
    },
    forecastConfidence: targetIndex - currentIndex > 5 ? "Moderate" : "Good",
    forecastUpdatedAt: busState.updatedAt,
    predictedOccupancyAtTarget: predictedAtTarget,
  };
}

function parseQuery<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T } }, value: unknown) {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function advanceDemo() {
  for (const bus of buses) {
    const busState = getBusState(bus.id);
    busState.tick += 1;
    const delta = busState.tick % 4 === 0 ? 2 : busState.tick % 3 === 0 ? -1 : 0;
    busState.occupancy = Math.min(bus.capacity - 1, Math.max(4, busState.occupancy + delta));
    busState.entries = delta > 0 ? delta + 1 : delta === 0 ? 1 : 0;
    busState.exits = delta < 0 ? Math.abs(delta) + 1 : delta === 0 ? 1 : 0;
    if (busState.tick % 3 === 0) busState.stopIndex = (busState.stopIndex + 1) % routeFor(bus.routeId).stops.length;
    busState.updatedAt = new Date().toISOString();
  }
}

setInterval(advanceDemo, 7000);

publicRouter.get("/routes", (_req, res) => res.json(routes));

publicRouter.get("/route", (req, res) => {
  const query = parseQuery(GetRouteQueryParams, req.query);
  const route = routes.find((item) => item.id === query?.routeId);
  return route ? res.json(route) : res.status(404).json({ error: "Route information unavailable" });
});

publicRouter.get("/route/stops", (req, res) => {
  const query = parseQuery(GetRouteStopsQueryParams, req.query);
  const route = routes.find((item) => item.id === query?.routeId);
  return route ? res.json(route.stops) : res.status(404).json({ error: "Route stops unavailable" });
});

publicRouter.get("/buses", (req, res) => {
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const routeId = String(req.query.routeId ?? "").trim();
  const result = buses
    .map(busSummary)
    .filter((bus) => !routeId || bus.routeId === routeId)
    .filter((bus) => !search || `${bus.number} ${bus.routeNumber} ${bus.origin} ${bus.destination} ${bus.currentLocation}`.toLowerCase().includes(search));
  res.json(result);
});

publicRouter.get("/bus", (req, res) => {
  const query = parseQuery(GetBusQueryParams, req.query);
  const bus = buses.find((item) => item.id === query?.busId);
  return bus ? res.json(busDetails(bus, query?.targetStopId)) : res.status(404).json({ error: "Bus information unavailable" });
});

publicRouter.get("/stops", (req, res) => {
  const query = parseQuery(GetStopsQueryParams, req.query);
  const search = query?.search?.trim().toLowerCase();
  const allStops = Array.from(new Map(routes.flatMap((route) => route.stops).map((stop) => [stop.id, stop])).values());
  res.json(search ? allStops.filter((stop) => stop.name.toLowerCase().includes(search)) : allStops);
});

publicRouter.get("/stop", (req, res) => {
  const query = parseQuery(GetStopQueryParams, req.query);
  const allStops = routes.flatMap((route) => route.stops);
  const stop = allStops.find((item) => item.id === query?.stopId);
  if (!stop) return res.status(404).json({ error: "Stop information unavailable" });
  return res.json({
    stop,
    routes: stop.routes,
    upcomingBuses: buses.map(busSummary).filter((bus) => bus.routeId && routeFor(bus.routeId).stops.some((item) => item.id === stop.id)).slice(0, 4),
  });
});

operatorRouter.get("/overview", (_req, res) => {
  const fleet = buses.map(busSummary);
  return res.json({
    activeBuses: fleet.length,
    liveTrackedBuses: fleet.filter((bus) => bus.status === "LIVE").length,
    highOccupancyBuses: fleet.filter((bus) => bus.crowding === "High" || bus.crowding === "Very high").length,
    mediumOccupancyBuses: fleet.filter((bus) => bus.crowding === "Moderate").length,
    lowOccupancyBuses: fleet.filter((bus) => bus.crowding === "Low").length,
    forecastAlerts: 3,
    securityAlerts: securityEvents.filter((event) => event.status === "Under review").length,
    dataQualityIssues: 2,
    updatedAt: new Date().toISOString(),
    fleet,
  });
});

operatorRouter.get("/bus", (req, res) => {
  const query = parseQuery(GetOperatorBusQueryParams, req.query);
  const bus = buses.find((item) => item.id === query?.busId);
  if (!bus) return res.status(404).json({ error: "Operator bus information unavailable" });
  const details = busDetails(bus);
  const busState = getBusState(bus.id);
  return res.json({
    ...details,
    reconciledOccupancy: Math.max(4, details.currentOccupancy + 2),
    reconciliationStatus: "Reconciled 2 min ago",
    etmTimeline: [
      { time: "10:02", quantity: 3, destinationStage: "Adyar O.T.", status: "Processed" },
      { time: "10:04", quantity: 2, destinationStage: "SRP Tools", status: "Processed" },
      { time: "10:07", quantity: 5, destinationStage: "Sholinganallur", status: "Pending / received" },
    ],
    occupancyTimeline: [
      { time: "10:14", camera: Math.max(4, busState.occupancy - 4), reconciled: null },
      { time: "10:18", camera: Math.max(4, busState.occupancy - 2), reconciled: null },
      { time: "10:22", camera: busState.occupancy, reconciled: Math.max(4, busState.occupancy + 2) },
      { time: "10:26", camera: busState.occupancy, reconciled: null },
    ],
  });
});

operatorRouter.get("/security-events", (_req, res) => res.json(securityEvents));

export { publicRouter as smartbusPublicRouter, operatorRouter as smartbusOperatorRouter };