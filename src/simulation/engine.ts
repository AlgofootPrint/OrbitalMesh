import { distance, earthSurfacePosition, orbitPosition } from './geometry';
import type {
  NetworkEvent,
  NetworkLink,
  NetworkNode,
  RecoveryStats,
  RoutingWeights,
  Scenario,
  SimulationMetrics,
  SimulationSnapshot,
} from './models';
import { findBestRoute, defaultRoutingWeights } from './routing';
import { createTelemetry, nextTelemetry, toTelemetryPoint } from './telemetry';

const nowLabel = () =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const kmScale = 1900;

export class OrbitalMeshSimulation {
  private nodes: NetworkNode[] = [];
  private links: NetworkLink[] = [];
  private events: NetworkEvent[] = [];
  private activeRoute: string[] = [];
  private highlightedRoute: string[] = [];
  private routeComputation = { path: [] as string[], cost: 0, latency: 0 };
  private tickCount = 0;
  private recovery: RecoveryStats | null = null;
  private pausedTrafficUntil = 0;
  private edgeAiEvents = 0;
  private scenario: Scenario = 'NORMAL OPERATIONS';
  private routingWeights: RoutingWeights = { ...defaultRoutingWeights };
  private routeSource = 'GS-01';
  private routeTarget = 'GS-03';
  private random: () => number;

  constructor(options: { seed?: number } = {}) {
    this.random = options.seed === undefined ? Math.random : createSeededRandom(options.seed);
    this.nodes = this.createNodes();
    this.rebuildLinks();
    this.recalculateRoute();
    this.addEvent('NETWORK', 'Topology initialized', 'Space-Air-Ground mesh ready for computed routing', 'success');
  }

  step(delta = 1): SimulationSnapshot {
    this.tickCount += delta;
    const label = nowLabel();

    this.nodes = this.nodes.map((node) => {
      let position = node.position;
      let phase = node.phase;
      if (node.type === 'SATELLITE' && node.orbitRadius && node.orbitTilt && node.angularVelocity && phase !== undefined) {
        phase += node.angularVelocity * delta;
        position = orbitPosition(node.orbitRadius, phase, node.orbitTilt);
      } else if (node.type === 'UAV' && node.lat !== undefined && node.lon !== undefined) {
        const drift = Math.sin(this.tickCount * 0.04 + node.id.length) * 0.22;
        position = earthSurfacePosition(node.lat + drift, node.lon + drift * 1.8, 2.18);
      } else if (node.type === 'HAPS' && node.lat !== undefined && node.lon !== undefined) {
        const drift = Math.sin(this.tickCount * 0.025 + node.id.length) * 0.08;
        position = earthSurfacePosition(node.lat + drift, node.lon - drift, 2.36);
      }

      const nodeLinks = this.links.filter((link) => link.source === node.id || link.target === node.id);
      const avgLoss = nodeLinks.length ? nodeLinks.reduce((sum, link) => sum + link.packetLoss, 0) / nodeLinks.length : 0.018;
      const avgCongestion = nodeLinks.length ? nodeLinks.reduce((sum, link) => sum + link.congestion, 0) / nodeLinks.length : 0.18;
      const telemetry = nextTelemetry({ ...node, phase, position }, this.tickCount, avgLoss, avgCongestion);
      const history = [...node.telemetryHistory.slice(-59), toTelemetryPoint(telemetry, label)];

      if (telemetry.anomalyScore > 0.82 && node.telemetry.anomalyScore <= 0.82) {
        this.edgeAiEvents += 1;
        this.addEvent('EDGE_AI', `${node.id} simulated anomaly detector`, `Score ${telemetry.anomalyScore.toFixed(2)} from telemetry rules`, 'warning');
      }

      return { ...node, phase, position, telemetry, telemetryHistory: history };
    });

    this.rebuildLinks();
    this.updateHandoffs();
    this.recalculateRoute();
    return this.snapshot();
  }

