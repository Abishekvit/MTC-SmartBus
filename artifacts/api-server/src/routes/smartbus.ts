import { timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import {
  GetBusQueryParams,
  GetOperatorBusQueryParams,
  GetRouteQueryParams,
  GetRouteStopsQueryParams,
  GetSecurityInvestigationQueryParams,
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

type SecurityEventStatus = "Under review" | "Acknowledged" | "Escalated" | "Dismissed";
type SecurityReviewAction = "acknowledge" | "escalate" | "dismiss";
type SecurityEventStepState = "complete" | "active" | "pending";
type SecurityReviewAudit = {
  id: string;
  eventId: string;
  action: SecurityReviewAction;
  fromStatus: SecurityEventStatus;
  toStatus: SecurityEventStatus;
  operatorId: string;
  operatorRole: "operator";
  note?: string;
  timestamp: string;
};
type EtmEvent = {
  time: string;
  timestamp: string;
  busNumber: string;
  quantity: number;
  boardingStop: string;
  currentStop: string;
  passengerCount: number;
  destinationStage: string;
  status: string;
  source: string;
};
type OccupancyPoint = {
  time: string;
  camera: number;
  reconciled: number | null;
  source: string;
};
type SecurityEventRecord = {
  id: string;
  busNumber: string;
  location: string;
  physicalStop: string;
  latitude: number;
  longitude: number;
  time: string;
  timestamp: string;
  eventType: string;
  confidence: number;
  status: SecurityEventStatus;
  statusDetail: string;
  source: string;
  personTrackId: string;
  objectId: string;
  objectType: string;
  interactionType: string;
  timeline: Array<{ time: string; label: string; detail: string; state: SecurityEventStepState }>;
  etmContext: {
    transactionId: string;
    timestamp: string;
    boardingStop: string;
    currentStop: string;
    passengerCount: number;
    destinationStop: string;
  };
  reviewHistory: SecurityReviewAudit[];
};

type FeedMode = "provider" | "demo";
type FeedConfig = {
  mode: FeedMode;
  name: "camera" | "etm";
  url?: string;
  token?: string;
  label: string;
};
type JsonRecord = Record<string, unknown>;

class ProviderFeedError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502,
  ) {
    super(message);
    this.name = "ProviderFeedError";
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function arrayFromPayload(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) throw new ProviderFeedError("MTC provider returned an invalid JSON payload");
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  throw new ProviderFeedError(`MTC provider payload is missing ${keys[0]}`);
}

function feedConfig(name: FeedConfig["name"]): FeedConfig {
  const mode = process.env.SMARTBUS_FEED_MODE === "provider" ? "provider" : "demo";
  const prefix = name === "camera" ? "MTC_CAMERA_FEED" : "MTC_ETM_FEED";
  const url = process.env[`${prefix}_URL`]?.trim();
  const token = (process.env[`${prefix}_TOKEN`] || process.env.MTC_PROVIDER_TOKEN)?.trim();
  const hasCredentials = Boolean(url && token);

  return {
    name,
    mode: hasCredentials ? "provider" : mode === "provider" ? "provider" : "demo",
    ...(url ? { url } : {}),
    ...(token ? { token } : {}),
    label: name === "camera" ? "MTC authorized camera feed" : "MTC authorized ETM feed",
  };
}

function feedSource(config: FeedConfig, detail: string) {
  return config.mode === "provider" ? `${config.label} · ${detail}` : `DEMO FALLBACK · simulated ${detail}`;
}

function providerConfigError(config: FeedConfig) {
  if (config.url && !config.token) {
    return "MTC provider URL is configured without an access token";
  }
  return `MTC ${config.name} provider credentials are not configured`;
}

async function fetchProviderJson(config: FeedConfig, query: Record<string, string> = {}) {
  if (config.mode !== "provider" || !config.url || !config.token) {
    throw new ProviderFeedError(providerConfigError(config), 503);
  }

  const endpoint = new URL(config.url);
  for (const [key, value] of Object.entries(query)) endpoint.searchParams.set(key, value);

  let response: globalThis.Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      signal: AbortSignal.timeout(Math.min(Math.max(Number(process.env.SMARTBUS_FEED_TIMEOUT_MS) || 8000, 1000), 30000)),
    });
  } catch (error) {
    throw new ProviderFeedError(`${config.label} request failed: ${error instanceof Error ? error.message : "network error"}`);
  }

  if (!response.ok) {
    throw new ProviderFeedError(`${config.label} returned HTTP ${response.status}`);
  }

  try {
    return await response.json() as unknown;
  } catch {
    throw new ProviderFeedError(`${config.label} returned invalid JSON`);
  }
}

