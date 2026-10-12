import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export interface GlobeMarker {
  lat: number;
  lng: number;
  src?: string;
  label: string;
}

export interface Globe3DConfig {
  atmosphereColor?: string;
  atmosphereIntensity?: number;
  bumpScale?: number;
  autoRotateSpeed?: number;
  radius?: number;
  showGrid?: boolean;
}

export function Globe3D({
  markers,
  config,
  onMarkerClick,
  onMarkerHover,
}: {
  markers: GlobeMarker[];
  config?: Globe3DConfig;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const radius = config?.radius ?? 2;
  const [hovered, setHovered] = useState<string | null>(null);
  const earthTexture = useMemo(() => new THREE.CanvasTexture(makeEarthCanvas()), []);
  const lightsTexture = useMemo(() => new THREE.CanvasTexture(makeLightsCanvas()), []);
  const cloudTexture = useMemo(() => new THREE.CanvasTexture(makeCloudCanvas()), []);
  const bumpTexture = useMemo(() => new THREE.CanvasTexture(makeBumpCanvas()), []);

  useFrame((_, delta) => {
    const speed = config?.autoRotateSpeed ?? 0.18;
    if (groupRef.current && speed !== 0) groupRef.current.rotation.y += delta * speed;
    if (earthRef.current && speed === 0) earthRef.current.rotation.y += delta * 0.004;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * 0.018;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={earthRef}>
        <sphereGeometry args={[radius, 128, 128]} />
        <meshStandardMaterial
          map={earthTexture}
          bumpMap={bumpTexture}
          bumpScale={(config?.bumpScale ?? 4) * 0.006}
          roughness={0.9}
          metalness={0.03}
          emissiveMap={lightsTexture}
          emissive="#f6d28a"
          emissiveIntensity={0.15}
        />
      </mesh>
      <mesh ref={cloudRef}>
        <sphereGeometry args={[radius * 1.012, 96, 96]} />
        <meshStandardMaterial map={cloudTexture} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {config?.showGrid && (
        <mesh>
          <sphereGeometry args={[radius * 1.017, 48, 48]} />
          <meshBasicMaterial color="#64748b" transparent opacity={0.16} wireframe />
        </mesh>
      )}
      <mesh>
        <sphereGeometry args={[radius * 1.06, 64, 64]} />
        <meshBasicMaterial
          color={config?.atmosphereColor ?? '#4da6ff'}
          transparent
          opacity={Math.min(0.18, (config?.atmosphereIntensity ?? 12) / 220)}
          side={THREE.BackSide}
        />
      </mesh>
      {markers.map((marker) => (
        <GlobeMarkerNode
          key={`${marker.label}-${marker.lat}-${marker.lng}`}
          marker={marker}
          radius={radius}
          hovered={hovered === marker.label}
          onClick={() => onMarkerClick?.(marker)}
          onHover={(active) => {
            setHovered(active ? marker.label : null);
            onMarkerHover?.(active ? marker : null);
          }}
        />
      ))}
    </group>
  );
}

function GlobeMarkerNode({
  marker,
  radius,
  hovered,
  onClick,
  onHover,
}: {
  marker: GlobeMarker;
  radius: number;
  hovered: boolean;
  onClick: () => void;
  onHover: (active: boolean) => void;
}) {
  const position = useMemo(() => latLngToPosition(marker.lat, marker.lng, radius * 1.03), [marker.lat, marker.lng, radius]);
  const color = hovered ? '#F0C36A' : '#D7A13B';
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      <mesh>
        <sphereGeometry args={[hovered ? 0.05 : 0.038, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.072, 0.102, 32]} />
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.5 : 0.32} side={THREE.DoubleSide} />
      </mesh>
      <LineStem color={color} />
      {hovered && (
        <Text position={[0.12, 0.1, 0]} fontSize={0.06} color="#f8fafc" anchorX="left">
          {marker.label}
        </Text>
      )}
    </group>
  );
}

function LineStem({ color }: { color: string }) {
  return (
    <mesh position={[0, 0.055, 0]}>
      <cylinderGeometry args={[0.006, 0.006, 0.11, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.72} />
    </mesh>
  );
}

function latLngToPosition(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return [
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ];
}

function makeEarthCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#12385b');
  ocean.addColorStop(0.48, '#08243d');
  ocean.addColorStop(1, '#061725');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#2f513c';
  drawBlob(ctx, 350, 350, 170, 235, 0.4);
  drawBlob(ctx, 620, 520, 145, 185, -0.5);
  drawBlob(ctx, 1040, 410, 230, 175, 0.2);
  drawBlob(ctx, 1280, 500, 175, 215, -0.3);
  drawBlob(ctx, 1580, 560, 200, 155, 0.5);
  ctx.fillStyle = 'rgba(230, 218, 180, 0.28)';
  drawBlob(ctx, 1020, 475, 150, 85, 0);
  drawBlob(ctx, 1260, 520, 125, 72, 0);
  return canvas;
}

function makeLightsCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255, 204, 120, 0.82)';
  for (let i = 0; i < 520; i += 1) {
    const x = 145 + Math.random() * 720;
    const y = 170 + Math.random() * 165;
    ctx.fillRect(x, y, 1.1, 1.1);
  }
  return canvas;
}

function makeCloudCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 130; i += 1) {
    ctx.beginPath();
    ctx.ellipse(Math.random() * canvas.width, Math.random() * canvas.height, 24 + Math.random() * 82, 5 + Math.random() * 16, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function makeBumpCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#777';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#999';
  for (let i = 0; i < 90; i += 1) {
    drawBlob(ctx, Math.random() * canvas.width, Math.random() * canvas.height, 30 + Math.random() * 90, 12 + Math.random() * 55, Math.random() * Math.PI);
  }
  return canvas;
}

function drawBlob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
