export type HealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED';
export type Vec3Tuple = [number, number, number];
export type NodeLayer = 'SPACE' | 'AIR' | 'GROUND';
export type NodeType = 'SATELLITE' | 'HAPS' | 'UAV' | 'GROUND_STATION' | 'SENSOR_CLUSTER';
export type Scenario =
  | 'NORMAL OPERATIONS'
  | 'WILDFIRE MONITORING'
  | 'SATELLITE FAILURE'
  | 'GROUND STATION OUTAGE'
  | 'UAV RELAY LOSS'
  | 'NETWORK CONGESTION';

export interface Telemetry {
  battery: number;
  temperature: number;
  signalStrength: number;
  packetQueue: number;
  latency: number;
  packetLoss: number;
  anomalyScore: number;
  anomalyContributors: {
    temperature: number;
    battery: number;
    packetLoss: number;
    signalNoise: number;
  };
  health: HealthState;
}

export interface TelemetryPoint {
  time: string;
  battery: number;
  temperature: number;
  signalStrength: number;
  latency: number;
  packetLoss: number;
  anomalyScore: number;
}

export interface NetworkNode {
  id: string;
  label: string;
  layer: NodeLayer;
  type: NodeType;
  lat?: number;
  lon?: number;
  altitude: number;
  velocity: number;
  orbitRadius?: number;
  orbitTilt?: number;
  phase?: number;
  angularVelocity?: number;
  position: Vec3Tuple;
  telemetry: Telemetry;
  forcedOffline: boolean;
  packetBias: number;
  queueBias: number;
  currentRoute: string[];
  nextHop: string | null;
  connectedNodeId: string | null;
  telemetryHistory: TelemetryPoint[];
}

export interface NetworkLink {
  id: string;
  source: string;
  target: string;
  sourceLayer: NodeLayer;
  targetLayer: NodeLayer;
  distance: number;
  latency: number;
  bandwidth: number;
  packetLoss: number;
  availability: number;
  congestion: number;
  signalQuality: number;
  active: boolean;
}

export interface RoutingWeights {
  packetLoss: number;
  congestion: number;
  availability: number;
}

export interface RouteComputation {
  path: string[];
  cost: number;
  latency: number;
}

export interface NetworkEvent {
  id: string;
  time: string;
  tick: number;
  type: 'NETWORK' | 'HANDOFF' | 'EDGE_AI' | 'TELEMETRY' | 'RECOVERY' | 'SCENARIO' | 'FAILURE';
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  route?: string[];
}

export interface RecoveryStats {
  trigger: string;
  oldRoute: string[];
  newRoute: string[];
  previousLatency: number;
  newLatency: number;
  latencyDifference: number;
  previousDelivery: number;
  newDelivery: number;
  packetDeliveryDifference: number;
  recoveryTimeMs: number;
  recoveredAt: string;
}

export interface SimulationMetrics {
  satellitesOnline: number;
  airRelaysOnline: number;
  networkLatency: number;
  packetDeliveryRate: number;
  activeRoutes: number;
  edgeAiEvents: number;
  resilienceScore: number;
}

export interface SimulationSnapshot {
  nodes: NetworkNode[];
  satellites: NetworkNode[];
  airNodes: NetworkNode[];
  groundNodes: NetworkNode[];
  groundStations: NetworkNode[];
  sensorClusters: NetworkNode[];
  links: NetworkLink[];
  activeRoute: string[];
  highlightedRoute: string[];
  routeComputation: RouteComputation;
  routingWeights: RoutingWeights;
  metrics: SimulationMetrics;
  events: NetworkEvent[];
  recovery: RecoveryStats | null;
  pausedTraffic: boolean;
  scenario: Scenario;
  timestep: number;
}

export const SCENARIOS: Scenario[] = [
  'NORMAL OPERATIONS',
  'WILDFIRE MONITORING',
  'SATELLITE FAILURE',
  'GROUND STATION OUTAGE',
  'UAV RELAY LOSS',
  'NETWORK CONGESTION',
];

export type Satellite = NetworkNode;
export type GroundStation = NetworkNode;
