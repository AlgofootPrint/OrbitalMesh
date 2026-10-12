import { Canvas } from '@react-three/fiber';
import { Line, OrbitControls, Stars, Text } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import type { NetworkLink, NetworkNode, SimulationSnapshot, Vec3Tuple } from '../simulation/models';
import { routeContainsLink } from '../simulation/routing';
import { Globe3D, type GlobeMarker } from './ui/3d-globe';

export function OrbitalScene({
  snapshot,
  selectedNodeId,
  selectedLinkId,
  researchMode,
  showGrid,
  onSelectNode,
  onSelectLink,
}: {
  snapshot: SimulationSnapshot;
  selectedNodeId: string;
  selectedLinkId: string | null;
  researchMode: boolean;
  showGrid: boolean;
  onSelectNode: (node: NetworkNode) => void;
  onSelectLink: (link: NetworkLink) => void;
}) {
  const [viewportTier, setViewportTier] = useState<'desktop' | 'laptop' | 'tablet' | 'mobile'>('desktop');

  useEffect(() => {
    const syncTier = () => {
      const width = window.innerWidth;
      setViewportTier(width < 768 ? 'mobile' : width < 1280 ? 'tablet' : width < 1920 ? 'laptop' : 'desktop');
    };
    syncTier();
    window.addEventListener('resize', syncTier);
    window.addEventListener('orientationchange', syncTier);
    return () => {
      window.removeEventListener('resize', syncTier);
      window.removeEventListener('orientationchange', syncTier);
    };
  }, []);

  const isMobile = viewportTier === 'mobile';
  const isTablet = viewportTier === 'tablet';
  const isLaptop = viewportTier === 'laptop';
  const maxDpr = isMobile ? 1.5 : isTablet ? 1.7 : isLaptop ? 1.85 : 2;
  const starCount = isMobile ? 260 : isTablet ? 460 : isLaptop ? 620 : 760;
  const cameraPosition: [number, number, number] = isLaptop ? [0, 3.65, 8.45] : [0, 3.9, 7.7];
  const cameraFov = isMobile ? 52 : isLaptop ? 44 : 46;

  return (
    <Canvas className="orbital-canvas" camera={{ position: cameraPosition, fov: cameraFov }} dpr={[1, maxDpr]}>
      <color attach="background" args={['#0F0F11']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 4]} intensity={2.1} color="#fff1cc" />
      <pointLight position={[-4, -2, -4]} intensity={0.55} color="#7dd3fc" />
      <Stars radius={82} depth={30} count={starCount} factor={isMobile ? 1.25 : 1.7} saturation={0} fade speed={isMobile ? 0.035 : 0.08} />
      <Globe3D
        markers={snapshot.groundNodes
          .filter((node) => node.lat !== undefined && node.lon !== undefined)
          .map<GlobeMarker>((node) => ({
            lat: node.lat!,
            lng: node.lon!,
            label: node.id,
          }))}
        config={{
          atmosphereColor: '#4da6ff',
          atmosphereIntensity: 34,
          bumpScale: 9,
          autoRotateSpeed: 0,
          showGrid,
        }}
        onMarkerClick={(marker) => {
          const node = snapshot.nodes.find((candidate) => candidate.id === marker.label);
          if (node) onSelectNode(node);
        }}
      />
      <LayerRing radius={2.18} color="#94a3b8" label="UAV" />
      <LayerRing radius={2.36} color="#cbd5e1" label="HAPS" />
      <OrbitPath radius={3.35} tilt={-0.85} />
      <OrbitPath radius={3.48} tilt={-0.05} />
      <OrbitPath radius={3.58} tilt={0.65} />

      {snapshot.links.map((link) => (
        <NetworkLinkLine
          key={link.id}
          link={link}
          nodes={snapshot.nodes}
          selected={selectedLinkId === link.id}
          activeRoute={routeContainsLink(snapshot.activeRoute, link)}
          highlightedRoute={routeContainsLink(snapshot.highlightedRoute, link)}
          researchMode={researchMode}
          onClick={() => onSelectLink(link)}
          coarsePointer={isMobile || isTablet}
        />
      ))}
      {snapshot.nodes.filter((node) => node.layer !== 'GROUND').map((node) => (
        <NetworkNodeMesh
          key={node.id}
          node={node}
          selected={node.id === selectedNodeId}
          researchMode={researchMode}
          compactLabels={isMobile}
          activeRoute={snapshot.activeRoute.includes(node.id)}
          onClick={() => onSelectNode(node)}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={isLaptop ? 5.8 : 5.2} maxDistance={isLaptop ? 10.8 : 10} autoRotate autoRotateSpeed={0.12} />
    </Canvas>
  );
}

function OrbitPath({ radius, tilt }: { radius: number; tilt: number }) {
  const points = useMemo<Vec3Tuple[]>(() => {
    return Array.from({ length: 161 }, (_, index) => {
      const phase = (Math.PI * 2 * index) / 160;
      const x = Math.cos(phase) * radius;
      const z = Math.sin(phase) * radius;
      const y = Math.sin(phase * 1.7) * 0.2;
      const cosTilt = Math.cos(tilt);
      const sinTilt = Math.sin(tilt);
      return [x, y * cosTilt - z * sinTilt, y * sinTilt + z * cosTilt];
    });
  }, [radius, tilt]);
  return <Line points={points} color="#475569" lineWidth={0.6} transparent opacity={0.34} />;
}

function LayerRing({ radius, color, label }: { radius: number; color: string; label: string }) {
  const points = useMemo<Vec3Tuple[]>(() => Array.from({ length: 129 }, (_, i) => {
    const phase = (Math.PI * 2 * i) / 128;
    return [Math.cos(phase) * radius, 0, Math.sin(phase) * radius];
  }), [radius]);
  return (
    <group>
      <Line points={points} color={color} lineWidth={0.45} transparent opacity={0.2} />
      <Text position={[radius, 0.05, 0]} fontSize={0.06} color="#94a3b8" anchorX="left">{label}</Text>
    </group>
  );
}

function NetworkNodeMesh({
  node,
  selected,
  researchMode,
  compactLabels,
  activeRoute,
  onClick,
}: {
  node: NetworkNode;
  selected: boolean;
  researchMode: boolean;
  compactLabels: boolean;
  activeRoute: boolean;
  onClick: () => void;
}) {
  const color = node.telemetry.health === 'FAILED' ? '#ef4444' : node.telemetry.health === 'DEGRADED' ? '#D7A13B' : node.layer === 'SPACE' ? '#D8E4F5' : node.layer === 'AIR' ? '#F0C36A' : '#22c55e';
  const size = node.type === 'SATELLITE' ? 0.075 : node.type === 'HAPS' ? 0.065 : node.type === 'UAV' ? 0.052 : node.type === 'GROUND_STATION' ? 0.07 : 0.045;
  return (
    <group position={node.position} onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <mesh scale={selected ? 1.45 : 1}>
        {node.type === 'GROUND_STATION' || node.type === 'SENSOR_CLUSTER' ? <coneGeometry args={[size, size * 2.4, 4]} /> : <octahedronGeometry args={[size, 0]} />}
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={node.telemetry.health === 'FAILED' ? 1.8 : 0.9} roughness={0.4} />
      </mesh>
      {selected && (
        <mesh scale={1.6}>
          <sphereGeometry args={[size * 1.45, 18, 18]} />
          <meshBasicMaterial color="#D7A13B" transparent opacity={0.18} />
        </mesh>
      )}
      {((compactLabels && (selected || activeRoute)) || (!compactLabels && (researchMode || selected))) && (
        <Text position={[0.12, 0.12, 0]} fontSize={0.055} color={selected ? '#F0C36A' : '#A0A0AB'} anchorX="left">
          {node.id}
        </Text>
      )}
    </group>
  );
}

function NetworkLinkLine({
  link,
  nodes,
  selected,
  activeRoute,
  highlightedRoute,
  researchMode,
  coarsePointer,
  onClick,
}: {
  link: NetworkLink;
  nodes: NetworkNode[];
  selected: boolean;
  activeRoute: boolean;
  highlightedRoute: boolean;
  researchMode: boolean;
  coarsePointer: boolean;
  onClick: () => void;
}) {
  const source = nodes.find((node) => node.id === link.source)?.position;
  const target = nodes.find((node) => node.id === link.target)?.position;
  if (!source || !target) return null;
  const color = selected ? '#D7A13B' : activeRoute ? '#F0C36A' : highlightedRoute ? '#C76B4A' : link.sourceLayer === 'AIR' || link.targetLayer === 'AIR' ? '#A0A0AB' : '#6C6C74';
  const mid: Vec3Tuple = [(source[0] + target[0]) / 2, (source[1] + target[1]) / 2, (source[2] + target[2]) / 2];
  return (
    <group onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <Line points={[source, target]} color={color} lineWidth={selected || activeRoute ? 2 : 0.65} transparent opacity={selected || activeRoute ? 0.88 : 0.2 + link.availability * 0.22} />
      {coarsePointer && <Line points={[source, target]} color="#ffffff" lineWidth={10} transparent opacity={0.001} />}
      {researchMode && activeRoute && (
        <Text position={mid} fontSize={0.045} color="#F0C36A">
          {Math.round(link.latency)}ms / {Math.round(link.signalQuality)}%
        </Text>
      )}
    </group>
  );
}
