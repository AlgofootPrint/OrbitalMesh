import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Beaker, CheckCircle2, Download, Info, ListChecks, Menu, Radio, RotateCcw, Route, Satellite, Settings2 } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { OrbitalScene } from './components/OrbitalScene';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { ScrollArea } from './components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Slider } from './components/ui/slider';
import { Switch } from './components/ui/switch';
import { Table, TableBody, TableCell, TableRow } from './components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { ShootingStars } from './components/ui/shooting-stars';
import { StarsBackground } from './components/ui/stars-background';
import { OrbitalMeshSimulation } from './simulation/engine';
import type { NetworkLink, NetworkNode, Scenario, SimulationSnapshot } from './simulation/models';
import { SCENARIOS } from './simulation/models';
import { routeCostParts } from './simulation/routing';

type ExperimentSheet = 'scenarios' | 'telemetry' | 'events' | 'controls';

interface ExperimentProgress {
  condition: number;
  repetition: number;
  stage: string;
  failedNodeIds: string[];
}

interface ExperimentRow {
  seed: number;
  condition: number;
  failed_satellites: number;
  repetition: number;
  failed_node_ids: string;
  avg_latency_ms: number;
  packet_delivery_percent: number;
  avg_hop_count: number;
  recovery_time_seconds: number;
  successful_reroutes: number;
  disconnected_routes: number;
  avg_packet_loss_percent: number;
  resilience_score: number;
  old_route: string;
  new_route: string;
  route_cost: number;
  recovery_event_time: string;
  final_timestep: number;
}

interface ExperimentSummary {
  condition: number;
  failed_satellites: number;
  avg_latency_ms: number;
  packet_delivery_percent: number;
  avg_hop_count: number;
  recovery_time_seconds: number;
  successful_reroutes: number;
  disconnected_routes: number;
  avg_packet_loss_percent: number;
  resilience_score: number;
}

interface ExperimentRun {
  id: string;
  createdAt: string;
  seed: number;
  observationWindow: number;
  repetitions: number;
  rows: ExperimentRow[];
  summaries: ExperimentSummary[];
}

const EXPERIMENT_HISTORY_KEY = 'orbitalmesh-experiment-history';
const SCENARIO_RAIL_COLLAPSED_KEY = 'orbitalmesh-scenario-rail-collapsed';
const INSPECTOR_COLLAPSED_KEY = 'orbitalmesh-inspector-collapsed';
const CURRENT_YEAR = new Date().getFullYear();

type ExperimentNotice = {
  type: 'success' | 'error';
  message: string;
} | null;

