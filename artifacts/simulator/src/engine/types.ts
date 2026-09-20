export interface RouteStop {
  id: string;
  name: string;
  sequence: number;
}

export interface BusRoute {
  id: string;
  number: string;
  origin: string;
  destination: string;
  capacity: number;
  stops: RouteStop[];
}

export const SIMULATOR_ROUTES: BusRoute[] = [
  {
    id: "bus-102",
    number: "102",
    origin: "Broadway",
    destination: "Kelambakkam",
    capacity: 52,
    stops: [
      { id: "broadway", name: "Broadway Terminus", sequence: 1 },
      { id: "central", name: "Central Railway", sequence: 2 },
      { id: "adyar", name: "Adyar O.T.", sequence: 3 },
      { id: "srp-tools", name: "SRP Tools", sequence: 4 },
      { id: "sholinganallur", name: "Sholinganallur", sequence: 5 },
      { id: "kelambakkam", name: "Kelambakkam", sequence: 6 },
    ],
  },
  {
    id: "bus-21g",
    number: "21G",
    origin: "Tambaram",
    destination: "Broadway",
    capacity: 48,
    stops: [
      { id: "tambaram", name: "Tambaram Sanatorium", sequence: 1 },
      { id: "chromepet", name: "Chromepet", sequence: 2 },
      { id: "guindy", name: "Guindy Estate", sequence: 3 },
      { id: "saidapet", name: "Saidapet", sequence: 4 },
      { id: "broadway", name: "Broadway", sequence: 5 },
    ],
  },
  {
    id: "bus-23c",
    number: "23C",
    origin: "Adyar",
    destination: "Central",
    capacity: 44,
    stops: [
      { id: "adyar-depot", name: "Adyar Depot", sequence: 1 },
      { id: "adyar-ot", name: "Adyar O.T.", sequence: 2 },
      { id: "mylapore", name: "Mylapore Tank", sequence: 3 },
      { id: "central", name: "Chennai Central", sequence: 4 },
    ],
  },
];

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "ETM" | "CAMERA" | "SECURITY" | "RECONCILIATION";
  status: "SUCCESS" | "DISCREPANCY" | "ERROR" | "INFO";
  message: string;
  payload?: Record<string, unknown>;
}

export interface SimulationState {
  activeBus: BusRoute;
  currentStopIndex: number;
  etmOccupancy: number;
  cameraOccupancy: number;
  isPlaying: boolean;
  speed: number;
  totalBoardings: number;
  totalAlightings: number;
  discrepancyCount: number;
  lastReconciliationStatus: string;
  reconciledOccupancy: number | null;
  logs: LogEntry[];
}
