import type { Vec3Tuple } from './models';

const degToRad = (value: number) => (value * Math.PI) / 180;

export const distance = (a: Vec3Tuple, b: Vec3Tuple) => {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const normalize = (v: Vec3Tuple): Vec3Tuple => {
  const len = Math.max(distance(v, [0, 0, 0]), 0.001);
  return [v[0] / len, v[1] / len, v[2] / len];
};

export const earthSurfacePosition = (lat: number, lon: number, radius = 2.03): Vec3Tuple => {
  const phi = degToRad(90 - lat);
  const theta = degToRad(lon + 180);
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
};

export const orbitPosition = (
  radius: number,
  phase: number,
  tilt: number,
): Vec3Tuple => {
  const x = Math.cos(phase) * radius;
  const z = Math.sin(phase) * radius;
  const y = Math.sin(phase * 1.7) * 0.2;
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);
  return [x, y * cosTilt - z * sinTilt, y * sinTilt + z * cosTilt];
};