export function App() {
  const simulation = useMemo(() => new OrbitalMeshSimulation(), []);
  const [snapshot, setSnapshot] = useState<SimulationSnapshot>(() => simulation.getSnapshot());
  const [selectedNodeId, setSelectedNodeId] = useState('SAT-01');
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [researchMode, setResearchMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [logOpen, setLogOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !isLaptopViewport();
  });
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [activeSheet, setActiveSheet] = useState<ExperimentSheet | null>(null);
  const [experimentSeed, setExperimentSeed] = useState(42);
  const [observationWindow, setObservationWindow] = useState(30);
  const [experimentRepetitions, setExperimentRepetitions] = useState(5);
  const [experimentProgress, setExperimentProgress] = useState<ExperimentProgress | null>(null);
  const [experimentRunning, setExperimentRunning] = useState(false);
  const [experimentRun, setExperimentRun] = useState<ExperimentRun | null>(null);
  const [experimentHistory, setExperimentHistory] = useState<ExperimentRun[]>([]);
  const [experimentPageOpen, setExperimentPageOpen] = useState(false);
  const [experimentNotice, setExperimentNotice] = useState<ExperimentNotice>(null);
  const [scenarioRailCollapsed, setScenarioRailCollapsed] = useState(() => readStoredBoolean(SCENARIO_RAIL_COLLAPSED_KEY, false));
  const [inspectorCollapsed, setInspectorCollapsed] = useState(() => readStoredBoolean(INSPECTOR_COLLAPSED_KEY, false));

  useEffect(() => {
    const timer = window.setInterval(() => setSnapshot(simulation.step(simulationSpeed)), 900);
    return () => window.clearInterval(timer);
  }, [simulation, simulationSpeed]);

  useEffect(() => {
    document.title = experimentPageOpen
      ? 'Experiment Mode | OrbitalMesh'
      : 'OrbitalMesh | Satellite Network Simulation';
  }, [experimentPageOpen]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(EXPERIMENT_HISTORY_KEY);
      if (stored) setExperimentHistory(JSON.parse(stored));
    } catch {
      setExperimentHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SCENARIO_RAIL_COLLAPSED_KEY, String(scenarioRailCollapsed));
    } catch {
      // Panel state is a UI preference; ignore unavailable storage.
    }
  }, [scenarioRailCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(INSPECTOR_COLLAPSED_KEY, String(inspectorCollapsed));
    } catch {
      // Panel state is a UI preference; ignore unavailable storage.
    }
  }, [inspectorCollapsed]);

  const selectedNode = snapshot.nodes.find((node) => node.id === selectedNodeId) ?? snapshot.nodes[0];
  const selectedLink = selectedLinkId ? snapshot.links.find((link) => link.id === selectedLinkId) ?? null : null;
  const edgeAlert = snapshot.nodes.find((node) => node.telemetry.anomalyScore > 0.82);

  const setScenario = (scenario: Scenario) => {
    simulation.setScenario(scenario);
    setSnapshot(simulation.getSnapshot());
  };

  const selectNode = (node: NetworkNode) => {
    setSelectedNodeId(node.id);
    setSelectedLinkId(null);
    if (window.matchMedia('(max-width: 1279px)').matches) setActiveSheet('telemetry');
  };

  const selectLink = (link: NetworkLink) => {
    setSelectedLinkId(link.id);
    if (window.matchMedia('(max-width: 1279px)').matches) setActiveSheet('telemetry');
  };

  const updateWeight = (key: keyof SimulationSnapshot['routingWeights'], value: number[]) => {
    const next = { ...snapshot.routingWeights, [key]: value[0] };
    simulation.setRoutingWeights(next);
    setSnapshot(simulation.getSnapshot());
  };

  const exportCsv = (kind: 'telemetry' | 'events' | 'failures' | 'handoffs') => {
    const csv = buildCsv(kind, snapshot);
    downloadCsv(`orbitalmesh-${kind}.csv`, csv);
  };

  const saveExperimentRun = (run: ExperimentRun) => {
    setExperimentRun(run);
    setExperimentHistory((previous) => {
      const next = [run, ...previous].slice(0, 8);
      try {
        window.localStorage.setItem(EXPERIMENT_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // History persistence is optional; keep the in-memory result if storage is unavailable.
      }
      return next;
    });
  };

  const runExperiment = async () => {
    if (experimentRunning) return;
    setExperimentRunning(true);
    setExperimentNotice(null);
    setExperimentProgress({ condition: 0, repetition: 0, stage: 'Initializing experiment...', failedNodeIds: [] });

    const rows: ExperimentRow[] = [];
    const repetitions = Math.max(1, Math.min(20, Math.round(experimentRepetitions)));
    const windowSeconds = Math.max(5, Math.min(180, Math.round(observationWindow)));
    const seed = Math.round(experimentSeed);

    try {
      for (let condition = 0; condition <= 3; condition += 1) {
        for (let repetition = 1; repetition <= repetitions; repetition += 1) {
          setExperimentProgress({ condition, repetition, stage: 'Resetting baseline topology...', failedNodeIds: [] });
          await waitForFrame();

          const runSeed = seed + condition * 1009 + repetition * 97;
          const experimentSimulation = new OrbitalMeshSimulation({ seed: runSeed });
          const baseline = experimentSimulation.getSnapshot();
          const selectedFailures = chooseFailedSatellites(baseline.satellites.map((node) => node.id), condition, runSeed);
          let oldRoute = baseline.activeRoute;
          let successfulReroutes = 0;

          for (const failedId of selectedFailures) {
            setExperimentProgress({
              condition,
              repetition,
              stage: `Simulating ${failedId} failure...`,
              failedNodeIds: selectedFailures,
            });
            await waitForFrame();
            const before = experimentSimulation.getSnapshot().activeRoute;
            experimentSimulation.forceFailure(failedId);
            const after = experimentSimulation.getSnapshot().activeRoute;
            if (after.length >= 2 && after.join('|') !== before.join('|')) successfulReroutes += 1;
            oldRoute = before;
          }

          setExperimentProgress({
            condition,
            repetition,
            stage: 'Recomputing route and collecting metrics...',
            failedNodeIds: selectedFailures,
          });

          const samples: SimulationSnapshot[] = [];
          let disconnectedRoutes = 0;
          for (let second = 0; second < windowSeconds; second += 1) {
            const sample = experimentSimulation.step(1);
            samples.push(sample);
            if (sample.activeRoute.length < 2) disconnectedRoutes += 1;
            if (second % 6 === 0) await waitForFrame();
          }

          const finalSnapshot = samples[samples.length - 1] ?? experimentSimulation.getSnapshot();
          const recovery = finalSnapshot.recovery;
          rows.push({
            seed,
            condition,
            failed_satellites: condition,
            repetition,
            failed_node_ids: selectedFailures.join(' '),
            avg_latency_ms: mean(samples.map((sample) => sample.metrics.networkLatency)),
            packet_delivery_percent: mean(samples.map((sample) => sample.metrics.packetDeliveryRate)),
            avg_hop_count: mean(samples.map((sample) => Math.max(0, sample.activeRoute.length - 1))),
            recovery_time_seconds: condition === 0 ? 0 : (recovery?.recoveryTimeMs ?? 0) / 1000,
            successful_reroutes: successfulReroutes,
            disconnected_routes: disconnectedRoutes,
            avg_packet_loss_percent: mean(samples.map((sample) => routePacketLossPercent(sample))),
            resilience_score: mean(samples.map((sample) => sample.metrics.resilienceScore)),
            old_route: recovery?.oldRoute.join(' -> ') || oldRoute.join(' -> '),
            new_route: recovery?.newRoute.join(' -> ') || finalSnapshot.activeRoute.join(' -> '),
            route_cost: finalSnapshot.routeComputation.cost,
            recovery_event_time: recovery?.recoveredAt ?? '-',
            final_timestep: finalSnapshot.timestep,
          });
        }
      }

      const summaries = summarizeExperimentRows(rows);
      saveExperimentRun({
        id: `${Date.now()}-${seed}`,
        createdAt: new Date().toISOString(),
        seed,
        observationWindow: windowSeconds,
        repetitions,
        rows,
        summaries,
      });
      setExperimentProgress({ condition: 3, repetition: repetitions, stage: 'Experiment complete.', failedNodeIds: [] });
      setExperimentNotice({ type: 'success', message: 'Experiment completed and results were saved to local history.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown experiment error.';
      setExperimentProgress({
        condition: 0,
        repetition: 0,
        stage: `Experiment failed: ${message}`,
        failedNodeIds: [],
      });
      setExperimentNotice({ type: 'error', message: `Experiment failed: ${message}` });
    } finally {
      setExperimentRunning(false);
    }
  };

  const resetExperimentResults = () => {
    setExperimentRun(null);
    setExperimentProgress(null);
    setExperimentNotice({ type: 'success', message: 'Experiment results were cleared from the current view.' });
  };

  const exportExperimentCsv = () => {
    if (!experimentRun) {
      setExperimentNotice({ type: 'error', message: 'Run an experiment before exporting results.' });
      return;
    }
    downloadCsv(`orbitalmesh-experiment-${experimentRun.seed}-rows.csv`, buildExperimentRowsCsv(experimentRun.rows));
    downloadCsv(`orbitalmesh-experiment-${experimentRun.seed}-summary.csv`, buildExperimentSummaryCsv(experimentRun.summaries));
    setExperimentNotice({ type: 'success', message: 'Experiment CSV files were exported.' });
  };

  if (experimentPageOpen) {
    return (
      <TooltipProvider>
        <main className="experiment-page min-h-dvh bg-background text-foreground">
          <StarsBackground
            className="pointer-events-none opacity-20"
            starDensity={0.00006}
            allStarsTwinkle={false}
          />
          <section className="experiment-page-shell">
            <header className="experiment-page-header">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Beaker size={15} className="text-signalSoft" />
                  Experiment Mode
                </div>
                <button
                  type="button"
                  className="experiment-page-title text-left"
                  onClick={() => setExperimentPageOpen(false)}
                  aria-label="Return to OrbitalMesh simulation"
                >
                  Progressive Satellite Failure Experiment
                </button>
              </div>
              <Button variant="outline" onClick={() => setExperimentPageOpen(false)}>Back to simulation</Button>
            </header>
            <ExperimentPanel
              run={experimentRun}
              history={experimentHistory}
              progress={experimentProgress}
              notice={experimentNotice}
              running={experimentRunning}
              seed={experimentSeed}
              observationWindow={observationWindow}
              repetitions={experimentRepetitions}
              researchMode={researchMode}
              onSeed={setExperimentSeed}
              onObservationWindow={setObservationWindow}
              onRepetitions={setExperimentRepetitions}
              onRun={runExperiment}
              onReset={resetExperimentResults}
              onExport={exportExperimentCsv}
              onLoadRun={setExperimentRun}
            />
          </section>
        </main>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <main className="relative min-h-dvh overflow-x-hidden bg-background text-foreground md:h-screen md:overflow-hidden">
        <StarsBackground
          className="pointer-events-none opacity-25"
          starDensity={0.00008}
          allStarsTwinkle={false}
          twinkleProbability={0.18}
          minTwinkleSpeed={1.8}
          maxTwinkleSpeed={3.2}
        />
        <ShootingStars
          className="pointer-events-none opacity-25"
          minSpeed={4}
          maxSpeed={8}
          minDelay={9000}
          maxDelay={18000}
          starColor="#D7A13B"
          trailColor="#94a3b8"
          starWidth={7}
          starHeight={1}
        />

        <section className={`artifact-layout relative z-10 flex min-h-dvh flex-col pb-4 md:block md:h-screen md:pb-0 ${scenarioRailCollapsed ? 'scenario-rail-collapsed' : ''} ${inspectorCollapsed ? 'inspector-collapsed' : ''}`}>
          <div className="artifact-scene">
            <OrbitalScene
              snapshot={snapshot}
              selectedNodeId={selectedNode.id}
              selectedLinkId={selectedLink?.id ?? null}
              researchMode={researchMode}
              showGrid={showGrid}
              onSelectNode={selectNode}
              onSelectLink={selectLink}
            />
          </div>

          <div className="artifact-scrim pointer-events-none bg-[radial-gradient(circle_at_42%_46%,transparent_0,transparent_34%,rgba(5,7,13,0.34)_66%,rgba(5,7,13,0.86)_100%)]" />

          <header className="artifact-header">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Satellite size={15} className="text-signalSoft" />
                <span>Research artifact 04</span>
                <span className="hidden sm:inline">Timestep <span className="font-mono text-foreground">{snapshot.timestep}</span></span>
              </div>
              <h1 className="artifact-title">OrbitalMesh</h1>
              <div className="mobile-scenario-status">{snapshot.scenario}</div>
              <p className="artifact-caption">
                A live Space-Air-Ground mesh, rendered as a deep-space object study. Routes, failures,
                telemetry, handoffs, and simulated edge anomaly detection remain active.
              </p>
            </div>

            <div className="artifact-actions pointer-events-auto flex flex-wrap justify-start gap-2 md:justify-end">
              <ModeFillButton label="Research" active={researchMode} onToggle={() => setResearchMode(!researchMode)} />
              <ModeFillButton label="Grid" active={showGrid} onToggle={() => setShowGrid(!showGrid)} />
              <Button className="mobile-overflow" variant="outline" size="icon" aria-label="Open controls" onClick={() => setActiveSheet('controls')}><Menu size={15} /></Button>
              <Button className="drawer-launcher" variant="outline" onClick={() => setActiveSheet('scenarios')}><ListChecks size={15} />Scenarios</Button>
              <Button className="drawer-launcher" variant="outline" onClick={() => setActiveSheet('telemetry')}><Activity size={15} />Telemetry</Button>
              <Button className="experiment-launcher" variant="outline" onClick={() => setExperimentPageOpen(true)}><Beaker size={15} />Experiment</Button>
              <Button className="drawer-launcher secondary-launcher" variant="outline" onClick={() => setActiveSheet('events')}><Radio size={15} />Events</Button>
              <Button className="drawer-launcher secondary-launcher" variant="outline" onClick={() => setActiveSheet('controls')}><Settings2 size={15} />Controls</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="laptop-utility-launcher" variant="outline" size="icon" title="More controls" aria-label="More controls"><Menu size={15} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setActiveSheet('events')}>Events</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setActiveSheet('controls')}>Controls</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('telemetry')}>Export telemetry CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('events')}>Export events CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('failures')}>Export failures CSV</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('handoffs')}>Export handoffs CSV</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="desktop-utility" variant="outline" size="icon" title="About simulation" aria-label="About simulation"><Info size={15} /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>About Simulation</DialogTitle>
                    <DialogDescription>Computed routing is separated from mocked telemetry.</DialogDescription>
                  </DialogHeader>
                  <AboutSimulation />
                </DialogContent>
              </Dialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="desktop-utility" variant="outline" size="icon" title="Export CSV" aria-label="Export CSV"><Download size={15} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => exportCsv('telemetry')}>Node telemetry</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('events')}>Routing events</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('failures')}>Failures</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportCsv('handoffs')}>Handoffs</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <ScenarioDeck
            current={snapshot.scenario}
            collapsed={scenarioRailCollapsed}
            onSelect={setScenario}
            onToggleCollapsed={() => setScenarioRailCollapsed((collapsed) => !collapsed)}
          />

          <aside className={`artifact-inspector ${inspectorCollapsed ? 'artifact-inspector-collapsed' : ''}`}>
            <Button
              className="panel-collapse-button inspector-collapse-button"
              variant="ghost"
              size="icon"
              title={inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
              aria-label={inspectorCollapsed ? 'Expand inspector' : 'Collapse inspector'}
              onClick={() => setInspectorCollapsed((collapsed) => !collapsed)}
            >
              <Activity size={15} />
            </Button>
            {!inspectorCollapsed && (
              <ScrollArea className="h-full">
                <div className="space-y-4">
                  <ObjectSummary snapshot={snapshot} node={selectedNode} />
                  <Tabs defaultValue="object">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="object">Object</TabsTrigger>
                      <TabsTrigger value="route">Route</TabsTrigger>
                      <TabsTrigger value="event">Event</TabsTrigger>
                    </TabsList>
                    <TabsContent value="object">
                      <NodeInspector node={selectedNode} activeRoute={snapshot.activeRoute} />
                      <LinkInspector link={selectedLink} weights={snapshot.routingWeights} />
                    </TabsContent>
                    <TabsContent value="route">
                      <RoutingPanel snapshot={snapshot} onWeight={updateWeight} />
                    </TabsContent>
                    <TabsContent value="event">
                      <FailurePanel
                        snapshot={snapshot}
                        onFail={(id) => {
                          simulation.forceFailure(id);
                          setSnapshot(simulation.getSnapshot());
                        }}
                        onRestore={(id) => {
                          simulation.restoreNode(id);
                          setSnapshot(simulation.getSnapshot());
                        }}
                        onFailSatellites={() => {
                          simulation.forceSatelliteConstellationFailure();
                          setSnapshot(simulation.getSnapshot());
                        }}
                        onRestoreSatellites={() => {
                          simulation.restoreSatelliteConstellation();
                          setSnapshot(simulation.getSnapshot());
                        }}
                      />
                      {edgeAlert && <EdgeAiPanel node={edgeAlert} />}
                      {snapshot.recovery && <RecoveryPanel snapshot={snapshot} />}
                      <details className="about-details">
                        <summary>About simulation</summary>
                        <AboutSimulation />
                      </details>
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            )}
          </aside>
          <TransmissionLog snapshot={snapshot} open={logOpen} onOpen={setLogOpen} researchMode={researchMode} />
          <footer className="artifact-footer">
            <p>&copy; {CURRENT_YEAR} Damilola Ayobami Ojoawo</p>
            <p>Electrical &amp; Electronics Engineering | Embedded Intelligence | Networked Systems</p>
          </footer>
          <ResponsiveSheets
            activeSheet={activeSheet}
            onOpenChange={(open) => {
              if (!open) setActiveSheet(null);
            }}
            snapshot={snapshot}
            selectedNode={selectedNode}
            selectedLink={selectedLink}
            weights={snapshot.routingWeights}
            researchMode={researchMode}
            showGrid={showGrid}
            simulationSpeed={simulationSpeed}
            onResearchMode={setResearchMode}
            onShowGrid={setShowGrid}
            onSpeed={setSimulationSpeed}
            onScenario={setScenario}
            onWeight={updateWeight}
            onFail={(id) => {
              simulation.forceFailure(id);
              setSnapshot(simulation.getSnapshot());
            }}
            onRestore={(id) => {
              simulation.restoreNode(id);
              setSnapshot(simulation.getSnapshot());
            }}
            onFailSatellites={() => {
              simulation.forceSatelliteConstellationFailure();
              setSnapshot(simulation.getSnapshot());
            }}
            onRestoreSatellites={() => {
              simulation.restoreSatelliteConstellation();
              setSnapshot(simulation.getSnapshot());
            }}
            onReset={() => setScenario(snapshot.scenario)}
            onExport={exportCsv}
            onOpenExperiment={() => setExperimentPageOpen(true)}
          />
          <MobileActionBar onOpen={setActiveSheet} onOpenExperiment={() => setExperimentPageOpen(true)} />
        </section>
      </main>
    </TooltipProvider>
  );
}

