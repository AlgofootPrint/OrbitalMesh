import type { NetworkNode, Telemetry, TelemetryPoint } from './models';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const createTelemetry = (index: number, type: NetworkNode['type']): Telemetry => {
  const baselineBattery = type === 'GROUND_STATION' ? 100 : type === 'SENSOR_CLUSTER' ? 76 : 92 - index * 1.7;
  const baselineTemp = type === 'SATELLITE' ? 24 + index : type === 'HAPS' ? -18 + index * 2 : type === 'UAV' ? 28 + index : 22;
  const packetLoss = 0.006 + index * 0.001;
  const contributors = anomalyContributors({
    battery: baselineBattery,
    temperature: baselineTemp,
    signalStrength: 88 - index,
    packetQueue: 6 + index,
    latency: 24 + index * 2,
    packetLoss,
  });

  return {
    battery: baselineBattery,
    temperature: baselineTemp,
    signalStrength: 88 - index,
    packetQueue: 6 + index,
    latency: 24 + index * 2,
    packetLoss,
    anomalyScore: contributorTotal(contributors),
    anomalyContributors: contributors,
    health: 'HEALTHY',
  };
};

export const anomalyContributors = (
  telemetry: Omit<Telemetry, 'anomalyScore' | 'health' | 'anomalyContributors'>,
) => {
  const temperature = clamp(Math.abs(telemetry.temperature - 24) / 70, 0, 0.45);
  const battery = clamp((62 - telemetry.battery) / 115, 0, 0.28);
  const packetLoss = clamp(telemetry.packetLoss * 7.8, 0, 0.22);
  const signalNoise = clamp((78 - telemetry.signalStrength) / 260, 0, 0.12);
  return { temperature, battery, packetLoss, signalNoise };
};

export const contributorTotal = (contributors: Telemetry['anomalyContributors']) =>
  clamp(contributors.temperature + contributors.battery + contributors.packetLoss + contributors.signalNoise, 0, 0.99);

export const nextTelemetry = (
  node: NetworkNode,
  tick: number,
  packetLoss: number,
  congestion: number,
): Telemetry => {
  if (node.forcedOffline) {
    return {
      ...node.telemetry,
      signalStrength: 0,
      latency: 0,
      packetQueue: 0,
      packetLoss: 1,
      anomalyScore: 0.99,
      anomalyContributors: { temperature: 0.2, battery: 0.22, packetLoss: 0.37, signalNoise: 0.2 },
      health: 'FAILED',
    };
  }

  const wave = Math.sin(tick * 0.08 + (node.phase ?? 0));
  const slowWave = Math.cos(tick * 0.031 + node.id.length);
  const batteryDrain = node.type === 'GROUND_STATION' ? 0 : node.type === 'SENSOR_CLUSTER' ? 0.008 : node.type === 'UAV' ? 0.04 : 0.016;
  const battery = clamp(node.telemetry.battery - batteryDrain + slowWave * 0.018, 14, 100);
  const thermalBase = node.type === 'SATELLITE' ? 24 : node.type === 'HAPS' ? -14 : node.type === 'UAV' ? 30 : 22;
  const temperature = clamp(thermalBase + wave * 6 + slowWave * 3 + node.packetBias, -35, 76);
  const signalStrength = clamp(88 + slowWave * 9 - packetLoss * 180 - congestion * 14, 5, 99);
  const packetQueue = Math.round(clamp(8 + wave * 5 + packetLoss * 120 + congestion * 24 + node.queueBias, 0, 96));
  const latency = Math.round(clamp(18 + packetQueue * 0.5 + packetLoss * 330 + congestion * 28, 8, 220));
  const contributors = anomalyContributors({ battery, temperature, signalStrength, packetQueue, latency, packetLoss });
  const anomalyScore = contributorTotal(contributors);
  const health = anomalyScore > 0.82 ? 'DEGRADED' : 'HEALTHY';

  return { battery, temperature, signalStrength, packetQueue, latency, packetLoss, anomalyScore, anomalyContributors: contributors, health };
};

export const toTelemetryPoint = (telemetry: Telemetry, time: string): TelemetryPoint => ({
  time,
  battery: Math.round(telemetry.battery),
  temperature: Number(telemetry.temperature.toFixed(1)),
  signalStrength: Math.round(telemetry.signalStrength),
  latency: Math.round(telemetry.latency),
  packetLoss: Number((telemetry.packetLoss * 100).toFixed(2)),
  anomalyScore: Number(telemetry.anomalyScore.toFixed(2)),
});