function normalizeSecurityEvent(input: unknown, index: number, config: FeedConfig): SecurityEventRecord {
  if (!isRecord(input)) throw new ProviderFeedError("MTC camera payload contains an invalid event");
  const context = isRecord(input.etmContext) ? input.etmContext : {};
  const timeline = Array.isArray(input.timeline)
    ? input.timeline.filter(isRecord).map((step) => ({
      time: stringValue(step.time, "Unavailable"),
      label: stringValue(step.label, "Observed activity"),
      detail: stringValue(step.detail, "Provider supplied event activity"),
      state: (step.state === "complete" || step.state === "active" || step.state === "pending" ? step.state : "complete") as SecurityEventStepState,
    }))
    : [];
  const confidence = numberValue(input.confidence, 0);
  const eventId = stringValue(input.id ?? input.eventId, `provider-security-event-${index + 1}`);
  const busNumber = stringValue(input.busNumber ?? input.busNo);
  if (!busNumber || confidence < 0 || confidence > 100) {
    throw new ProviderFeedError("MTC camera payload contains an invalid event identity or confidence");
  }

  return {
    id: eventId,
    busNumber,
    location: stringValue(input.location ?? input.locationName, "Unavailable"),
    physicalStop: stringValue(input.physicalStop ?? input.stopName, "Unavailable"),
    latitude: numberValue(input.latitude ?? input.lat),
    longitude: numberValue(input.longitude ?? input.lng ?? input.lon),
    time: stringValue(input.time, "Unavailable"),
    timestamp: stringValue(input.timestamp, new Date().toISOString()),
    eventType: stringValue(input.eventType ?? input.type, "Provider security event"),
    confidence: Math.round(confidence),
    status: (input.status === "Acknowledged" || input.status === "Escalated" || input.status === "Dismissed" ? input.status : "Under review") as SecurityEventStatus,
    statusDetail: stringValue(input.statusDetail, "AI-generated potential security event; operator review required"),
    source: feedSource(config, stringValue(input.source, "camera event")),
    personTrackId: stringValue(input.personTrackId ?? input.trackId, `track-${index + 1}`),
    objectId: stringValue(input.objectId, `object-${index + 1}`),
    objectType: stringValue(input.objectType, "object"),
    interactionType: stringValue(input.interactionType, "Provider supplied interaction"),
    timeline,
    etmContext: {
      transactionId: stringValue(context.transactionId ?? input.transactionId, "Unavailable"),
      timestamp: stringValue(context.timestamp ?? input.timestamp, new Date().toISOString()),
      boardingStop: stringValue(context.boardingStop ?? input.boardingStop, "Unavailable"),
      currentStop: stringValue(context.currentStop ?? input.currentStop, "Unavailable"),
      passengerCount: Math.max(0, Math.round(numberValue(context.passengerCount ?? input.passengerCount))),
      destinationStop: stringValue(context.destinationStop ?? context.destinationStage ?? input.destinationStop, "Unavailable"),
    },
    reviewHistory: [],
  };
}

function normalizeEtmEvent(input: unknown, index: number, config: FeedConfig): EtmEvent {
  if (!isRecord(input)) throw new ProviderFeedError("MTC ETM payload contains an invalid event");
  const busNumber = stringValue(input.busNumber ?? input.busNo);
  if (!busNumber) throw new ProviderFeedError("MTC ETM payload contains an event without a bus number");
  return {
    time: stringValue(input.time, "Unavailable"),
    timestamp: stringValue(input.timestamp, new Date().toISOString()),
    busNumber,
    quantity: Math.max(0, Math.round(numberValue(input.quantity))),
    boardingStop: stringValue(input.boardingStop, "Unavailable"),
    currentStop: stringValue(input.currentStop, "Unavailable"),
    passengerCount: Math.max(0, Math.round(numberValue(input.passengerCount))),
    destinationStage: stringValue(input.destinationStage ?? input.destinationStop, "Unavailable"),
    status: stringValue(input.status, "Processed"),
    source: feedSource(config, stringValue(input.source, `ETM event ${index + 1}`)),
  };
}

const cameraFeed = feedConfig("camera");
const etmFeed = feedConfig("etm");

