# OrbitalMesh

OrbitalMesh is a research-inspired Space-Air-Ground Integrated Network simulator built with React, TypeScript, Vite, Tailwind CSS, React Three Fiber, Three.js, and Recharts-style telemetry sparklines.

## Research Scope and Limitations

OrbitalMesh is an educational research demonstrator, not an orbital mechanics, RF propagation, spectrum planning, or flight-validation tool. It is designed to explain Space-Air-Ground Integrated Network concepts through interactive topology, telemetry, handoff, routing, and resilience scenarios.

Actually implemented computations:

- Dijkstra shortest-path routing
- Route-cost calculation from latency, packet-loss weight, congestion weight, and availability penalty
- Node-to-node distance estimates from the 3D scene coordinates
- Link range and visibility eligibility checks
- Active route selection and next-hop assignment
- Ground-station handoff selection by link quality
- Recovery route calculation after satellite, UAV, and ground-station failures
- CSV export for telemetry, events, failures, and handoffs

Simulated values:

- Battery state
- Temperature
- Signal noise and signal quality variation
- Packet queue pressure
- Packet-loss variation
- Congestion pressure
- Equipment health state
- Simulated edge anomaly detector score
- Recovery timing

The edge anomaly detector is a transparent telemetry-rule simulation. It is not a trained machine-learning model and should not be interpreted as real AI inference. The score is generated from temperature deviation, battery drain, packet-loss spike, and signal-noise contributors.

Earth rendering is a performant visual approximation using generated texture layers for surface color, night-side city lights, clouds, atmosphere, and an optional latitude/longitude grid. Ground stations and environmental sensor clusters use real latitude/longitude coordinates, but the scene is scaled for visualization rather than scientific orbital or geodetic accuracy.

No scientific validation is claimed. The simulator is intended for university-style demonstrations, classroom discussion, architecture prototyping, and explanation of resilience concepts in constrained multi-layer networks.
