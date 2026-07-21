import React, { useState, useCallback, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import {
  Brain, Play, Layers, Table, Sun, Moon, PanelRightClose, PanelRightOpen,
  Check, X, Edit3, FlaskConical, Undo2, Redo2, ChevronDown, ChevronUp,
  HelpCircle, Plus, Upload, Sparkles, Database,
} from 'lucide-react';
import { motion } from 'motion/react';
import dagre from 'dagre';
import Canvas from './components/Canvas';
import Inspector from './components/Inspector';
import CanvasToolbar from './components/CanvasToolbar';
import FCMNodeComponent from './components/FCMNode';
import FCMEdgeComponent from './components/FCMEdge';
import Toaster from './components/Toaster';
import Walkthrough from './components/Walkthrough';
import FileMenu from './components/FileMenu';
import { ProjectConfig, Scenario } from './lib/storage';
import { SampleModel } from './lib/samples';
import { toast } from './lib/toast';
import {
  FCMNode,
  FCMEdge,
  ActivationFunction,
  InferenceRule,
  LinguisticScalePreset,
  MembershipFunctionType,
  LINGUISTIC_SCALE_PRESETS,
} from './types';
import { useGraphHistory } from './hooks/useGraphHistory';
import { useSelectionActions } from './hooks/useSelectionActions';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSimulation } from './hooks/useSimulation';
import { useProjectPersistence } from './hooks/useProjectPersistence';
import { cn } from './lib/utils';

// Tab panels are code-split: recharts and the analysis views only load
// when the user opens a tab that needs them.
const SimulationChart = lazy(() => import('./components/SimulationChart'));
const DataInspector = lazy(() => import('./components/DataInspector'));
const MatrixEditor = lazy(() => import('./components/MatrixEditor'));
const InferenceTab = lazy(() => import('./components/InferenceTab'));
const ExperimentsTab = lazy(() => import('./components/ExperimentsTab'));

const nodeTypes = {
  fcm: FCMNodeComponent,
};

const edgeTypes = {
  fcm: FCMEdgeComponent,
};