async function providerSecurityEvents() {
  const payload = await fetchProviderJson(cameraFeed);
  return arrayFromPayload(payload, ["events", "securityEvents"])
    .map((event, index) => normalizeSecurityEvent(event, index, cameraFeed));
}

async function providerOccupancyTimeline(busNumber: string): Promise<OccupancyPoint[]> {
  const payload = await fetchProviderJson(cameraFeed, { busNumber });
  if (!isRecord(payload) || !Array.isArray(payload.occupancyTimeline ?? payload.occupancy)) return [];
  const points = (payload.occupancyTimeline ?? payload.occupancy) as unknown[];
  return points.filter(isRecord).map((point) => ({
    time: stringValue(point.time, "Unavailable"),
    camera: Math.max(0, Math.round(numberValue(point.camera ?? point.occupancy))),
    reconciled: typeof point.reconciled === "number" ? Math.round(point.reconciled) : null,
    source: feedSource(cameraFeed, "occupancy timeline"),
  }));
}

async function providerEtmEvents(busNumber: string) {
  const payload = await fetchProviderJson(etmFeed, { busNumber });
  return arrayFromPayload(payload, ["events", "etmEvents"])
    .map((event, index) => normalizeEtmEvent(event, index, etmFeed))
    .filter((event) => event.busNumber === busNumber);
}

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

const securityEvents: SecurityEventRecord[] = [
  {
    id: "security-102-1",
    busNumber: "102",
    location: "Adyar",
    physicalStop: "Adyar O.T.",
    latitude: 13.0065,
    longitude: 80.2561,
    time: "10:42 AM",
    timestamp: "2026-09-16T10:42:00+05:30",
    eventType: "Potential theft pattern",
    confidence: 87,
    status: "Under review",
    statusDetail: "DEMO FALLBACK · AI-generated potential security event; operator review required",
    reviewHistory: [],
    source: "DEMO FALLBACK · simulated CCTV camera 02 · edge model",
    personTrackId: "P03",
    objectId: "O02",
    objectType: "bag",
    interactionType: "Approach → hand-to-pocket → bag contact",
    timeline: [
      { time: "10:41:48", label: "Approach", detail: "Person P03 moves within interaction range of O02.", state: "complete" },
      { time: "10:41:54", label: "Hand movement", detail: "Hand-to-pocket motion detected.", state: "complete" },
      { time: "10:42:00", label: "Object contact", detail: "P03 appears to contact bag O02.", state: "active" },
      { time: "10:42:06", label: "Separation", detail: "Awaiting operator confirmation of object displacement.", state: "pending" },
    ],
    etmContext: {
      transactionId: "ETM-102-1042-03",
      timestamp: "2026-09-16T10:42:00+05:30",
      boardingStop: "Adyar O.T.",
      currentStop: "Adyar O.T.",
      passengerCount: 32,
      destinationStop: "Sholinganallur",
    },
  },
  {
    id: "security-21g-1",
    busNumber: "21G",
    location: "Guindy",
    physicalStop: "Guindy",
    latitude: 13.0067,
    longitude: 80.2206,
    time: "10:36 AM",
    timestamp: "2026-09-16T10:36:00+05:30",
    eventType: "Object displacement",
    confidence: 72,
    status: "Acknowledged",
    statusDetail: "DEMO FALLBACK · reviewed as a simulated bag movement; no confirmed theft",
    reviewHistory: [],
    source: "DEMO FALLBACK · simulated CCTV camera 01 · edge model",
    personTrackId: "P07",
    objectId: "O04",
    objectType: "phone",
    interactionType: "Grabbing → rapid withdrawal → object movement",
    timeline: [
      { time: "10:35:42", label: "Approach", detail: "P07 enters the tracked interaction zone.", state: "complete" },
      { time: "10:35:49", label: "Interaction", detail: "Short grabbing motion detected near O04.", state: "complete" },
      { time: "10:35:53", label: "Object movement", detail: "O04 position changes by 0.6 metres.", state: "complete" },
      { time: "10:36:00", label: "Separation", detail: "No identity or facial signal retained.", state: "active" },
    ],
    etmContext: {
      transactionId: "ETM-21G-1036-02",
      timestamp: "2026-09-16T10:36:00+05:30",
      boardingStop: "Tambaram",
      currentStop: "Guindy",
      passengerCount: 41,
      destinationStop: "Broadway",
    },
  },
];