  setScenario(scenario: Scenario) {
    this.scenario = scenario;
    this.nodes = this.nodes.map((node) => ({ ...node, forcedOffline: false, queueBias: node.queueBias > 18 ? node.queueBias - 18 : node.queueBias }));
    this.routeSource = scenario === 'WILDFIRE MONITORING' || scenario === 'UAV RELAY LOSS' ? 'SENSOR-01' : 'GS-01';
    this.routeTarget = scenario === 'WILDFIRE MONITORING' || scenario === 'UAV RELAY LOSS' ? 'GS-02' : 'GS-03';

    if (scenario === 'SATELLITE FAILURE') this.markOffline('SAT-04');
    if (scenario === 'GROUND STATION OUTAGE') this.markOffline('GS-03');
    if (scenario === 'UAV RELAY LOSS') this.markOffline('UAV-02');
    if (scenario === 'NETWORK CONGESTION') {
      this.nodes = this.nodes.map((node) => ({ ...node, queueBias: node.queueBias + (node.layer === 'AIR' ? 28 : 14) }));
    }

    this.pausedTrafficUntil = Date.now() + 900;
    this.rebuildLinks();
    const oldRoute = this.activeRoute;
    const oldLatency = this.routeLatency(oldRoute);
    const oldDelivery = this.deliveryRate();
    this.recalculateRoute();
    this.recovery = this.makeRecovery(`${scenario}`, oldRoute, this.activeRoute, oldLatency, oldDelivery);
    this.addEvent('SCENARIO', scenario, `Route target ${this.routeSource} -> ${this.routeTarget}`, scenario === 'NORMAL OPERATIONS' ? 'info' : 'warning');
  }

  setRoutingWeights(weights: RoutingWeights) {
    this.routingWeights = weights;
    this.recalculateRoute();
  }

  forceFailure(nodeId: string) {
    const oldRoute = this.activeRoute;
    const oldLatency = this.routeLatency(oldRoute);
    const oldDelivery = this.deliveryRate();
    this.pausedTrafficUntil = Date.now() + 1200;
    this.markOffline(nodeId);
    this.rebuildLinks();
    this.recalculateRoute();
    this.recovery = this.makeRecovery(`${nodeId} OFFLINE`, oldRoute, this.activeRoute, oldLatency, oldDelivery);
    this.addEvent('FAILURE', `${nodeId} OFFLINE`, 'Primary path unavailable; Dijkstra recovery path computed', 'critical', oldRoute);
    this.addEvent('RECOVERY', 'Recovery complete', this.activeRoute.join(' -> '), 'success', this.activeRoute);
  }

  forceSatelliteConstellationFailure() {
    const oldRoute = this.activeRoute;
    const oldLatency = this.routeLatency(oldRoute);
    const oldDelivery = this.deliveryRate();
    this.pausedTrafficUntil = Date.now() + 1600;
    this.nodes = this.nodes.map((node) =>
      node.type === 'SATELLITE'
        ? {
            ...node,
            forcedOffline: true,
            telemetry: { ...node.telemetry, health: 'FAILED', signalStrength: 0, packetLoss: 1, anomalyScore: 0.99 },
          }
        : node,
    );
    this.rebuildLinks();
    this.recalculateRoute();
    this.recovery = this.makeRecovery('ALL SATELLITES OFFLINE', oldRoute, this.activeRoute, oldLatency, oldDelivery);
    this.addEvent('FAILURE', 'ALL SATELLITES OFFLINE', 'Constellation unavailable; fallback recovery path computed', 'critical', oldRoute);
    this.addEvent('RECOVERY', 'Recovery complete', this.activeRoute.join(' -> ') || 'No viable route', 'warning', this.activeRoute);
  }

  restoreSatelliteConstellation() {
    this.nodes = this.nodes.map((node) => (node.type === 'SATELLITE' ? { ...node, forcedOffline: false } : node));
    this.rebuildLinks();
    this.recalculateRoute();
    this.addEvent('NETWORK', 'All satellites restored', 'Satellite constellation returned to routing candidate set', 'success');
  }

  restoreNode(nodeId: string) {
    this.nodes = this.nodes.map((node) => (node.id === nodeId ? { ...node, forcedOffline: false } : node));
    this.rebuildLinks();
    this.recalculateRoute();
    this.addEvent('NETWORK', `${nodeId} restored`, 'Node returned to routing candidate set', 'success');
  }

  getSnapshot() {
    return this.snapshot();
  }

