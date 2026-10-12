# OrbitalMesh

**OrbitalMesh** is an interactive research prototype for exploring routing, resilience, telemetry, and edge-intelligence concepts in simulated **Space-Air-Ground Integrated Networks**.

The project combines a real-time 3D network visualization with a simulation engine that models satellites, high-altitude platforms, UAV relays, ground stations, sensor clusters, routing paths, failures, recovery behavior, telemetry, and experiment results.

> OrbitalMesh is a research-inspired demonstrator. It is not a validated orbital mechanics, RF propagation, or satellite-performance simulator.

---

## Overview

OrbitalMesh was built to explore how a multi-layer communication network might behave when:

- satellite or relay nodes fail
- routes need to be recomputed
- network conditions degrade
- ground-station handoffs occur
- telemetry becomes abnormal
- congestion affects routing decisions
- multiple network layers need to cooperate

The application separates **computed network behavior** from **simulated telemetry values** so that the scope of the prototype remains clear.

---

## Network Architecture

OrbitalMesh represents three communication layers:

### Space

- Low Earth Orbit satellites
- satellite-to-satellite communication links
- satellite-to-ground links
- satellite-to-HAPS links

### Air

- High Altitude Platform Stations (HAPS)
- UAV relay nodes
- air-to-ground communication links

### Ground

- ground stations
- environmental sensor clusters
- command and monitoring endpoints

Together, these nodes form a simulated Space-Air-Ground communication mesh.

---

## Key Features

### Interactive 3D Network

The main interface includes:

- 3D Earth visualization
- moving LEO satellites
- UAV and HAPS relay layers
- ground stations
- network links
- active routing paths
- selected-node highlighting
- research labels
- touch and mouse interaction

Users can rotate the Earth, zoom, select nodes, and inspect links.

---

### Network Routing

OrbitalMesh uses **Dijkstra's algorithm** to calculate network routes.

Route cost is influenced by:

- latency
- packet loss
- congestion
- availability

Users can adjust routing weights and observe how the selected path changes.

Example:

```text
routeCost =
latency
+ packetLossPenalty
+ congestionPenalty
+ availabilityPenalty
```
