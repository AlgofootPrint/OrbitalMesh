# OrbitalMesh

**OrbitalMesh** is an interactive research prototype for exploring routing, resilience, telemetry, and edge-intelligence concepts in simulated **Space-Air-Ground Integrated Networks**.

**Live Demo:** https://orbitalmesh.vercel.app  
**Source Code:** https://github.com/Algofootprint/orbitalmesh

It combines a real-time 3D network visualization with a simulation engine that models satellites, high-altitude platforms, UAV relays, ground stations, sensor clusters, routing paths, failures, recovery behavior, telemetry, and experiment results.

> OrbitalMesh is a research-inspired demonstrator. It is not a validated orbital mechanics, RF propagation, or satellite-performance simulator.

---

## Overview

OrbitalMesh was built to explore how a multi-layer communication network behaves when:

- satellite or relay nodes fail
- routes need to be recomputed
- network conditions degrade
- ground-station handoffs occur
- telemetry becomes abnormal
- congestion affects routing decisions
- different network layers cooperate

The project separates **computed routing behavior** from **simulated telemetry values** so that the scope of the prototype remains clear.

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

---

## Key Features

- Interactive 3D Earth and network visualization
- Moving LEO satellites
- UAV and HAPS relay layers
- Dynamic communication links
- Node and link inspection
- Live telemetry
- Dijkstra-based routing
- Adjustable routing weights
- Satellite and ground-node failure simulation
- Automatic rerouting and recovery
- Ground-station handoffs
- Simulated edge anomaly detection
- Multiple network scenarios
- Research Mode
- Experiment Mode
- CSV export
- Responsive desktop, laptop, tablet, and mobile layouts

---

## Routing

OrbitalMesh uses **Dijkstra's algorithm** to calculate the active route.

Route cost is influenced by:

- latency
- packet loss
- congestion
- availability

Users can adjust routing weights and observe how the preferred path changes.

```text
routeCost =
latency
+ packetLossPenalty
+ congestionPenalty
+ availabilityPenalty
```

---

## Telemetry

Each node contains simulated telemetry values including:

- battery level
- temperature
- signal strength
- packet queue
- packet loss
- latency
- anomaly score
- health state

Recent telemetry is displayed through compact charts and sparklines.

---

## Failure and Recovery

Users can simulate failures by forcing nodes offline.

When a failure occurs, OrbitalMesh:

1. removes the failed node from routing
2. rebuilds available network links
3. recalculates the active route
4. generates recovery statistics
5. records the event in the transmission log

Recovery information includes:

- previous route
- new route
- latency difference
- delivery-rate difference
- recovery time

---

## Simulation Scenarios

OrbitalMesh includes several operating scenarios:

- **Normal Operations**
- **Wildfire Monitoring**
- **Satellite Failure**
- **Ground Station Outage**
- **UAV Relay Loss**
- **Network Congestion**

Each scenario changes network conditions and forces the simulator to respond.

---

## Edge Anomaly Detection

OrbitalMesh includes a **simulated edge anomaly detector**.

The anomaly score is influenced by:

- temperature deviation
- battery drain
- packet-loss spikes
- signal noise

The current detector is rule-based and is used to demonstrate how edge intelligence could support network monitoring.

It is not presented as a trained machine-learning model.

---

# Experiment Mode

OrbitalMesh includes a dedicated experiment environment for studying:

**Impact of Progressive Satellite Failures on Space-Air-Ground Network Resilience**

The experiment evaluates:

- 0 failed satellites
- 1 failed satellite
- 2 failed satellites
- 3 failed satellites

Each condition can be repeated using a deterministic random seed.

---

## Experiment Metrics

The experiment records:

- average end-to-end latency
- packet delivery rate
- average route hop count
- recovery time
- successful reroutes
- disconnected routes
- average packet loss
- network resilience score
- old route
- new route
- route cost

---

## Experiment Results

Results are displayed using:

- summary tables
- latency charts
- packet-delivery charts
- resilience charts
- plain-language observations
- experiment history

Users can export both raw and summarized experiment data as CSV files.

---

## Research Mode

Research Mode exposes additional technical information including:

- node IDs
- route information
- route cost
- topology changes
- failed-node IDs
- simulation timestep
- event timestamps
- recovery details

---

## Responsive Design

OrbitalMesh is designed to work across:

- ultrawide displays
- desktops
- laptops
- tablets
- mobile devices

On smaller screens, the main visualization remains the focus while controls move into drawers and bottom-sheet panels.

---

## Tech Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- React Three Fiber
- Three.js
- Recharts

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/Algofootprint/orbitalmesh.git
```

Enter the project:

```bash
cd orbitalmesh
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## Research Scope and Limitations

OrbitalMesh is a research-inspired educational and experimental prototype.

### Computed by the application

- Dijkstra routing
- route selection
- failure handling
- topology updates
- route recovery
- handoff logic
- route-cost calculation
- experiment aggregation

### Simulated

- battery levels
- temperature
- signal quality
- packet-loss variation
- congestion
- anomaly scores
- some communication characteristics

The project does **not** claim to provide:

- validated RF propagation results
- accurate orbital-mechanics modelling
- engineering-grade satellite performance predictions
- validated real-world network benchmarks

Experiment results should be interpreted as **relative behavior within the OrbitalMesh simulation model**.

---

## Future Work

Planned areas for further development include:

- real machine-learning-based anomaly detection
- comparison of anomaly-detection methods
- improved orbital mechanics
- more realistic link-budget models
- additional routing algorithms
- energy-aware routing
- larger satellite constellations
- more Space-Air-Ground experiments

---

## Author

**Damilola Ayobami Ojoawo**

Electrical & Electronics Engineering  
Embedded Intelligence | Networked Systems

Research prototype exploring resilient Space-Air-Ground networks.