  private createNodes(): NetworkNode[] {
    const nodes: NetworkNode[] = [];
    for (let index = 0; index < 8; index += 1) {
      const phase = (Math.PI * 2 * index) / 8;
      const telemetry = createTelemetry(index, 'SATELLITE');
      nodes.push({
        id: `SAT-${String(index + 1).padStart(2, '0')}`,
        label: `LEO ${index + 1}`,
        layer: 'SPACE',
        type: 'SATELLITE',
        altitude: 530 + (index % 4) * 38,
        velocity: 7.3 + (index % 3) * 0.18,
        orbitRadius: 3.35 + (index % 3) * 0.12,
        orbitTilt: -0.9 + index * 0.27,
        phase,
        angularVelocity: 0.006 + index * 0.00045,
        position: orbitPosition(3.35 + (index % 3) * 0.12, phase, -0.9 + index * 0.27),
        telemetry,
        forcedOffline: false,
        packetBias: index % 3 === 0 ? 10 : 0,
        queueBias: index % 4 === 1 ? 8 : 0,
        currentRoute: [],
        nextHop: null,
        connectedNodeId: null,
        telemetryHistory: [toTelemetryPoint(telemetry, nowLabel())],
      });
    }

    const fixed: Array<[string, string, NetworkNode['type'], NetworkNode['layer'], number, number, number, number]> = [
      ['HAPS-01', 'Pacific HAPS', 'HAPS', 'AIR', 20.1, -152.4, 20, 0.03],
      ['HAPS-02', 'Arctic HAPS', 'HAPS', 'AIR', 64.3, -28.2, 20, 0.03],
      ['UAV-01', 'UAV Relay Alpha', 'UAV', 'AIR', 37.1, -119.2, 3, 0.18],
      ['UAV-02', 'UAV Relay Bravo', 'UAV', 'AIR', 41.6, -111.6, 3, 0.18],
      ['UAV-03', 'UAV Relay Charlie', 'UAV', 'AIR', 34.1, -106.2, 3, 0.18],
      ['GS-01', 'Mauna Kea', 'GROUND_STATION', 'GROUND', 19.82, -155.47, 0, 0],
      ['GS-02', 'Svalbard Command', 'GROUND_STATION', 'GROUND', 78.23, 15.4, 0, 0],
      ['GS-03', 'Canberra', 'GROUND_STATION', 'GROUND', -35.4, 148.98, 0, 0],
      ['SENSOR-01', 'Sierra Sensor Cluster', 'SENSOR_CLUSTER', 'GROUND', 37.4, -119.6, 0, 0],
      ['SENSOR-02', 'Great Basin Sensor Cluster', 'SENSOR_CLUSTER', 'GROUND', 40.1, -112.8, 0, 0],
      ['SENSOR-03', 'Desert Sensor Cluster', 'SENSOR_CLUSTER', 'GROUND', 34.6, -106.5, 0, 0],
    ];

    fixed.forEach(([id, label, type, layer, lat, lon, altitude, velocity], index) => {
      const radius = type === 'HAPS' ? 2.36 : type === 'UAV' ? 2.18 : 2.03;
      const telemetry = createTelemetry(index + 8, type);
      nodes.push({
        id,
        label,
        layer,
        type,
        lat,
        lon,
        altitude,
        velocity,
        position: earthSurfacePosition(lat, lon, radius),
        telemetry,
        forcedOffline: false,
        packetBias: type === 'SENSOR_CLUSTER' ? 4 : 0,
        queueBias: type === 'SENSOR_CLUSTER' ? 10 : 0,
        currentRoute: [],
        nextHop: null,
        connectedNodeId: null,
        telemetryHistory: [toTelemetryPoint(telemetry, nowLabel())],
      });
    });

    return nodes;
  }

  private rebuildLinks() {
    const online = this.nodes.filter((node) => node.telemetry.health !== 'FAILED' && !node.forcedOffline);
    const links: NetworkLink[] = [];
    online.forEach((source, sourceIndex) => {
      online.slice(sourceIndex + 1).forEach((target) => {
        const pair = `${source.type}:${target.type}`;
        const reverse = `${target.type}:${source.type}`;
        if (!this.supportsLink(pair) && !this.supportsLink(reverse)) return;
        const separation = distance(source.position, target.position);
        const maxRange = this.maxRange(source, target);
        if (separation > maxRange) return;
        links.push(this.createLink(source, target, separation, maxRange));
      });
    });
    this.links = links;
  }