const operatorRouter: IRouter = Router();
const publicRouter: IRouter = Router();
let securityEventCacheVersion = 1;

async function refreshSecurityEventsFromProvider() {
  if (cameraFeed.mode !== "provider") return;
  const incoming = await providerSecurityEvents();
  const currentById = new Map(securityEvents.map((event) => [event.id, event]));
  securityEvents.splice(
    0,
    securityEvents.length,
    ...incoming.map((event) => {
      const current = currentById.get(event.id);
      return current
        ? { ...event, status: current.status, statusDetail: current.statusDetail, reviewHistory: current.reviewHistory }
        : event;
    }),
  );
  invalidateSecurityEventCache();
}

function providerError(res: Response, error: unknown) {
  const statusCode = error instanceof ProviderFeedError ? error.statusCode : 502;
  const message = error instanceof Error ? error.message : "MTC provider feed unavailable";
  res.status(statusCode).json({ error: message });
}

const statusForReviewAction: Record<SecurityReviewAction, SecurityEventStatus> = {
  acknowledge: "Acknowledged",
  escalate: "Escalated",
  dismiss: "Dismissed",
};

function invalidateSecurityEventCache() {
  securityEventCacheVersion += 1;
}

function operatorTokenMatches(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function requireOperator(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header("authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const configuredToken = process.env.SMARTBUS_OPERATOR_TOKEN;
  const demoToken = process.env.NODE_ENV === "production" ? "" : "demo-operator-token";
  const expectedToken = configuredToken || demoToken;

  if (!bearerToken || !expectedToken || !operatorTokenMatches(bearerToken, expectedToken)) {
    res.status(401).json({ error: "Authenticated operator access is required" });
    return;
  }

  const operatorId = req.header("x-operator-id")?.trim() || "demo-operator";
  res.locals.operator = { id: operatorId.slice(0, 80), role: "operator" as const };
  next();
}

function findRoute(identifier?: string): Route | undefined {
  if (!identifier) return undefined;
  const raw = identifier.trim().toLowerCase();
  const clean = raw.replace(/^route-/, "");
  return routes.find(
    (r) =>
      r.id.toLowerCase() === raw ||
      r.routeNumber.toLowerCase() === raw ||
      r.id.toLowerCase() === `route-${raw}` ||
      r.routeNumber.toLowerCase() === clean ||
      r.id.toLowerCase() === `route-${clean}`,
  );
}

function routeFor(id: string): Route {
  return findRoute(id) ?? routes[0];
}

function findBus(identifier?: string) {
  if (!identifier) return undefined;
  const raw = identifier.trim().toLowerCase();
  const clean = raw.replace(/^bus-/, "");
  return buses.find(
    (b) =>
      b.id.toLowerCase() === raw ||
      b.number.toLowerCase() === raw ||
      b.id.toLowerCase() === `bus-${raw}` ||
      b.number.toLowerCase() === clean,
  );
}

function findStop(identifier?: string) {
  if (!identifier) return undefined;
  const raw = identifier.trim().toLowerCase();
  const allStops = routes.flatMap((route) => route.stops);
  return allStops.find(
    (s) =>
      s.id.toLowerCase() === raw ||
      s.name.toLowerCase() === raw ||
      s.id.toLowerCase().replace(/-/g, " ") === raw,
  );
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
      source: "DEMO FALLBACK · simulated onboard CCTV edge model",
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
  const route = findRoute(query?.routeId);
  return route ? res.json(route) : res.status(404).json({ error: "Route information unavailable" });
});

publicRouter.get("/route/stops", (req, res) => {
  const query = parseQuery(GetRouteStopsQueryParams, req.query);
  const route = findRoute(query?.routeId);
  return route ? res.json(route.stops) : res.status(404).json({ error: "Route stops unavailable" });
});

publicRouter.get("/buses", (req, res) => {
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const routeParam = String(req.query.routeId ?? "").trim();
  const matchedRoute = routeParam ? findRoute(routeParam) : undefined;
  const targetRouteId = matchedRoute ? matchedRoute.id : routeParam;
  const result = buses
    .map(busSummary)
    .filter((bus) => !routeParam || bus.routeId === targetRouteId || bus.routeNumber.toLowerCase() === routeParam.toLowerCase())
    .filter((bus) => {
      if (!search) return true;
      const r = routeFor(bus.routeId);
      const stopNames = r?.stops ? r.stops.map((s) => s.name).join(" ") : "";
      const fullSearchString = `${bus.number} ${bus.routeNumber} ${bus.origin} ${bus.destination} ${bus.currentLocation} ${bus.serviceType} ${stopNames}`.toLowerCase();
      return fullSearchString.includes(search);
    });
  res.json(result);
});

publicRouter.get("/bus", (req, res) => {
  const query = parseQuery(GetBusQueryParams, req.query);
  const bus = findBus(query?.busId);
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
  const stop = findStop(query?.stopId);
  if (!stop) return res.status(404).json({ error: "Stop information unavailable" });
  const relevantBuses = buses
    .filter((bus) => bus.routeId && routeFor(bus.routeId).stops.some((item) => item.id === stop.id))
    .map((bus) => {
      const summary = busSummary(bus);
      const route = routeFor(bus.routeId);
      const busState = getBusState(bus.id);
      const currentIndex = busState.stopIndex;
      const targetIndex = route.stops.findIndex((s) => s.id === stop.id);
      let etaMinutes = 5;
      if (targetIndex >= 0) {
        if (targetIndex >= currentIndex) {
          etaMinutes = Math.max(2, (targetIndex - currentIndex) * 3 + (busState.tick % 3));
        } else {
          etaMinutes = Math.max(6, (route.stops.length - currentIndex + targetIndex) * 3);
        }
      }
      return {
        ...summary,
        etaMinutes,
        predictedOccupancy: stopForecast(bus, stop.id),
      };
    })
    .sort((a, b) => a.etaMinutes - b.etaMinutes);

  return res.json({
    stop,
    routes: stop.routes,
    upcomingBuses: relevantBuses,
  });
});

operatorRouter.get("/overview", async (_req, res) => {
  try {
    await refreshSecurityEventsFromProvider();
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
  } catch (error) {
    return providerError(res, error);
  }
});

operatorRouter.get("/bus", async (req, res) => {
  const query = parseQuery(GetOperatorBusQueryParams, req.query);
  const bus = findBus(query?.busId);
  if (!bus) return res.status(404).json({ error: "Operator bus information unavailable" });

  try {
    const details = busDetails(bus);
    const busState = getBusState(bus.id);
    const etmTimeline: EtmEvent[] = etmFeed.mode === "provider"
      ? await providerEtmEvents(bus.number)
      : [
        { time: "10:02", timestamp: "2026-09-16T10:02:00+05:30", busNumber: bus.number, quantity: 3, boardingStop: "Island Ground", currentStop: "Adyar O.T.", passengerCount: Math.max(4, busState.occupancy - 3), destinationStage: "Adyar O.T.", status: "Processed", source: feedSource(etmFeed, "ETM timeline") },
        { time: "10:04", timestamp: "2026-09-16T10:04:00+05:30", busNumber: bus.number, quantity: 2, boardingStop: "Adyar O.T.", currentStop: "Adyar O.T.", passengerCount: Math.max(4, busState.occupancy - 1), destinationStage: "SRP Tools", status: "Processed", source: feedSource(etmFeed, "ETM timeline") },
        { time: "10:07", timestamp: "2026-09-16T10:07:00+05:30", busNumber: bus.number, quantity: 5, boardingStop: "Adyar O.T.", currentStop: "Adyar O.T.", passengerCount: busState.occupancy, destinationStage: "Sholinganallur", status: "Pending / received", source: feedSource(etmFeed, "ETM timeline") },
      ];
    const occupancyTimeline: OccupancyPoint[] = cameraFeed.mode === "provider"
      ? await providerOccupancyTimeline(bus.number)
      : [
        { time: "10:14", camera: Math.max(4, busState.occupancy - 4), reconciled: null, source: feedSource(cameraFeed, "occupancy timeline") },
        { time: "10:18", camera: Math.max(4, busState.occupancy - 2), reconciled: null, source: feedSource(cameraFeed, "occupancy timeline") },
        { time: "10:22", camera: busState.occupancy, reconciled: Math.max(4, busState.occupancy + 2), source: feedSource(cameraFeed, "occupancy timeline") },
        { time: "10:26", camera: busState.occupancy, reconciled: null, source: feedSource(cameraFeed, "occupancy timeline") },
      ];
    const latestEtmCount = etmTimeline.at(-1)?.passengerCount;
    return res.json({
      ...details,
      reconciledOccupancy: etmFeed.mode === "provider" && latestEtmCount !== undefined ? latestEtmCount : Math.max(4, details.currentOccupancy + 2),
      reconciliationStatus: etmFeed.mode === "provider" ? "MTC authorized ETM feed" : "DEMO FALLBACK · simulated reconciliation",
      etmTimeline,
      occupancyTimeline,
    });
  } catch (error) {
    return providerError(res, error);
  }
});

operatorRouter.get("/security-events", async (_req, res) => {
  try {
    await refreshSecurityEventsFromProvider();
    res.set("Cache-Control", "no-cache").set("ETag", `"security-events-${securityEventCacheVersion}"`);
    return res.json(securityEvents);
  } catch (error) {
    return providerError(res, error);
  }
});

operatorRouter.get("/security-investigation", async (req, res) => {
  try {
    await refreshSecurityEventsFromProvider();
    const query = parseQuery(GetSecurityInvestigationQueryParams, req.query);
    const busNumber = query?.busNumber?.trim().toLowerCase();
    const stop = query?.stop?.trim().toLowerCase();
    const eventType = query?.eventType?.trim().toLowerCase();
    const minConfidence = query?.minConfidence ?? 0;
    const result = securityEvents.filter((event) =>
      (!busNumber || event.busNumber.toLowerCase().includes(busNumber)) &&
      (!stop || event.physicalStop.toLowerCase().includes(stop)) &&
      (!eventType || event.eventType.toLowerCase().includes(eventType)) &&
      event.confidence >= minConfidence,
    );
    res.set("Cache-Control", "no-cache").set("ETag", `"security-events-${securityEventCacheVersion}"`);
    return res.json(result);
  } catch (error) {
    return providerError(res, error);
  }
});

operatorRouter.post("/security-events/review", requireOperator, async (req, res) => {
  try {
    await refreshSecurityEventsFromProvider();
  } catch (error) {
    providerError(res, error);
    return;
  }

  const eventId = typeof req.body?.eventId === "string" ? req.body.eventId.trim() : "";
  const action = typeof req.body?.action === "string" ? req.body.action.trim() as SecurityReviewAction : undefined;
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : undefined;
  const nextStatus = action ? statusForReviewAction[action] : undefined;

  if (!eventId || !action || !nextStatus) {
    res.status(400).json({ error: "eventId and a valid review action are required" });
    return;
  }

  const event = securityEvents.find((item) => item.id === eventId);
  if (!event) {
    res.status(404).json({ error: "Security event not found" });
    return;
  }

  if (event.status === nextStatus) {
    res.status(409).json({ error: `Event is already ${nextStatus.toLowerCase()}` });
    return;
  }

  const previousStatus = event.status;
  event.status = nextStatus;
  event.statusDetail = note || (
    nextStatus === "Acknowledged"
      ? "Acknowledged by an authorized operator; continued monitoring recommended"
      : nextStatus === "Escalated"
        ? "Escalated by an authorized operator for immediate follow-up"
        : "Dismissed by an authorized operator after review"
  );
  const auditEntry: SecurityReviewAudit = {
    id: `${event.id}-review-${event.reviewHistory.length + 1}`,
    eventId: event.id,
    action,
    fromStatus: previousStatus,
    toStatus: nextStatus,
    operatorId: res.locals.operator?.id ?? "operator",
    operatorRole: "operator",
    ...(note ? { note } : {}),
    timestamp: new Date().toISOString(),
  };
  event.reviewHistory.push(auditEntry);
  invalidateSecurityEventCache();
  req.log.info({ eventId: event.id, action, operatorId: auditEntry.operatorId }, "Security event review recorded");
  res.set("Cache-Control", "no-store").status(200).json({
    event,
    auditEntry,
    cacheVersion: securityEventCacheVersion,
  });
});

operatorRouter.get("/security-events/audit", requireOperator, (req, res) => {
  const eventId = typeof req.query.eventId === "string" ? req.query.eventId.trim() : "";
  if (eventId && !securityEvents.some((event) => event.id === eventId)) {
    res.status(404).json({ error: "Security event not found" });
    return;
  }
  const entries = securityEvents
    .flatMap((event) => event.reviewHistory)
    .filter((entry) => !eventId || entry.eventId === eventId);
  res.json({ eventId: eventId || null, entries, cacheVersion: securityEventCacheVersion });
});

export { publicRouter as smartbusPublicRouter, operatorRouter as smartbusOperatorRouter };