const TabLoading = ({ theme }: { theme: 'modern' | 'academic' }) => (
  <div className={cn(
    "h-full w-full flex items-center justify-center text-sm",
    theme === 'modern' ? "text-white/60" : "text-slate-500"
  )}>
    Loading…
  </div>
);

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'fcm',
    position: { x: 100, y: 100 },
    data: { label: 'Economic Growth', initialActivation: 0.6 },
  },
  {
    id: '2',
    type: 'fcm',
    position: { x: 450, y: 100 },
    data: { label: 'Environmental Impact', initialActivation: 0.4 },
  },
  {
    id: '3',
    type: 'fcm',
    position: { x: 275, y: 350 },
    data: { label: 'Public Policy', initialActivation: 0.7 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', data: { weight: 0.8 }, animated: true },
  { id: 'e3-1', source: '3', target: '1', data: { weight: 0.5 }, animated: true },
  { id: 'e3-2', source: '3', target: '2', data: { weight: -0.4 }, animated: true },
];

type WorkspaceTab = 'canvas' | 'matrix' | 'inference' | 'experiments';

function Dashboard() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [activationFn, setActivationFn] = useState<ActivationFunction>('sigmoid');
  const [inferenceRule, setInferenceRule] = useState<InferenceRule>('modified-kosko');
  const [lambda, setLambda] = useState(1);
  const [maxIterations, setMaxIterations] = useState(25);
  const [convergenceThreshold, setConvergenceThreshold] = useState(0.001);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('canvas');
  const [theme, setTheme] = useState<'modern' | 'academic'>('modern');
  const [panelHeight, setPanelHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);

  // Advanced parameters state
  const [linguisticScale, setLinguisticScale] = useState<LinguisticScalePreset>('9-point');
  const [membershipFunction, setMembershipFunction] = useState<MembershipFunctionType>('triangular');

  // Inspector collapsed state
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  // Inline project rename state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Connect mode: click a source concept, then a target concept
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);

  // Named what-if scenarios (persisted with the project)
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  // Modals
  const [dataEditorOpen, setDataEditorOpen] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(
    () => !localStorage.getItem('fcm_walkthrough_done')
  );

  const { fitView, setCenter } = useReactFlow();

  // Get current linguistic terms based on selected scale
  const currentLinguisticTerms = LINGUISTIC_SCALE_PRESETS[linguisticScale];

  // History and clipboard (entries are recorded automatically on change)
  const { undo, redo, resetHistory, canUndo, canRedo } = useGraphHistory(nodes, edges, setNodes, setEdges);
  const { copy, paste, deleteSelected } = useSelectionActions(nodes, edges, setNodes, setEdges);

  // Results drawer collapse + hidden input for the Ctrl+O shortcut
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const openFileInputRef = useRef<HTMLInputElement>(null);

  // Engine-facing views of the graph
  const fcmNodes: FCMNode[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      label: (node.data?.label as string) || 'New Concept',
      activation: (node.data?.activation as number) ?? (node.data?.initialActivation as number) ?? 0.5,
      initialActivation: (node.data?.initialActivation as number) ?? 0.5,
      clamped: (node.data?.clamped as boolean) ?? false,
    }));
  }, [nodes]);

  const fcmEdges: FCMEdge[] = useMemo(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data?.weight as number) || 0,
      uncertainty: (edge.data?.uncertainty as number) || 0,
    }));
  }, [edges]);

  // Selection (driven by React Flow's selected flags)
  const selectedNodeId = useMemo(() => nodes.find(n => n.selected)?.id ?? null, [nodes]);
  const selectedEdgeId = useMemo(() => edges.find(e => e.selected)?.id ?? null, [edges]);

  const clearSelection = useCallback(() => {
    setNodes(nds => nds.map(n => (n.selected ? { ...n, selected: false } : n)));
    setEdges(eds => eds.map(e => (e.selected ? { ...e, selected: false } : e)));
  }, [setNodes, setEdges]);

  // Simulation lifecycle
  const {
    simulation,
    steps: simulationResults,
    isSimulating,
    run: handleRunSimulation,
    reset: resetSimulation,
    clear: clearSimulation,
  } = useSimulation(
    fcmNodes,
    fcmEdges,
    { activationFn, inferenceRule, lambda, maxIterations, convergenceThreshold },
    setNodes
  );

  // Auto-expand the results drawer whenever a new simulation completes
  useEffect(() => {
    if (simulation) setResultsCollapsed(false);
  }, [simulation]);

  // Project persistence
  const projectConfig: ProjectConfig = {
    activationFunction: activationFn,
    inferenceRule,
    lambda,
    maxIterations,
    convergenceThreshold,
    linguisticScale,
    membershipFunction,
    theme,
  };

  const onProjectSwitched = useCallback(() => {
    clearSimulation();
    resetHistory();
  }, [clearSimulation, resetHistory]);

  const applyConfig = useCallback((config: ProjectConfig) => {
    setActivationFn(config.activationFunction);
    setInferenceRule(config.inferenceRule ?? 'modified-kosko');
    setLambda(config.lambda);
    setMaxIterations(config.maxIterations ?? 25);
    setConvergenceThreshold(config.convergenceThreshold ?? 0.001);
    setLinguisticScale(config.linguisticScale);
    setMembershipFunction(config.membershipFunction);
    setTheme(config.theme);
  }, []);

  const {
    currentProject,
    saveStatus,
    saveCurrentProject,
    loadProject,
    createNewProject,
    renameProject: persistRename,
    exportProject,
    importProjectFile,
  } = useProjectPersistence({
    nodes,
    edges,
    setNodes,
    setEdges,
    config: projectConfig,
    scenarios,
    applyConfig,
    applyScenarios: setScenarios,
    onProjectSwitched,
  });

  const renameProject = useCallback(async (newName: string) => {
    await persistRename(newName);
    setIsEditingName(false);
  }, [persistRename]);

  useKeyboardShortcuts({
    undo,
    redo,
    copy,
    paste,
    deleteSelected,
    save: () => { saveCurrentProject(); },
    openFile: () => openFileInputRef.current?.click(),
    newProject: createNewProject,
  });

  // Escape exits connect mode / closes the data editor
  useEffect(() => {
    if (!connectMode && !dataEditorOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (dataEditorOpen) setDataEditorOpen(false);
      setConnectMode(false);
      setConnectSourceId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [connectMode, dataEditorOpen]);

  // ------------------------------------------------------------------
  // Graph mutations (undo history is recorded automatically)
  // ------------------------------------------------------------------

  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, label } } : node))
    );
  }, [setNodes]);

  const updateNodeData = useCallback((nodeId: string, updates: Partial<FCMNode>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newUpdates = { ...updates };
          // If initialActivation is updated, sync activation as well for real-time feedback
          if ('initialActivation' in updates) {
            newUpdates.activation = updates.initialActivation;
          }
          return { ...node, data: { ...node.data, ...newUpdates } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const updateEdgeWeightById = useCallback((edgeId: string, weight: number) => {
    setEdges((eds) =>
      eds.map((edge) => (edge.id === edgeId ? { ...edge, data: { ...edge.data, weight } } : edge))
    );
  }, [setEdges]);

  const updateEdgeUncertainty = useCallback((edgeId: string, uncertainty: number) => {
    setEdges((eds) =>
      eds.map((edge) => (edge.id === edgeId ? { ...edge, data: { ...edge.data, uncertainty } } : edge))
    );
  }, [setEdges]);

  const flipEdge = useCallback((edgeId: string) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId ? { ...edge, source: edge.target, target: edge.source } : edge
      )
    );
  }, [setEdges]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  const addEdgeBetween = useCallback((sourceId: string, targetId: string, weight: number) => {
    const newEdge: Edge = {
      id: `e${sourceId}-${targetId}`,
      type: 'fcm',
      source: sourceId,
      target: targetId,
      data: { weight },
      animated: true,
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const addNode = useCallback(() => {
    const id = Math.random().toString(36).substr(2, 9);
    const jitter = () => (Math.random() - 0.5) * 80;
    const newNode: Node = {
      id,
      type: 'fcm',
      position: { x: 260 + jitter(), y: 200 + jitter() },
      data: { label: `New Concept ${nodes.length + 1}`, initialActivation: 0.5 },
      selected: true,
    };
    setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNode));
  }, [nodes.length, setNodes]);

  const updateMatrixWeight = useCallback((sourceId: string, targetId: string, weight: number) => {
    setEdges((eds) => {
      const existingEdge = eds.find(e => e.source === sourceId && e.target === targetId);
      if (existingEdge) {
        if (weight === 0) {
          return eds.filter(e => e.id !== existingEdge.id);
        }
        return eds.map(e => e.id === existingEdge.id ? { ...e, data: { ...e.data, weight } } : e);
      } else if (weight !== 0) {
        const newEdge: Edge = {
          id: `e${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId,
          type: 'fcm',
          data: { weight },
          animated: true
        };
        return addEdge(newEdge, eds);
      }
      return eds;
    });
  }, [setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: 'fcm', data: { weight: 0.5 }, animated: true }, eds));
    },
    [setEdges]
  );

  // Connect mode: first click picks the source, second click creates the edge
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (!connectMode) return;
    if (!connectSourceId) {
      setConnectSourceId(node.id);
      return;
    }
    if (connectSourceId === node.id) {
      setConnectSourceId(null);
      return;
    }
    const exists = edges.some(e => e.source === connectSourceId && e.target === node.id);
    if (exists) {
      toast.info('These concepts are already connected in that direction');
    } else {
      addEdgeBetween(connectSourceId, node.id, 0.5);
    }
    setConnectSourceId(null);
  }, [connectMode, connectSourceId, edges, addEdgeBetween]);

  const reorganizeTopology = useCallback(() => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const nodeWidth = 200;
    const nodeHeight = 110;

    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 60 });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    setNodes((nds) =>
      nds.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
          },
        };
      })
    );
    window.setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 80);
  }, [nodes, edges, setNodes, fitView]);

  const focusNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setCenter(node.position.x + 80, node.position.y + 40, { zoom: 1.2, duration: 400 });
    setNodes(nds => nds.map(n => ({ ...n, selected: n.id === nodeId })));
  }, [nodes, setCenter, setNodes]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  const handleImportData = useCallback((importedNodes: FCMNode[], importedEdges: FCMEdge[]) => {
    // Convert FCMNodes to React Flow nodes with positions
    const newNodes: Node[] = importedNodes.map((n, index) => ({
      id: n.id,
      type: 'fcm',
      position: {
        x: 100 + (index % 3) * 260,
        y: 100 + Math.floor(index / 3) * 160
      },
      data: {
        label: n.label,
        initialActivation: n.initialActivation,
        activation: n.activation || n.initialActivation
      },
    }));

    const newEdges: Edge[] = importedEdges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'fcm',
      data: { weight: e.weight },
      animated: true,
    }));

    setNodes(newNodes);
    setEdges(newEdges);
    clearSimulation();
    window.setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 80);
  }, [setNodes, setEdges, clearSimulation, fitView]);

  const loadSample = useCallback((sample: SampleModel) => {
    const newNodes: Node[] = sample.nodes.map(n => ({
      id: n.id,
      type: 'fcm',
      position: { x: n.x, y: n.y },
      data: { label: n.label, initialActivation: n.initialActivation, activation: n.initialActivation },
    }));
    const newEdges: Edge[] = sample.edges.map(e => ({
      id: `e${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'fcm',
      data: { weight: e.weight },
      animated: true,
    }));
    setNodes(newNodes);
    setEdges(newEdges);
    clearSimulation();
    setActiveTab('canvas');
    toast.success(`Loaded sample "${sample.name}"`);
    window.setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 80);
  }, [setNodes, setEdges, clearSimulation, fitView]);

  // Scenario management: capture the map's current what-if configuration,
  // remove one, or load one back onto the map
  const captureScenario = useCallback((name: string) => {
    const scenario: Scenario = {
      id: `scn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name,
      activations: Object.fromEntries(fcmNodes.map(n => [n.id, n.initialActivation])),
      clampedIds: fcmNodes.filter(n => n.clamped).map(n => n.id),
      createdAt: new Date().toISOString(),
    };
    setScenarios(prev => [...prev, scenario]);
    toast.success(`Captured scenario "${name}"`);
  }, [fcmNodes]);

  const deleteScenario = useCallback((id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  }, []);

  const applyScenarioToMap = useCallback((scenario: Scenario) => {
    setNodes(nds => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        initialActivation: scenario.activations[node.id] ?? (node.data.initialActivation as number),
        activation: scenario.activations[node.id] ?? (node.data.initialActivation as number),
        clamped: scenario.clampedIds.includes(node.id),
      },
    })));
    clearSimulation();
    setActiveTab('canvas');
    toast.success(`Applied scenario "${scenario.name}" to the map`);
  }, [setNodes, clearSimulation]);

  // ------------------------------------------------------------------
  // Presentation helpers
  // ------------------------------------------------------------------

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        theme,
        connectMode,
        isConnectSource: node.id === connectSourceId,
        onLabelChange: (label: string) => updateNodeLabel(node.id, label),
        onDelete: () => deleteNode(node.id),
      },
    }));
  }, [nodes, theme, connectMode, connectSourceId, updateNodeLabel, deleteNode]);

  const edgesWithTheme = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        theme,
      },
    }));
  }, [edges, theme]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 120 && newHeight <= window.innerHeight * 0.8) {
        setPanelHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const tabs: { id: WorkspaceTab; icon: React.ElementType; label: string }[] = [
    { id: 'canvas', icon: Layers, label: 'Map' },
    { id: 'matrix', icon: Table, label: 'Matrix' },
    { id: 'inference', icon: Brain, label: 'Analyze' },
    { id: 'experiments', icon: FlaskConical, label: 'Experiments' },
  ];

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden transition-colors duration-500 antialiased",
      theme === 'modern' ? "bg-[#0a0a14] text-white" : "bg-[#f5f0e8] text-slate-900"
    )}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Compact project header */}
        <header className={cn(
          "h-14 shrink-0 backdrop-blur-xl border-b z-20 transition-colors duration-500",
          "grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 md:px-5",
          theme === 'modern' ? "bg-[#0a0a14]/80 border-white/5" : "bg-white border-slate-200 shadow-sm"
        )}>
          {/* Left: logo, File, project name */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border shrink-0",
              theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
            )}>
              <Brain className={cn("w-5 h-5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
            </div>

            <FileMenu
              currentProject={currentProject}
              onNewProject={createNewProject}
              onOpenProject={loadProject}
              onSaveProject={saveCurrentProject}
              onExportProject={exportProject}
              onImportFile={importProjectFile}
              onOpenDataEditor={() => setDataEditorOpen(true)}
              onLoadSample={loadSample}
              theme={theme}
            />

            <div className={cn("h-5 w-px shrink-0", theme === 'modern' ? "bg-white/10" : "bg-slate-200")} />

            {/* Inline Project Name Editor */}
            <div className="flex items-center gap-2 min-w-0">
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={editingNameValue}
                    onChange={(e) => setEditingNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') renameProject(editingNameValue);
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    onBlur={() => renameProject(editingNameValue)}
                    aria-label="Project name"
                    className={cn(
                      "px-2 py-1 text-sm font-medium rounded-lg outline-none max-w-[200px]",
                      theme === 'modern'
                        ? "bg-white/10 text-white border border-emerald-500/50 focus:border-emerald-400"
                        : "bg-white text-slate-900 border border-emerald-500"
                    )}
                  />
                  <button
                    onClick={() => renameProject(editingNameValue)}
                    aria-label="Confirm rename"
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      theme === 'modern' ? "text-emerald-400 hover:bg-emerald-500/20" : "text-emerald-600 hover:bg-emerald-50"
                    )}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    aria-label="Cancel rename"
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      theme === 'modern' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingNameValue(currentProject?.name || 'Untitled Project');
                    setIsEditingName(true);
                  }}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1 rounded-lg transition-all min-w-0 max-w-[120px] sm:max-w-[180px] md:max-w-[240px]",
                    theme === 'modern' ? "hover:bg-white/5 text-white/80" : "hover:bg-slate-100 text-slate-700"
                  )}
                  title="Click to rename project"
                >
                  <span className="text-sm font-medium truncate">
                    {currentProject?.name || 'Untitled Project'}
                  </span>
                  <Edit3 className={cn(
                    "w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    theme === 'modern' ? "text-white/60" : "text-slate-500"
                  )} />
                </button>
              )}

              {/* Save Status Indicator */}
              <div className="flex items-center gap-1.5 shrink-0" title={`Project is ${saveStatus}`}>
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  saveStatus === 'saved'
                    ? "bg-emerald-500"
                    : saveStatus === 'saving'
                      ? "bg-amber-500 animate-pulse"
                      : "bg-orange-500"
                )} />
                <span className={cn(
                  "text-xs hidden md:inline",
                  theme === 'modern' ? "text-white/60" : "text-slate-500"
                )}>
                  {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving…' : 'Unsaved'}
                </span>
              </div>
            </div>
          </div>

          {/* Center: workspace tabs */}
          <div className="flex justify-center min-w-0">
            <div className={cn(
              "flex p-0.5 rounded-lg border transition-colors duration-500 shrink-0",
              theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
            )}>
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-md text-xs font-semibold transition-all",
                    activeTab === id
                      ? (theme === 'modern' ? "bg-white/10 text-emerald-400" : "bg-white text-emerald-600 shadow-sm")
                      : (theme === 'modern' ? "text-white/60 hover:text-white/70" : "text-slate-500 hover:text-slate-600")
                  )}
                  title={label}
                  aria-label={label}
                  aria-current={activeTab === id ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: undo/redo, help, theme */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
              className={cn(
                "p-2 rounded-lg border transition-all disabled:opacity-25 disabled:cursor-not-allowed",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
              className={cn(
                "p-2 rounded-lg border transition-all disabled:opacity-25 disabled:cursor-not-allowed",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWalkthroughOpen(true)}
              aria-label="Getting started tour"
              title="Getting started tour"
              className={cn(
                "p-2 rounded-lg border transition-all hidden sm:flex",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setTheme(t => t === 'modern' ? 'academic' : 'modern')}
              aria-label={theme === 'modern' ? 'Switch to light theme' : 'Switch to dark theme'}
              className={cn(
                "p-2 rounded-lg border transition-all",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
              title={theme === 'modern' ? 'Switch to Academic Mode' : 'Switch to Modern Mode'}
            >
              {theme === 'modern' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Workspace Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden min-h-0">
          <div className="flex-1 relative min-h-0 overflow-hidden">
            <Suspense fallback={<TabLoading theme={theme} />}>
            {activeTab === 'canvas' ? (
              <>
                <Canvas
                  nodes={nodesWithCallbacks}
                  edges={edgesWithTheme}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={handleNodeClick}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  theme={theme}
                />
                <CanvasToolbar
                  nodes={fcmNodes}
                  connectMode={connectMode}
                  onAddConcept={addNode}
                  onToggleConnectMode={() => {
                    setConnectMode(m => !m);
                    setConnectSourceId(null);
                  }}
                  onAutoLayout={reorganizeTopology}
                  onFitView={handleFitView}
                  onFocusNode={focusNode}
                  theme={theme}
                />

                {/* Connect-mode hint */}
                {connectMode && (
                  <div className={cn(
                    "absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl border text-sm backdrop-blur-md",
                    theme === 'modern' ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-800"
                  )}>
                    {connectSourceId
                      ? 'Now click the target concept (Esc to cancel)'
                      : 'Connect mode: click the source concept'}
                  </div>
                )}

                {/* Empty state */}
                {nodes.length === 0 && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                    <div className={cn(
                      "pointer-events-auto max-w-md w-full mx-4 p-8 rounded-2xl border text-center",
                      theme === 'modern' ? "bg-[#12121f]/90 border-white/10" : "bg-white/95 border-slate-200 shadow-lg"
                    )}>
                      <Brain className={cn("w-10 h-10 mx-auto mb-4", theme === 'modern' ? "text-emerald-400/60" : "text-emerald-600/60")} />
                      <h2 className={cn("text-lg font-bold mb-1", theme === 'modern' ? "text-white" : "text-slate-900")}>
                        Start your causal map
                      </h2>
                      <p className={cn("text-sm mb-6", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
                        Add concepts, connect causes to effects, then run a simulation.
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={addNode}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add your first concept
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openFileInputRef.current?.click()}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                              theme === 'modern' ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <Upload className="w-4 h-4" />
                            Import
                          </button>
                          <button
                            onClick={() => setWalkthroughOpen(true)}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                              theme === 'modern' ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <Sparkles className="w-4 h-4" />
                            Quick tour
                          </button>
                        </div>
                        <p className={cn("text-xs mt-2", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
                          Or load a sample from <span className="font-medium">File → Open Sample</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : activeTab === 'matrix' ? (
              <MatrixEditor
                nodes={nodes}
                edges={edges}
                onUpdateWeight={updateMatrixWeight}
                onUpdateNode={updateNodeData}
                onAddNode={addNode}
                onDeleteNode={deleteNode}
                onImportData={handleImportData}
                linguisticTerms={currentLinguisticTerms}
                theme={theme}
              />
            ) : activeTab === 'inference' ? (
              <InferenceTab
                nodes={fcmNodes}
                edges={fcmEdges}
                results={simulationResults}
                theme={theme}
              />
            ) : (
              <ExperimentsTab
                nodes={fcmNodes}
                edges={fcmEdges}
                config={{
                  activationFunction: activationFn,
                  inferenceRule,
                  lambda,
                  maxIterations,
                  convergenceThreshold,
                }}
                scenarios={scenarios}
                onCaptureScenario={captureScenario}
                onDeleteScenario={deleteScenario}
                onApplyScenario={applyScenarioToMap}
                theme={theme}
              />
            )}
            </Suspense>

            {/* Floating Run bar (canvas only) */}
            {activeTab === 'canvas' && nodes.length > 0 && (
              <div className={cn(
                "absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 backdrop-blur-md p-2 rounded-2xl border shadow-2xl transition-all duration-500",
                theme === 'modern' ? "bg-[#0a0a14]/90 border-white/10" : "bg-white/90 border-slate-200"
              )}>
                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating || nodes.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50",
                    theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
                  )}
                >
                  <Play className={cn("w-4 h-4 fill-current", isSimulating && "animate-pulse")} />
                  {isSimulating ? 'Processing…' : 'Run Engine'}
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Results Panel (canvas only) */}
          {activeTab === 'canvas' && (
          <motion.div
            initial={{ height: 120 }}
            animate={{ height: resultsCollapsed ? 48 : (simulationResults.length > 0 ? Math.max(panelHeight, 300) : 120) }}
            className={cn(
              "border-t overflow-hidden z-20 relative transition-colors duration-500",
              theme === 'modern' ? "bg-[#0a0a14] border-white/5" : "bg-white border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
            )}
          >
            {/* Resize Handle */}
            <div
              onMouseDown={startResizing}
              className={cn(
                "absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-50 transition-colors",
                isResizing ? "bg-emerald-500" : "hover:bg-emerald-500/30"
              )}
            />

            <div className="max-w-7xl mx-auto px-8 py-3 h-full flex flex-col">
              <div className={cn("flex items-center justify-between", resultsCollapsed ? "mb-0" : "mb-4")}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setResultsCollapsed(c => !c)}
                    aria-label={resultsCollapsed ? "Expand results panel" : "Collapse results panel"}
                    title={resultsCollapsed ? "Expand results panel" : "Collapse results panel"}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all",
                      theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white" : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {resultsCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <div>
                    <h3 className={cn(
                      "text-xs font-semibold uppercase tracking-wider transition-colors duration-500",
                      theme === 'modern' ? "text-white/60" : "text-slate-500"
                    )}>Simulation Output</h3>
                    {!resultsCollapsed && simulationResults.length > 0 && (
                      <p className={cn(
                        "text-xs mt-0.5 transition-colors duration-500",
                        theme === 'modern' ? "text-white/55" : "text-slate-500"
                      )}>Convergence across {simulation?.iterations ?? 0} iterations</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!resultsCollapsed && simulationResults.length > 0 && (
                    <>
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-500",
                        simulation?.converged
                          ? (theme === 'modern' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200")
                          : (theme === 'modern' ? "bg-amber-500/5 border-amber-500/10" : "bg-amber-50 border-amber-200")
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                          simulation?.converged
                            ? (theme === 'modern' ? "bg-emerald-500" : "bg-emerald-600")
                            : (theme === 'modern' ? "bg-amber-500" : "bg-amber-600")
                        )} />
                        <span className={cn(
                          "text-xs font-semibold transition-colors duration-500",
                          simulation?.converged
                            ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-700")
                            : (theme === 'modern' ? "text-amber-400" : "text-amber-700")
                        )}>
                          {simulation?.converged
                            ? 'Converged'
                            : simulation?.limitCycle
                              ? `Limit Cycle (period ${simulation.limitCycle.period})`
                              : 'Max Iterations Reached'}
                        </span>
                      </div>
                      <button
                        onClick={resetSimulation}
                        className={cn(
                          "text-xs font-semibold px-3 py-1.5 rounded-lg transition-all",
                          theme === 'modern' ? "text-red-400/70 hover:text-red-400 hover:bg-red-500/5" : "text-red-600 hover:text-red-700 hover:bg-red-50"
                        )}
                      >
                        Reset
                      </button>
                    </>
                  )}
                </div>
              </div>
              {!resultsCollapsed && (
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <Suspense fallback={null}>
                    <SimulationChart data={simulationResults} nodes={fcmNodes} theme={theme} />
                  </Suspense>
                </div>
                <div className={cn(
                  "rounded-2xl border p-4 overflow-y-auto custom-scrollbar transition-colors duration-500",
                  theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                  <h4 className={cn(
                    "text-xs font-semibold uppercase tracking-wider mb-4 transition-colors duration-500",
                    theme === 'modern' ? "text-white/60" : "text-slate-500"
                  )}>Final Vector</h4>
                  {simulationResults.length > 0 ? (
                    <div className="space-y-4">
                      {fcmNodes.map(node => {
                        const finalVal = simulationResults[simulationResults.length - 1][node.id];
                        const initialVal = node.initialActivation;
                        const diff = finalVal - initialVal;
                        return (
                          <div key={node.id} className="space-y-1.5">
                            <div className="flex justify-between items-center gap-2">
                              <span className={cn(
                                "text-xs font-medium truncate transition-colors duration-500",
                                theme === 'modern' ? "text-white/70" : "text-slate-600"
                              )}>{node.label}</span>
                              <span className={cn(
                                "text-xs font-mono font-semibold shrink-0 transition-colors duration-500",
                                theme === 'modern' ? "text-white" : "text-slate-900"
                              )}>{finalVal.toFixed(3)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "flex-1 h-1.5 rounded-full overflow-hidden transition-colors duration-500",
                                theme === 'modern' ? "bg-white/5" : "bg-slate-200"
                              )}>
                                <div
                                  className={cn(
                                    "h-full transition-all duration-700",
                                    finalVal >= 0 ? "bg-emerald-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${Math.min(Math.abs(finalVal), 1) * 100}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-xs font-semibold shrink-0",
                                diff > 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : (theme === 'modern' ? "text-white/60" : "text-slate-500")
                              )} aria-label={diff > 0 ? 'increased' : diff < 0 ? 'decreased' : 'unchanged'}>
                                {diff > 0 ? '↑' : diff < 0 ? '↓' : '·'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={cn(
                      "h-full flex flex-col items-center justify-center text-center",
                      theme === 'modern' ? "text-white/55" : "text-slate-500"
                    )}>
                      <Database className="w-7 h-7 mb-2" />
                      <p className="text-xs font-medium">Awaiting Data</p>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>
          </motion.div>
          )}
        </main>
      </div>

      {/* Inspector Toggle Button */}
      <button
        onClick={() => setInspectorCollapsed(!inspectorCollapsed)}
        className={cn(
          "fixed top-1/2 -translate-y-1/2 z-40 p-2.5 rounded-l-xl border-l border-t border-b shadow-lg transition-all duration-300",
          theme === 'modern'
            ? "bg-[#0a0a14] border-white/10 text-white/60 hover:text-emerald-400 hover:bg-white/5"
            : "bg-[#faf8f5] border-stone-200 text-slate-500 hover:text-emerald-600 hover:bg-white",
          // Sits at the panel's left edge when open, at the viewport edge when collapsed
          inspectorCollapsed ? "right-0" : "right-80"
        )}
        aria-label={inspectorCollapsed ? "Show inspector panel" : "Hide inspector panel"}
        title={inspectorCollapsed ? "Show Inspector" : "Hide Inspector"}
      >
        {inspectorCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
      </button>

      {/* Contextual Inspector */}
      <motion.div
        initial={false}
        animate={{
          width: inspectorCollapsed ? 0 : 320,
          opacity: inspectorCollapsed ? 0 : 1
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden shrink-0"
      >
        <Inspector
          nodes={fcmNodes}
          edges={fcmEdges}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onUpdateNode={updateNodeData}
          onDeleteNode={deleteNode}
          onAddEdge={addEdgeBetween}
          onDeleteEdge={deleteEdge}
          onUpdateEdgeWeight={updateEdgeWeightById}
          onUpdateEdgeUncertainty={updateEdgeUncertainty}
          onFlipEdge={flipEdge}
          onClearSelection={clearSelection}
          activationFn={activationFn}
          setActivationFn={setActivationFn}
          inferenceRule={inferenceRule}
          setInferenceRule={setInferenceRule}
          lambda={lambda}
          setLambda={setLambda}
          maxIterations={maxIterations}
          setMaxIterations={setMaxIterations}
          convergenceThreshold={convergenceThreshold}
          setConvergenceThreshold={setConvergenceThreshold}
          linguisticScale={linguisticScale}
          setLinguisticScale={setLinguisticScale}
          membershipFunction={membershipFunction}
          setMembershipFunction={setMembershipFunction}
          linguisticTerms={currentLinguisticTerms}
          onRunSimulation={handleRunSimulation}
          isSimulating={isSimulating}
          showRunButton={activeTab === 'canvas'}
          theme={theme}
        />
      </motion.div>

      {/* Data editor modal (formerly the Data tab) */}
      {dataEditorOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Model data editor"
        >
          <div className="absolute inset-0 bg-black/60" onClick={() => setDataEditorOpen(false)} />
          <div className={cn(
            "relative w-full max-w-5xl h-[85vh] rounded-2xl border overflow-hidden flex flex-col",
            theme === 'modern' ? "bg-[#0a0a14] border-white/10" : "bg-white border-slate-200"
          )}>
            <button
              onClick={() => setDataEditorOpen(false)}
              aria-label="Close data editor"
              className={cn(
                "absolute top-3 right-3 z-20 p-2 rounded-lg border transition-colors",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="relative flex-1">
              <Suspense fallback={<TabLoading theme={theme} />}>
                <DataInspector
                  nodes={fcmNodes}
                  edges={fcmEdges}
                  onImportData={(n, e) => {
                    handleImportData(n, e);
                    setDataEditorOpen(false);
                  }}
                  theme={theme}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* Hidden input backing the Ctrl+O shortcut */}
      <input
        ref={openFileInputRef}
        type="file"
        accept=".json,.fcm.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) importProjectFile(file);
          e.target.value = '';
        }}
      />

      <Toaster theme={theme} />
      <Walkthrough open={walkthroughOpen} onClose={() => setWalkthroughOpen(false)} theme={theme} />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Dashboard />
    </ReactFlowProvider>
  );
}