  private supportsLink(pair: string) {
    return [
      'SATELLITE:SATELLITE',
      'SATELLITE:HAPS',
      'SATELLITE:GROUND_STATION',
      'HAPS:UAV',
      'HAPS:GROUND_STATION',
      'UAV:SENSOR_CLUSTER',
      'UAV:GROUND_STATION',
    ].includes(pair);
  }

  private maxRange(source: NetworkNode, target: NetworkNode) {
    if (source.type === 'SATELLITE' && target.type === 'SATELLITE') return 3.1;
    if (source.type === 'SATELLITE' || target.type === 'SATELLITE') return 4.45;
    if (source.type === 'HAPS' || target.type === 'HAPS') return 2.85;
    if (source.type === 'UAV' || target.type === 'UAV') return 1.55;
    return 1.1;
  }

  private createLink(source: NetworkNode, target: NetworkNode, separation: number, maxRange: number): NetworkLink {
    const distanceKm = Math.round(separation * kmScale);
    const rangePenalty = separation / maxRange;
    const congestionBoost = this.scenario === 'NETWORK CONGESTION' ? 0.28 : this.scenario === 'WILDFIRE MONITORING' && source.type === 'SENSOR_CLUSTER' ? 0.18 : 0;
    const congestion = Math.min(0.94, Math.max(0.04, (source.telemetry.packetQueue + target.telemetry.packetQueue) / 180 + congestionBoost));
    const signalQuality = Math.round(Math.max(12, 100 - rangePenalty * 52 - congestion * 18));
    const packetLoss = Math.max(0.002, (100 - signalQuality) / 1300 + congestion * 0.018);
    return {
      id: `${source.id}-${target.id}`,
      source: source.id,
      target: target.id,
      sourceLayer: source.layer,
      targetLayer: target.layer,
      distance: distanceKm,
      latency: Math.round(8 + distanceKm / 210 + congestion * 34 + packetLoss * 120),
      bandwidth: Math.round(Math.max(16, 640 - distanceKm / 9 - congestion * 110)),
      packetLoss,
      availability: Math.min(0.99, Math.max(0.08, signalQuality / 100 - congestion * 0.12)),
      congestion,
      signalQuality,
      active: true,
    };
  }

  private updateHandoffs() {
    this.nodes = this.nodes.map((node) => {
      if (node.type !== 'GROUND_STATION') return node;
      const best = this.links
        .filter((link) => link.source === node.id || link.target === node.id)
        .sort((a, b) => b.signalQuality - a.signalQuality)[0];
      const next = best ? (best.source === node.id ? best.target : best.source) : null;
      if (node.connectedNodeId && next && node.connectedNodeId !== next) {
        this.addEvent('HANDOFF', 'HANDOFF STARTED', `${node.id} switching ${node.connectedNodeId} -> ${next}`, 'info');
        this.addEvent('HANDOFF', 'HANDOFF COMPLETE', `${node.id} selected ${next}`, 'success');
      }
      return { ...node, connectedNodeId: next };
    });
  }

  private recalculateRoute(): void {
    const route = findBestRoute(this.links, this.routeSource, this.routeTarget, this.routingWeights);
    if (!route.path.length && this.routeTarget === 'GS-03') {
      this.routeTarget = 'GS-02';
      this.recalculateRoute();
      return;
    }
    const changed = route.path.join('|') !== this.activeRoute.join('|');
    this.activeRoute = route.path;
    this.highlightedRoute = changed ? route.path : this.highlightedRoute;
    this.routeComputation = route;
    this.nodes = this.nodes.map((node) => {
      const index = route.path.indexOf(node.id);
      return {
        ...node,
        currentRoute: index >= 0 ? route.path : [],
        nextHop: index >= 0 ? route.path[index + 1] ?? null : null,
      };
    });
    if (changed && this.tickCount > 2) this.addEvent('NETWORK', 'Computed route changed', route.path.join(' -> '), 'info', route.path);
  }