function ResponsiveSheets({
  activeSheet,
  onOpenChange,
  snapshot,
  selectedNode,
  selectedLink,
  weights,
  researchMode,
  showGrid,
  simulationSpeed,
  onResearchMode,
  onShowGrid,
  onSpeed,
  onScenario,
  onWeight,
  onFail,
  onRestore,
  onFailSatellites,
  onRestoreSatellites,
  onReset,
  onExport,
  onOpenExperiment,
}: {
  activeSheet: ExperimentSheet | null;
  onOpenChange: (open: boolean) => void;
  snapshot: SimulationSnapshot;
  selectedNode: NetworkNode;
  selectedLink: NetworkLink | null;
  weights: SimulationSnapshot['routingWeights'];
  researchMode: boolean;
  showGrid: boolean;
  simulationSpeed: number;
  onResearchMode: (value: boolean) => void;
  onShowGrid: (value: boolean) => void;
  onSpeed: (value: number) => void;
  onScenario: (scenario: Scenario) => void;
  onWeight: (key: keyof SimulationSnapshot['routingWeights'], value: number[]) => void;
  onFail: (id: string) => void;
  onRestore: (id: string) => void;
  onFailSatellites: () => void;
  onRestoreSatellites: () => void;
  onReset: () => void;
  onExport: (kind: 'telemetry' | 'events' | 'failures' | 'handoffs') => void;
  onOpenExperiment: () => void;
}) {
  const open = activeSheet !== null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`responsive-sheet responsive-sheet-${activeSheet ?? 'closed'}`}>
        {activeSheet === 'scenarios' && (
          <>
            <SheetHeader>
              <SheetTitle>Scenarios</SheetTitle>
              <SheetDescription>{snapshot.scenario}</SheetDescription>
            </SheetHeader>
            <ScenarioDeck current={snapshot.scenario} onSelect={onScenario} />
          </>
        )}
        {activeSheet === 'telemetry' && (
          <>
            <SheetHeader>
              <SheetTitle>Telemetry</SheetTitle>
              <SheetDescription>{selectedNode.id} / {selectedNode.type.replace('_', ' ')}</SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(100%-4rem)]">
              <div className="space-y-4 pr-2">
                <ObjectSummary snapshot={snapshot} node={selectedNode} />
                <NodeInspector node={selectedNode} activeRoute={snapshot.activeRoute} />
                <LinkInspector link={selectedLink} weights={weights} />
                <RoutingPanel snapshot={snapshot} onWeight={onWeight} />
              </div>
            </ScrollArea>
          </>
        )}
        {activeSheet === 'events' && (
          <>
            <SheetHeader>
              <SheetTitle>Event Timeline</SheetTitle>
              <SheetDescription>{snapshot.events.length} recent network events</SheetDescription>
            </SheetHeader>
            <TransmissionLog snapshot={snapshot} open onOpen={() => undefined} researchMode={researchMode} fixedOpen />
          </>
        )}
        {activeSheet === 'controls' && (
          <>
            <SheetHeader>
              <SheetTitle>Controls</SheetTitle>
              <SheetDescription>Routing, exports, failures, and view options</SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-4 h-[calc(100%-4rem)]">
              <ControlsPanel
                snapshot={snapshot}
                researchMode={researchMode}
                showGrid={showGrid}
                simulationSpeed={simulationSpeed}
                onResearchMode={onResearchMode}
                onShowGrid={onShowGrid}
                onSpeed={onSpeed}
                onWeight={onWeight}
                onFail={onFail}
                onRestore={onRestore}
                onFailSatellites={onFailSatellites}
                onRestoreSatellites={onRestoreSatellites}
                onReset={onReset}
                onExport={onExport}
                onOpenExperiment={onOpenExperiment}
              />
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MobileActionBar({ onOpen, onOpenExperiment }: { onOpen: (sheet: ExperimentSheet) => void; onOpenExperiment: () => void }) {
  return (
    <nav className="mobile-action-bar" aria-label="Mobile navigation">
      <button type="button" onClick={() => onOpen('scenarios')}><ListChecks size={18} /><span>Scenarios</span></button>
      <button type="button" onClick={() => onOpen('telemetry')}><Activity size={18} /><span>Telemetry</span></button>
      <button type="button" onClick={onOpenExperiment}><Beaker size={18} /><span>Experiment</span></button>
      <button type="button" onClick={() => onOpen('events')}><Radio size={18} /><span>Events</span></button>
      <button type="button" onClick={() => onOpen('controls')}><Menu size={18} /><span>Controls</span></button>
    </nav>
  );
}

function ScenarioDeck({
  current,
  collapsed = false,
  onSelect,
  onToggleCollapsed,
}: {
  current: Scenario;
  collapsed?: boolean;
  onSelect: (scenario: Scenario) => void;
  onToggleCollapsed?: () => void;
}) {
  return (
    <nav className={`artifact-scenarios ${collapsed ? 'artifact-scenarios-collapsed' : ''}`} aria-label="Scenario controls">
      <div className="scenario-panel-header mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="scenario-panel-title">Scenario sequence</span>
        {onToggleCollapsed && (
          <Button
            className="panel-collapse-button"
            variant="ghost"
            size="icon"
            title={collapsed ? 'Expand scenarios' : 'Collapse scenarios'}
            aria-label={collapsed ? 'Expand scenarios' : 'Collapse scenarios'}
            onClick={onToggleCollapsed}
          >
            <ListChecks size={15} />
          </Button>
        )}
      </div>
      <div className="scenario-grid grid gap-1.5">
        {SCENARIOS.map((scenario, index) => {
          const active = scenario === current;
          return (
            <button
              key={scenario}
              type="button"
              onClick={() => onSelect(scenario)}
              className={`scenario-button ${active ? 'scenario-button-active' : ''}`}
              title={scenario}
            >
              <span className="font-mono text-xs">{String(index + 1).padStart(2, '0')}</span>
              <span className="truncate">{scenario}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ObjectSummary({ snapshot, node }: { snapshot: SimulationSnapshot; node: NetworkNode }) {
  return (
    <section className="artifact-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Selected object</div>
          <h2 className="mt-1 font-display text-3xl font-extrabold leading-none text-foreground">{node.id}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{node.label} / {node.type.replace('_', ' ')}</p>
        </div>
        <HealthBadge node={node} />
      </div>
      <div className="metric-grid mt-5 grid grid-cols-3 gap-3">
        <ValueBlock label="Latency" value={`${snapshot.metrics.networkLatency} ms`} />
        <ValueBlock label="Delivery" value={`${snapshot.metrics.packetDeliveryRate.toFixed(1)}%`} />
        <ValueBlock label="Resilience" value={`${snapshot.metrics.resilienceScore}%`} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        The active route is recalculated from live link cost. Visual movement is cinematic; routing, telemetry,
        recovery, and handoff state are still computed by the simulator.
      </p>
    </section>
  );
}

function NodeInspector({ node, activeRoute }: { node: NetworkNode; activeRoute: string[] }) {
  const rows = [
    ['Type', node.type],
    ['Position', node.lat !== undefined ? `${node.lat.toFixed(2)}, ${node.lon?.toFixed(2)}` : node.position.map((v) => v.toFixed(2)).join(', ')],
    ['Altitude', `${node.altitude} km`],
    ['Battery', `${node.telemetry.battery.toFixed(1)}%`],
    ['Temperature', `${node.telemetry.temperature.toFixed(1)} C`],
    ['Signal', `${Math.round(node.telemetry.signalStrength)}%`],
    ['Packet queue', `${node.telemetry.packetQueue}`],
    ['Anomaly score', node.telemetry.anomalyScore.toFixed(2)],
    ['Current route', node.currentRoute.length || activeRoute.includes(node.id) ? 'Yes' : 'No'],
    ['Next hop', node.nextHop ?? '-'],
  ];
  return (
    <section className="artifact-panel">
      <SectionLabel title="Object inspection" />
      <Table className="mt-2">
        <TableBody>
          {rows.map(([label, value]) => (
            <TableRow key={label}>
              <TableCell className="text-muted-foreground">{label}</TableCell>
              <TableCell className="text-right font-mono text-xs">{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Sparkline label="Latency" values={node.telemetryHistory.map((point) => point.latency)} />
        <Sparkline label="Loss" values={node.telemetryHistory.map((point) => point.packetLoss)} />
        <Sparkline label="Temp" values={node.telemetryHistory.map((point) => point.temperature)} />
      </div>
    </section>
  );
}

function LinkInspector({ link, weights }: { link: NetworkLink | null; weights: SimulationSnapshot['routingWeights'] }) {
  if (!link) {
    return (
      <section className="artifact-panel">
        <SectionLabel title="Link inspection" />
        <p className="mt-3 text-sm text-muted-foreground">Select a visible communication link to reveal distance, loss, quality, and route cost.</p>
      </section>
    );
  }
  const parts = routeCostParts(link, weights);
  return (
    <section className="artifact-panel">
      <SectionLabel title="Link inspection" />
      <Table className="mt-2">
        <TableBody>
          {[
            ['Source', link.source],
            ['Destination', link.target],
            ['Distance', `${link.distance} km`],
            ['Latency', `${link.latency} ms`],
            ['Bandwidth', `${link.bandwidth} Mbps`],
            ['Packet loss', `${(link.packetLoss * 100).toFixed(2)}%`],
            ['Signal quality', `${link.signalQuality}%`],
            ['Route cost', parts.total.toFixed(2)],
          ].map(([label, value]) => (
            <TableRow key={label}>
              <TableCell className="text-muted-foreground">{label}</TableCell>
              <TableCell className="text-right font-mono text-xs">{value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <pre className="mt-3 overflow-auto border border-border bg-muted/70 p-3 font-mono text-[11px] text-muted-foreground">{`routeCost =
latency (${parts.latency.toFixed(2)})
+ packetLossWeight (${parts.packetLossWeight.toFixed(2)})
+ congestionWeight (${parts.congestionWeight.toFixed(2)})
+ availabilityPenalty (${parts.availabilityPenalty.toFixed(2)})
= ${parts.total.toFixed(2)}`}</pre>
    </section>
  );
}

function RoutingPanel({ snapshot, onWeight }: { snapshot: SimulationSnapshot; onWeight: (key: keyof SimulationSnapshot['routingWeights'], value: number[]) => void }) {
  return (
    <section className="artifact-panel">
      <SectionLabel title="Dijkstra route" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {snapshot.activeRoute.map((id) => <Badge key={id} className="border-signal/40 text-signalSoft">{id}</Badge>)}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Route cost remains computed from latency, packet loss, congestion, and availability penalties.
      </p>
      <WeightSlider label="Packet loss" value={snapshot.routingWeights.packetLoss} min={100} max={1200} onValue={(v) => onWeight('packetLoss', v)} />
      <WeightSlider label="Congestion" value={snapshot.routingWeights.congestion} min={20} max={220} onValue={(v) => onWeight('congestion', v)} />
      <WeightSlider label="Availability" value={snapshot.routingWeights.availability} min={20} max={220} onValue={(v) => onWeight('availability', v)} />
    </section>
  );
}

function FailurePanel({
  snapshot,
  onFail,
  onRestore,
  onFailSatellites,
  onRestoreSatellites,
}: {
  snapshot: SimulationSnapshot;
  onFail: (id: string) => void;
  onRestore: (id: string) => void;
  onFailSatellites?: () => void;
  onRestoreSatellites?: () => void;
}) {
  const candidates = snapshot.nodes.filter((node) => node.type !== 'SENSOR_CLUSTER');
  const [selected, setSelected] = useState('UAV-02');
  return (
    <section className="artifact-panel">
      <SectionLabel title="Failure event" />
      <div className="failure-controls mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <select value={selected} onChange={(event) => setSelected(event.target.value)} className="min-h-11 min-w-0 border border-border bg-background px-2 text-sm">
          {candidates.map((node) => <option key={node.id} value={node.id}>{node.id} {node.telemetry.health}</option>)}
        </select>
        <Button size="sm" variant="destructive" onClick={() => onFail(selected)}>Fail</Button>
        <Button size="sm" variant="outline" onClick={() => onRestore(selected)}>Restore</Button>
      </div>
      {onFailSatellites && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button size="sm" variant="destructive" onClick={onFailSatellites}>
            Fail all satellites
          </Button>
          {onRestoreSatellites && (
            <Button size="sm" variant="outline" onClick={onRestoreSatellites}>
              Restore all
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

function EdgeAiPanel({ node }: { node: NetworkNode }) {
  const c = node.telemetry.anomalyContributors;
  return (
    <section className="artifact-panel border-signal/40">
      <SectionLabel title="Simulated edge anomaly detector" icon={<AlertTriangle size={13} />} />
      <p className="mt-3 text-sm">Score <span className="font-mono text-signalSoft">{node.telemetry.anomalyScore.toFixed(2)}</span></p>
      <Table className="mt-2">
        <TableBody>
          <TableRow><TableCell>Temperature deviation</TableCell><TableCell className="text-right font-mono">+{c.temperature.toFixed(2)}</TableCell></TableRow>
          <TableRow><TableCell>Battery drain</TableCell><TableCell className="text-right font-mono">+{c.battery.toFixed(2)}</TableCell></TableRow>
          <TableRow><TableCell>Packet-loss spike</TableCell><TableCell className="text-right font-mono">+{c.packetLoss.toFixed(2)}</TableCell></TableRow>
          <TableRow><TableCell>Signal noise</TableCell><TableCell className="text-right font-mono">+{c.signalNoise.toFixed(2)}</TableCell></TableRow>
        </TableBody>
      </Table>
    </section>
  );
}

function RecoveryPanel({ snapshot }: { snapshot: SimulationSnapshot }) {
  const recovery = snapshot.recovery!;
  return (
    <section className="artifact-panel">
      <SectionLabel title="Recovery trace" icon={<Route size={13} />} />
      <div className="mt-3 grid gap-1 text-xs">
        <span className="text-muted-foreground">Old route</span>
        <span className="font-mono">{recovery.oldRoute.join(' -> ') || '-'}</span>
        <span className="mt-2 text-muted-foreground">New route</span>
        <span className="font-mono text-signalSoft">{recovery.newRoute.join(' -> ') || '-'}</span>
      </div>
      <Table className="mt-2">
        <TableBody>
          <TableRow><TableCell>Latency delta</TableCell><TableCell className="text-right font-mono">{recovery.latencyDifference} ms</TableCell></TableRow>
          <TableRow><TableCell>Delivery delta</TableCell><TableCell className="text-right font-mono">{recovery.packetDeliveryDifference.toFixed(1)}%</TableCell></TableRow>
          <TableRow><TableCell>Recovery time</TableCell><TableCell className="text-right font-mono">{recovery.recoveryTimeMs} ms</TableCell></TableRow>
        </TableBody>
      </Table>
    </section>
  );
}

function ControlsPanel({
  snapshot,
  researchMode,
  showGrid,
  simulationSpeed,
  onResearchMode,
  onShowGrid,
  onSpeed,
  onWeight,
  onFail,
  onRestore,
  onFailSatellites,
  onRestoreSatellites,
  onReset,
  onExport,
  onOpenExperiment,
}: {
  snapshot: SimulationSnapshot;
  researchMode: boolean;
  showGrid: boolean;
  simulationSpeed: number;
  onResearchMode: (value: boolean) => void;
  onShowGrid: (value: boolean) => void;
  onSpeed: (value: number) => void;
  onWeight: (key: keyof SimulationSnapshot['routingWeights'], value: number[]) => void;
  onFail: (id: string) => void;
  onRestore: (id: string) => void;
  onFailSatellites: () => void;
  onRestoreSatellites: () => void;
  onReset: () => void;
  onExport: (kind: 'telemetry' | 'events' | 'failures' | 'handoffs') => void;
  onOpenExperiment: () => void;
}) {
  return (
    <div className="space-y-4 pr-2">
      <section className="artifact-panel">
        <SectionLabel title="View options" />
        <div className="mt-3 grid gap-3">
          <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
            <span>Grid</span>
            <Switch checked={showGrid} onCheckedChange={onShowGrid} aria-label="Toggle grid" />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
            <span>Research Mode</span>
            <Switch checked={researchMode} onCheckedChange={onResearchMode} aria-label="Toggle research mode" />
          </label>
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">Simulation speed</span>
              <span className="font-mono">{simulationSpeed.toFixed(1)}x</span>
            </div>
            <Slider value={[simulationSpeed]} min={0.5} max={4} step={0.5} onValueChange={(value) => onSpeed(value[0])} aria-label="Simulation speed" />
          </div>
          <Button variant="outline" onClick={onReset}><RotateCcw size={15} />Reset scenario</Button>
          <Button variant="outline" onClick={onOpenExperiment}><Beaker size={15} />Experiment mode</Button>
        </div>
      </section>

      <FailurePanel
        snapshot={snapshot}
        onFail={onFail}
        onRestore={onRestore}
        onFailSatellites={onFailSatellites}
        onRestoreSatellites={onRestoreSatellites}
      />
      <RoutingPanel snapshot={snapshot} onWeight={onWeight} />

      <section className="artifact-panel">
        <SectionLabel title="CSV export" icon={<Download size={13} />} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onExport('telemetry')}>Telemetry</Button>
          <Button variant="outline" onClick={() => onExport('events')}>Events</Button>
          <Button variant="outline" onClick={() => onExport('failures')}>Failures</Button>
          <Button variant="outline" onClick={() => onExport('handoffs')}>Handoffs</Button>
        </div>
      </section>
    </div>
  );
}

function ExperimentPanel({
  run,
  history,
  progress,
  notice,
  running,
  seed,
  observationWindow,
  repetitions,
  researchMode,
  compact = false,
  onSeed,
  onObservationWindow,
  onRepetitions,
  onRun,
  onReset,
  onExport,
  onLoadRun,
}: {
  run: ExperimentRun | null;
  history: ExperimentRun[];
  progress: ExperimentProgress | null;
  notice: ExperimentNotice;
  running: boolean;
  seed: number;
  observationWindow: number;
  repetitions: number;
  researchMode: boolean;
  compact?: boolean;
  onSeed: (value: number) => void;
  onObservationWindow: (value: number) => void;
  onRepetitions: (value: number) => void;
  onRun: () => void;
  onReset: () => void;
  onExport: () => void;
  onLoadRun: (run: ExperimentRun) => void;
}) {
  const chartData = run?.summaries ?? [];
  const previousRun = history.find((candidate) => candidate.id !== run?.id) ?? null;
  return (
    <div className={`experiment-panel space-y-4 ${compact ? 'experiment-panel-compact' : ''}`}>
      <section className="artifact-panel">
        <SectionLabel title="Experiment mode" icon={<Beaker size={13} />} />
        <h2 className="mt-2 font-display text-xl font-extrabold leading-tight text-foreground">
          Impact of Progressive Satellite Failures on Space-Air-Ground Network Resilience
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Runs four seeded conditions from a common baseline topology and records metrics from the existing simulation model.
        </p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Seed
            <input
              className="min-h-11 border border-border bg-background px-3 font-mono text-sm text-foreground"
              type="number"
              value={seed}
              disabled={running}
              onChange={(event) => onSeed(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Observation window, simulated seconds
            <input
              className="min-h-11 border border-border bg-background px-3 font-mono text-sm text-foreground"
              type="number"
              min={5}
              max={180}
              value={observationWindow}
              disabled={running}
              onChange={(event) => onObservationWindow(Number(event.target.value))}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Repetitions per condition
            <input
              className="min-h-11 border border-border bg-background px-3 font-mono text-sm text-foreground"
              type="number"
              min={1}
              max={20}
              value={repetitions}
              disabled={running}
              onChange={(event) => onRepetitions(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="experiment-actions mt-4 grid gap-2">
          <Button variant="default" onClick={onRun} disabled={running}>Run experiment</Button>
          <Button variant="outline" onClick={onReset} disabled={running || !run}>Reset results</Button>
          <Button variant="outline" onClick={onExport} disabled={!run}>Export results CSV</Button>
        </div>
      </section>

      {notice && <ExperimentNoticePanel notice={notice} />}

      <ExperimentProgressPanel progress={progress} running={running} repetitions={repetitions} />

      {run && (
        <>
          <section className="artifact-panel">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel title="Summary results" />
              <span className="font-mono text-[11px] text-muted-foreground">seed {run.seed}</span>
            </div>
            <div className="experiment-table-wrap mt-3">
              <table className="experiment-table">
                <thead>
                  <tr>
                    <th>Failed Satellites</th>
                    <th>Avg Latency</th>
                    <th>Packet Delivery</th>
                    <th>Avg Hop Count</th>
                    <th>Recovery Time</th>
                    <th>Packet Loss</th>
                    <th>Resilience Score</th>
                  </tr>
                </thead>
                <tbody>
                  {run.summaries.map((result) => (
                    <tr key={result.condition}>
                      <td>{result.failed_satellites}</td>
                      <td>{result.avg_latency_ms.toFixed(1)} ms</td>
                      <td>{result.packet_delivery_percent.toFixed(1)}%</td>
                      <td>{result.avg_hop_count.toFixed(1)}</td>
                      <td>{result.recovery_time_seconds.toFixed(1)} s</td>
                      <td>{result.avg_packet_loss_percent.toFixed(2)}%</td>
                      <td>{result.resilience_score.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Computed metrics: average latency, hop count, successful reroutes, disconnected route samples. Simulated-value metrics: packet delivery, packet loss, recovery time, resilience score.
            </p>
          </section>

          <section className="artifact-panel">
            <SectionLabel title="Charts" />
            <div className="experiment-chart-grid mt-3">
              <ExperimentChart data={chartData} dataKey="avg_latency_ms" label="Average latency" unit=" ms" />
              <ExperimentChart data={chartData} dataKey="packet_delivery_percent" label="Packet delivery" unit="%" />
              <ExperimentChart data={chartData} dataKey="resilience_score" label="Resilience score" unit="" />
            </div>
          </section>

          <section className="artifact-panel">
            <SectionLabel title="Observed Simulation Results" />
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              {interpretExperiment(run.summaries).map((line) => <p key={line}>{line}</p>)}
            </div>
          </section>

          {researchMode && (
            <section className="artifact-panel">
              <SectionLabel title="Research mode trace" />
              <div className="mt-3 grid gap-2 text-xs">
                {run.rows.slice(-Math.min(6, run.rows.length)).map((row) => (
                  <div key={`${row.condition}-${row.repetition}`} className="border border-border bg-muted/40 p-2">
                    <div className="font-mono text-signalSoft">Condition {row.condition} / Rep {row.repetition} / T+{row.final_timestep}</div>
                    <div className="mt-1 text-muted-foreground">Failed: {row.failed_node_ids || 'none'}</div>
                    <div className="mt-1 text-muted-foreground">Old route: {row.old_route || '-'}</div>
                    <div className="mt-1 text-muted-foreground">New route: {row.new_route || '-'}</div>
                    <div className="mt-1 text-muted-foreground">Dijkstra route cost: {row.route_cost.toFixed(2)}</div>
                    <div className="mt-1 text-muted-foreground">Recovery event timestamp: {row.recovery_event_time}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="artifact-panel">
        <details>
          <summary className="cursor-pointer text-sm text-foreground">Experiment Scope</summary>
          <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>OrbitalMesh is a research-inspired simulation.</p>
            <p>Routing and failure recovery are computed by the application.</p>
            <p>Telemetry and link-quality values are simulated.</p>
            <p>The experiment demonstrates relative behaviour within the model.</p>
            <p>Results are not intended as validated real-world satellite-network performance measurements.</p>
          </div>
        </details>
      </section>

      <section className="artifact-panel">
        <SectionLabel title="Experiment history" />
        <div className="mt-3 grid gap-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">No stored runs yet.</p>}
          {history.slice(0, 5).map((item) => (
            <button
              key={item.id}
              type="button"
              className="min-h-11 border border-border px-3 text-left text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              onClick={() => onLoadRun(item)}
            >
              <span className="font-mono text-foreground">seed {item.seed}</span>
              <span> | {item.repetitions} reps | {new Date(item.createdAt).toLocaleString()}</span>
            </button>
          ))}
        </div>
        {run && previousRun && (
          <p className="mt-3 text-xs text-muted-foreground">
            Latest selected run can be compared with seed {previousRun.seed}; use history entries to switch between stored summaries.
          </p>
        )}
      </section>
    </div>
  );
}

function ExperimentNoticePanel({ notice }: { notice: NonNullable<ExperimentNotice> }) {
  const isSuccess = notice.type === 'success';
  return (
    <section className={`experiment-notice artifact-panel ${isSuccess ? 'experiment-notice-success' : 'experiment-notice-error'}`} role="status" aria-live="polite">
      <SectionLabel title={isSuccess ? 'Success' : 'Error'} icon={isSuccess ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} />
      <p className="mt-2 text-sm leading-relaxed">{notice.message}</p>
    </section>
  );
}

function ExperimentProgressPanel({ progress, running, repetitions }: { progress: ExperimentProgress | null; running: boolean; repetitions: number }) {
  if (!progress && !running) return null;
  const displayedRepetitions = Math.max(1, Math.min(20, Math.round(repetitions)));
  return (
    <section className="artifact-panel">
      <SectionLabel title="Experiment progress" />
      <div className="mt-3 grid gap-1 text-sm">
        <span className="font-mono text-signalSoft">Condition {progress ? progress.condition + 1 : 1} of 4</span>
        <span className="font-mono text-muted-foreground">Repetition {progress?.repetition || 0} of {displayedRepetitions}</span>
        <span>{progress?.stage ?? 'Waiting...'}</span>
        {progress?.failedNodeIds.length ? <span className="text-muted-foreground">Failed nodes: {progress.failedNodeIds.join(', ')}</span> : null}
      </div>
    </section>
  );
}

function ExperimentChart({
  data,
  dataKey,
  label,
  unit,
}: {
  data: ExperimentSummary[];
  dataKey: keyof ExperimentSummary;
  label: string;
  unit: string;
}) {
  return (
    <div className="experiment-chart">
      <div className="mb-2 text-xs text-muted-foreground">{label}</div>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#2A2A2F" strokeDasharray="3 3" />
          <XAxis dataKey="failed_satellites" stroke="#A0A0AB" tick={{ fill: '#A0A0AB', fontSize: 11 }} />
          <YAxis stroke="#A0A0AB" tick={{ fill: '#A0A0AB', fontSize: 11 }} width={42} />
          <RechartsTooltip
            contentStyle={{ background: '#17171B', border: '1px solid #2A2A2F', color: '#EEEEEF' }}
            labelFormatter={(value) => `${value} failed satellites`}
            formatter={(value) => [`${Number(value).toFixed(2)}${unit}`, label]}
          />
          <Line type="monotone" dataKey={dataKey as string} stroke="#D7A13B" strokeWidth={1.8} dot={{ r: 3 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AboutSimulation() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p><strong className="text-foreground">Computed:</strong> Dijkstra route, node/link distance, active route, handoff selection, visibility checks, and recovery path.</p>
      <p><strong className="text-foreground">Simulated:</strong> temperature, battery, signal noise, packet-loss variation, queue pressure, and anomaly probability.</p>
      <p>This is an educational research demonstrator, not an orbital mechanics or RF propagation validation tool.</p>
    </div>
  );
}

function TransmissionLog({
  snapshot,
  open,
  onOpen,
  researchMode,
  fixedOpen = false,
}: {
  snapshot: SimulationSnapshot;
  open: boolean;
  onOpen: (open: boolean) => void;
  researchMode: boolean;
  fixedOpen?: boolean;
}) {
  const visibleEvents = open ? snapshot.events : snapshot.events.slice(0, 3);
  return (
    <section className={`artifact-log ${fixedOpen ? 'artifact-log-fixed' : ''}`}>
      <button
        className="flex min-h-11 w-full items-center justify-between px-4 text-left text-xs text-muted-foreground"
        onClick={() => {
          if (!fixedOpen) onOpen(!open);
        }}
        aria-expanded={open}
      >
        <span>Transmission log</span>
        {!fixedOpen && <span>{open ? 'Collapse log' : 'Expand log'}</span>}
      </button>
      {(open || !fixedOpen) && (
        <ScrollArea className={fixedOpen ? 'h-[calc(100dvh-9rem)] max-h-[34rem]' : open ? 'h-28' : 'h-auto'}>
          <div className="transmission-grid grid gap-y-1 px-4 pb-3 text-xs">
            {visibleEvents.map((event) => (
              <div key={event.id} className="transmission-event grid grid-cols-[88px_82px_1fr] gap-x-3">
                <span className="font-mono text-muted-foreground">{researchMode ? `${event.time} T+${event.tick}` : event.time}</span>
                <span className={event.severity === 'critical' ? 'text-red-400' : event.severity === 'success' ? 'text-green-400' : event.severity === 'warning' ? 'text-signalSoft' : 'text-muted-foreground'}>{event.type}</span>
                <span><span className="text-foreground">{event.title}</span> <span className="text-muted-foreground">{event.detail}</span></span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}

function readStoredBoolean(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === 'true';
  } catch {
    return fallback;
  }
}

function isLaptopViewport() {
  const width = Math.max(window.innerWidth, window.outerWidth, window.screen?.width ?? 0);
  return width >= 1280 && width < 1920;
}

function SectionLabel({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{title}</div>;
}

function ModeFillButton({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'outline'}
      aria-pressed={active}
      onClick={onToggle}
      className="min-w-[7.5rem] justify-between"
    >
      <span>{label}</span>
      <span className="font-mono text-[10px]">{active ? 'ON' : 'OFF'}</span>
    </Button>
  );
}

function HealthBadge({ node }: { node: NetworkNode }) {
  const cls = node.telemetry.health === 'FAILED' ? 'border-red-500/50 text-red-300' : node.telemetry.health === 'DEGRADED' ? 'border-signal/50 text-signalSoft' : 'border-green-500/50 text-green-300';
  return <Badge className={cls}>{node.telemetry.health}</Badge>;
}

function ValueBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
    </div>
  );
}

function WeightSlider({ label, value, min, max, onValue }: { label: string; value: number; min: number; max: number; onValue: (value: number[]) => void }) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{Math.round(value)}</span></div>
      <Slider value={[value]} min={min} max={max} step={5} onValueChange={onValue} />
    </div>
  );
}

function Sparkline({ label, values }: { label: string; values: number[] }) {
  const width = 84;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => `${(index / Math.max(1, values.length - 1)) * width},${height - ((value - min) / range) * height}`).join(' ');
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="border border-border bg-muted/50 p-1">
          <div className="text-[10px] text-muted-foreground">{label}</div>
          <svg width="100%" height="28" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            <polyline points={points} fill="none" stroke="#D7A13B" strokeWidth="1.4" />
          </svg>
        </div>
      </TooltipTrigger>
      <TooltipContent>60-second sparkline: {label}</TooltipContent>
    </Tooltip>
  );
}

function buildCsv(kind: 'telemetry' | 'events' | 'failures' | 'handoffs', snapshot: SimulationSnapshot) {
  if (kind === 'telemetry') {
    return ['id,type,layer,health,battery,temperature,signal,packetQueue,anomalyScore', ...snapshot.nodes.map((node) =>
      [node.id, node.type, node.layer, node.telemetry.health, node.telemetry.battery.toFixed(2), node.telemetry.temperature.toFixed(2), node.telemetry.signalStrength.toFixed(1), node.telemetry.packetQueue, node.telemetry.anomalyScore.toFixed(2)].join(','),
    )].join('\n');
  }
  const events = kind === 'events' ? snapshot.events : snapshot.events.filter((event) => kind === 'failures' ? event.type === 'FAILURE' : event.type === 'HANDOFF');
  return ['time,tick,type,title,detail', ...events.map((event) => [event.time, event.tick, event.type, quote(event.title), quote(event.detail)].join(','))].join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function waitForFrame() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

function createExperimentRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function chooseFailedSatellites(ids: string[], count: number, seed: number) {
  const random = createExperimentRandom(seed);
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function routePacketLossPercent(snapshot: SimulationSnapshot) {
  const routeLinks = snapshot.activeRoute.slice(0, -1).map((node, index) => {
    const next = snapshot.activeRoute[index + 1];
    return snapshot.links.find((link) => (link.source === node && link.target === next) || (link.source === next && link.target === node));
  }).filter(Boolean) as NetworkLink[];
  const links = routeLinks.length ? routeLinks : snapshot.links;
  return mean(links.map((link) => link.packetLoss * 100));
}

function summarizeExperimentRows(rows: ExperimentRow[]): ExperimentSummary[] {
  return [0, 1, 2, 3].map((condition) => {
    const group = rows.filter((row) => row.condition === condition);
    return {
      condition,
      failed_satellites: condition,
      avg_latency_ms: mean(group.map((row) => row.avg_latency_ms)),
      packet_delivery_percent: mean(group.map((row) => row.packet_delivery_percent)),
      avg_hop_count: mean(group.map((row) => row.avg_hop_count)),
      recovery_time_seconds: mean(group.map((row) => row.recovery_time_seconds)),
      successful_reroutes: mean(group.map((row) => row.successful_reroutes)),
      disconnected_routes: mean(group.map((row) => row.disconnected_routes)),
      avg_packet_loss_percent: mean(group.map((row) => row.avg_packet_loss_percent)),
      resilience_score: mean(group.map((row) => row.resilience_score)),
    };
  });
}

function interpretExperiment(results: ExperimentSummary[]) {
  if (results.length < 2) return ['Run the experiment to generate observed simulation results.'];
  const baseline = results[0];
  const final = results[results.length - 1];
  const lines: string[] = [];
  if (final.avg_latency_ms > baseline.avg_latency_ms) lines.push('Average latency increased as more satellites failed.');
  if (final.packet_delivery_percent < baseline.packet_delivery_percent) lines.push('Packet delivery decreased across the tested satellite-failure conditions.');
  const above95 = results.filter((row) => row.packet_delivery_percent >= 95).map((row) => row.failed_satellites);
  if (above95.length) lines.push(`Packet delivery remained at or above 95% through ${Math.max(...above95)} failed satellite(s) in this run.`);
  if (final.recovery_time_seconds > baseline.recovery_time_seconds) lines.push('Recovery time increased after multiple simultaneous satellite failures.');
  if (final.resilience_score < baseline.resilience_score) lines.push('Network resilience score declined as satellite availability decreased.');
  return lines.length ? lines : ['The measured metrics changed only slightly across the tested failure conditions in this simulation run.'];
}

function buildExperimentRowsCsv(rows: ExperimentRow[]) {
  const headers = [
    'seed',
    'condition',
    'failed_satellites',
    'repetition',
    'failed_node_ids',
    'avg_latency_ms',
    'packet_delivery_percent',
    'avg_hop_count',
    'recovery_time_seconds',
    'successful_reroutes',
    'disconnected_routes',
    'avg_packet_loss_percent',
    'resilience_score',
    'old_route',
    'new_route',
    'route_cost',
    'recovery_event_time',
    'final_timestep',
  ];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => quoteCsvValue(row[key as keyof ExperimentRow])).join(',')),
  ].join('\n');
}

function buildExperimentSummaryCsv(rows: ExperimentSummary[]) {
  const headers = [
    'condition',
    'failed_satellites',
    'avg_latency_ms',
    'packet_delivery_percent',
    'avg_hop_count',
    'recovery_time_seconds',
    'successful_reroutes',
    'disconnected_routes',
    'avg_packet_loss_percent',
    'resilience_score',
  ];
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((key) => row[key as keyof ExperimentSummary]).join(',')),
  ].join('\n');
}

function quote(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteCsvValue(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? quote(text) : text;
}