  private routeLatency(route: string[]) {
    return Math.round(
      route.slice(0, -1).reduce((total, node, index) => {
        const next = route[index + 1];
        const link = this.findLink(node, next);
        return total + (link?.latency ?? 0);
      }, 0),
    );
  }

  private deliveryRate(route = this.activeRoute) {
    const routeLinks = route.slice(0, -1).map((node, index) => this.findLink(node, route[index + 1])).filter(Boolean) as NetworkLink[];
    const loss = routeLinks.length ? routeLinks.reduce((total, link) => total + link.packetLoss, 0) / routeLinks.length : 0.08;
    return Math.max(70, 100 - loss * 260);
  }

  private findLink(source: string, target: string) {
    return this.links.find((link) => (link.source === source && link.target === target) || (link.source === target && link.target === source));
  }

  private makeRecovery(trigger: string, oldRoute: string[], newRoute: string[], previousLatency: number, previousDelivery: number): RecoveryStats {
    const newLatency = this.routeLatency(newRoute);
    const newDelivery = this.deliveryRate(newRoute);
    return {
      trigger,
      oldRoute,
      newRoute,
      previousLatency,
      newLatency,
      latencyDifference: newLatency - previousLatency,
      previousDelivery,
      newDelivery,
      packetDeliveryDifference: newDelivery - previousDelivery,
      recoveryTimeMs: 420 + Math.round(this.random() * 780),
      recoveredAt: nowLabel(),
    };
  }

  private markOffline(nodeId: string) {
    this.nodes = this.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, forcedOffline: true, telemetry: { ...node.telemetry, health: 'FAILED', signalStrength: 0, packetLoss: 1, anomalyScore: 0.99 } }
        : node,
    );
  }

  private metrics(): SimulationMetrics {
    const satellitesOnline = this.nodes.filter((node) => node.type === 'SATELLITE' && node.telemetry.health !== 'FAILED').length;
    const airRelaysOnline = this.nodes.filter((node) => node.layer === 'AIR' && node.telemetry.health !== 'FAILED').length;
    const packetLoss = this.links.length ? this.links.reduce((total, link) => total + link.packetLoss, 0) / this.links.length : 0.08;
    const degradedPenalty = this.nodes.filter((node) => node.telemetry.health === 'DEGRADED').length * 3;
    return {
      satellitesOnline,
      airRelaysOnline,
      networkLatency: this.routeLatency(this.activeRoute),
      packetDeliveryRate: this.deliveryRate(),
      activeRoutes: this.links.length,
      edgeAiEvents: this.edgeAiEvents,
      resilienceScore: Math.max(40, Math.round(((satellitesOnline + airRelaysOnline) / 13) * 100 - degradedPenalty - packetLoss * 100)),
    };
  }

  private addEvent(type: NetworkEvent['type'], title: string, detail: string, severity: NetworkEvent['severity'], route?: string[]) {
    const id = `${Date.now()}-${this.random().toString(16).slice(2)}`;
    this.events = [{ id, time: nowLabel(), tick: this.tickCount, type, title, detail, severity, route }, ...this.events].slice(0, 80);
  }

  private snapshot(): SimulationSnapshot {
    const satellites = this.nodes.filter((node) => node.type === 'SATELLITE');
    const airNodes = this.nodes.filter((node) => node.layer === 'AIR');
    const groundNodes = this.nodes.filter((node) => node.layer === 'GROUND');
    return {
      nodes: this.nodes,
      satellites,
      airNodes,
      groundNodes,
      groundStations: this.nodes.filter((node) => node.type === 'GROUND_STATION'),
      sensorClusters: this.nodes.filter((node) => node.type === 'SENSOR_CLUSTER'),
      links: this.links,
      activeRoute: this.activeRoute,
      highlightedRoute: this.highlightedRoute,
      routeComputation: this.routeComputation,
      routingWeights: this.routingWeights,
      metrics: this.metrics(),
      events: this.events,
      recovery: this.recovery,
      pausedTraffic: Date.now() < this.pausedTrafficUntil,
      scenario: this.scenario,
      timestep: this.tickCount,
    };
  }
}
