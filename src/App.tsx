import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
} from '@xyflow/react';
import { Brain, Plus, Play, Layers, Database, LayoutGrid, Table, Sun, Moon, PanelRightClose, PanelRightOpen, Check, X, Edit3, FlaskConical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import dagre from 'dagre';
import Canvas from './components/Canvas';
import Sidebar from './components/Sidebar';
import EdgeEditor from './components/EdgeEditor';
import SimulationChart from './components/SimulationChart';
import DataInspector from './components/DataInspector';
import MatrixEditor from './components/MatrixEditor';
import InferenceTab from './components/InferenceTab';
import ExperimentsTab from './components/ExperimentsTab';
import FCMNodeComponent from './components/FCMNode';
import FCMEdgeComponent from './components/FCMEdge';
import ProjectManager from './components/ProjectManager';
import FileMenu from './components/FileMenu';
import { storageService, Project, createEmptyProject } from './lib/storage';
import { 
  FCMNode, 
  FCMEdge, 
  ActivationFunction, 
  SimulationResult,
  LinguisticScalePreset,
  MembershipFunctionType,
  LINGUISTIC_SCALE_PRESETS,
} from './types';
import { runSimulation } from './logic/fcmEngine';
import { cn } from './lib/utils';

const nodeTypes = {
  fcm: FCMNodeComponent,
};

const edgeTypes = {
  fcm: FCMEdgeComponent,
};

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

function Dashboard() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [activationFn, setActivationFn] = useState<ActivationFunction>('sigmoid');
  const [lambda, setLambda] = useState(1);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'canvas' | 'data' | 'matrix' | 'inference' | 'experiments'>('canvas');
  const [theme, setTheme] = useState<'modern' | 'academic'>('modern');
  const [panelHeight, setPanelHeight] = useState(120);
  const [isResizing, setIsResizing] = useState(false);

  // Advanced parameters state
  const [linguisticScale, setLinguisticScale] = useState<LinguisticScalePreset>('9-point');
  const [membershipFunction, setMembershipFunction] = useState<MembershipFunctionType>('triangular');
  
  // Sidebar collapsed state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project management state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Get current linguistic terms based on selected scale
  const currentLinguisticTerms = LINGUISTIC_SCALE_PRESETS[linguisticScale];

  // History & Clipboard State
  const [history, setHistory] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const saveToHistory = useCallback(() => {
    setHistory((prev) => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }].slice(-50));
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((prev) => [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [history, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
    setFuture((prev) => prev.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  // ============================================================
  // Project Management
  // ============================================================

  // Build current project object from state
  const buildCurrentProject = useCallback((): Project => {
    const now = new Date().toISOString();
    const projectNodes = nodes.map(node => ({
      id: node.id,
      label: (node.data?.label as string) || 'Untitled',
      initialActivation: (node.data?.initialActivation as number) ?? 0.5,
      activation: (node.data?.activation as number) ?? (node.data?.initialActivation as number) ?? 0.5,
      position: node.position,
    }));
    const projectEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data?.weight as number) ?? 0,
    }));

    if (currentProject) {
      return {
        ...currentProject,
        nodes: projectNodes,
        edges: projectEdges,
        nodeCount: projectNodes.length,
        edgeCount: projectEdges.length,
        updatedAt: now,
        config: {
          activationFunction: activationFn,
          lambda,
          linguisticScale,
          membershipFunction,
          theme,
        },
      };
    }

    // Create new project if none exists
    return {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Untitled Project',
      createdAt: now,
      updatedAt: now,
      nodeCount: projectNodes.length,
      edgeCount: projectEdges.length,
      nodes: projectNodes,
      edges: projectEdges,
      config: {
        activationFunction: activationFn,
        lambda,
        linguisticScale,
        membershipFunction,
        theme,
      },
      version: 1,
    };
  }, [nodes, edges, currentProject, activationFn, lambda, linguisticScale, membershipFunction, theme]);

  // Save current project
  const saveCurrentProject = useCallback(async (): Promise<Project | null> => {
    setSaveStatus('saving');
    const project = buildCurrentProject();
    const result = await storageService.saveProject(project);
    
    if (result.success && result.data) {
      setCurrentProject(result.data);
      await storageService.setCurrentProjectId(result.data.id);
      setSaveStatus('saved');
      return result.data;
    } else {
      setSaveStatus('unsaved');
      console.error('Failed to save project:', result.error);
      return null;
    }
  }, [buildCurrentProject]);

  // Load project into state
  const loadProject = useCallback((project: Project) => {
    // Convert project nodes to React Flow nodes
    const flowNodes: Node[] = project.nodes.map(node => ({
      id: node.id,
      type: 'fcm',
      position: node.position,
      data: {
        label: node.label,
        initialActivation: node.initialActivation,
        activation: node.activation,
      },
    }));

    // Convert project edges to React Flow edges
    const flowEdges: Edge[] = project.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'fcm',
      data: { weight: edge.weight },
      animated: true,
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
    setCurrentProject(project);

    // Restore config if available
    if (project.config) {
      setActivationFn(project.config.activationFunction);
      setLambda(project.config.lambda);
      setLinguisticScale(project.config.linguisticScale);
      setMembershipFunction(project.config.membershipFunction);
      setTheme(project.config.theme);
    }

    // Clear simulation results when loading new project
    setSimulationResults([]);
    setSaveStatus('saved');
  }, [setNodes, setEdges]);

  // Create new empty project
  const createNewProject = useCallback(() => {
    const emptyProject = createEmptyProject();
    setNodes([]);
    setEdges([]);
    setCurrentProject(emptyProject);
    setSimulationResults([]);
    setSaveStatus('unsaved');
    // Auto-save the new project immediately
    storageService.saveProject(emptyProject).then(result => {
      if (result.success && result.data) {
        setCurrentProject(result.data);
        storageService.setCurrentProjectId(result.data.id);
        setSaveStatus('saved');
      }
    });
  }, [setNodes, setEdges]);

  // Load last project on startup
  useEffect(() => {
    const loadLastProject = async () => {
      const result = await storageService.loadCurrentProject();
      if (result.success && result.data) {
        loadProject(result.data);
      } else {
        // No existing project, create one from initial nodes/edges
        const initialProject = buildCurrentProject();
        const saveResult = await storageService.saveProject(initialProject);
        if (saveResult.success && saveResult.data) {
          setCurrentProject(saveResult.data);
          await storageService.setCurrentProjectId(saveResult.data.id);
        }
      }
    };
    loadLastProject();
  }, []); // Only run on mount

  // Auto-save when nodes/edges change (debounced)
  useEffect(() => {
    if (!currentProject) return;
    
    setSaveStatus('unsaved');
    const project = buildCurrentProject();
    storageService.scheduleAutoSave(project);
    
    // Update save status when auto-save completes
    const unsubscribe = storageService.onSave(() => {
      setSaveStatus('saved');
    });
    
    return () => unsubscribe();
  }, [nodes, edges, activationFn, lambda, linguisticScale, membershipFunction, theme]);

  // Rename project
  const renameProject = useCallback(async (newName: string) => {
    if (!currentProject || !newName.trim()) return;
    
    const updatedProject = { ...currentProject, name: newName.trim() };
    const result = await storageService.saveProject(updatedProject);
    if (result.success && result.data) {
      setCurrentProject(result.data);
    }
    setIsEditingName(false);
  }, [currentProject]);

  // Export current project to file
  const exportProject = useCallback(() => {
    if (!currentProject) return;
    const project = buildCurrentProject();
    storageService.exportToFile(project);
  }, [currentProject, buildCurrentProject]);

  // Import project from file
  const importProjectFile = useCallback(async (file: File) => {
    const result = await storageService.importFromFile(file);
    if (result.success && result.data) {
      loadProject(result.data);
    }
  }, [loadProject]);

  const copy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected || (selectedNodes.some(sn => sn.id === e.source) && selectedNodes.some(sn => sn.id === e.target)));
    if (selectedNodes.length > 0) {
      setClipboard({ nodes: selectedNodes, edges: selectedEdges });
    }
  }, [nodes, edges]);

  const paste = useCallback(() => {
    if (!clipboard) return;
    saveToHistory();
    const idMap: Record<string, string> = {};
    const newNodes = clipboard.nodes.map((node) => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: true,
      };
    });

    const newEdges = clipboard.edges.map((edge) => ({
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target,
      selected: true,
    }));

    setNodes((nds) => nds.map(n => ({ ...n, selected: false })).concat(newNodes));
    setEdges((eds) => eds.map(e => ({ ...e, selected: false })).concat(newEdges));
  }, [clipboard, saveToHistory, setNodes, setEdges]);

  const deleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      saveToHistory();
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) => eds.filter((e) => !e.selected && !selectedNodes.some(sn => sn.id === e.source || sn.id === e.target)));
    }
  }, [nodes, edges, saveToHistory, setNodes, setEdges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 'c') {
        if (document.activeElement?.tagName !== 'INPUT') {
          copy();
        }
      } else if (isCtrl && e.key === 'v') {
        if (document.activeElement?.tagName !== 'INPUT') {
          paste();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName !== 'INPUT') {
          deleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copy, paste, deleteSelected]);

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

  React.useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const updateNodeLabel = useCallback((nodeId: string, label: string) => {
    saveToHistory();
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, label } };
        }
        return node;
      })
    );
  }, [setNodes]);

  const updateEdgeWeightById = useCallback((edgeId: string, weight: number) => {
    saveToHistory();
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, data: { ...edge.data, weight } };
        }
        return edge;
      })
    );
  }, [setEdges]);

  const flipEdge = useCallback((edgeId: string) => {
    saveToHistory();
    setEdges((eds) =>
      eds.map((edge) => {
        if (edge.id === edgeId) {
          return {
            ...edge,
            source: edge.target,
            target: edge.source,
          };
        }
        return edge;
      })
    );
  }, [setEdges]);

  const updateNodeActivation = useCallback((nodeId: string, initialActivation: number) => {
    saveToHistory();
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, initialActivation, activation: initialActivation },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const reorganizeTopology = useCallback(() => {
    saveToHistory();
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    
    const nodeWidth = 200;
    const nodeHeight = 200;
    
    dagreGraph.setGraph({ rankdir: 'LR', ranksep: 150, nodesep: 100 });

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
  }, [nodes, edges, setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    saveToHistory();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const deleteEdge = useCallback((edgeId: string) => {
    saveToHistory();
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
  }, [setEdges]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        theme,
        onLabelChange: (label: string) => updateNodeLabel(node.id, label),
        onActivationChange: (val: number) => updateNodeActivation(node.id, val),
        onDelete: () => deleteNode(node.id),
      },
    }));
  }, [nodes, theme, updateNodeLabel, updateNodeActivation, deleteNode]);

  const edgesWithCallbacks = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        theme,
        onWeightChange: updateEdgeWeightById,
        onFlip: flipEdge,
        onDelete: deleteEdge,
      },
    }));
  }, [edges, theme, updateEdgeWeightById, flipEdge, deleteEdge]);

  const fcmNodes: FCMNode[] = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      label: (node.data?.label as string) || 'New Concept',
      activation: (node.data?.activation as number) ?? (node.data?.initialActivation as number) ?? 0.5,
      initialActivation: (node.data?.initialActivation as number) ?? 0.5,
    }));
  }, [nodes]);

  const fcmEdges: FCMEdge[] = useMemo(() => {
    return edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data?.weight as number) || 0,
    }));
  }, [edges]);

  const onConnect = useCallback(
    (params: Connection) => {
      saveToHistory();
      setEdges((eds) => addEdge({ ...params, type: 'fcm', data: { weight: 0.5 }, animated: true }, eds));
    },
    [saveToHistory, setEdges]
  );

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
  }, []);

  const onNodeClick = useCallback(() => {
    setSelectedEdge(null);
  }, []);

  const updateNodeData = useCallback((nodeId: string, updates: Partial<FCMNode>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const newUpdates = { ...updates };
          // If initialActivation is updated, sync activation as well for real-time feedback
          if ('initialActivation' in updates) {
            newUpdates.activation = updates.initialActivation;
          }
          return {
            ...node,
            data: { ...node.data, ...newUpdates },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const addNode = useCallback(() => {
    saveToHistory();
    const id = Math.random().toString(36).substr(2, 9);
    const newNode: Node = {
      id,
      type: 'fcm',
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
      data: { label: `New Concept ${nodes.length + 1}`, initialActivation: 0.5 },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length, setNodes, saveToHistory]);

  const updateMatrixWeight = useCallback((sourceId: string, targetId: string, weight: number) => {
    saveToHistory();
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
  }, [saveToHistory, setEdges]);

  const addEdgeFromSidebar = useCallback((sourceId: string, targetId: string, weight: number) => {
    saveToHistory();
    const id = `e${sourceId}-${targetId}`;
    const newEdge: Edge = {
      id,
      type: 'fcm',
      source: sourceId,
      target: targetId,
      data: { weight },
      animated: true,
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges]);

  const updateEdgeWeight = useCallback((weight: number) => {
    if (!selectedEdge) return;
    saveToHistory();
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          return { ...e, data: { ...e.data, weight } };
        }
        return e;
      })
    );
    setSelectedEdge((prev) => prev ? { ...prev, data: { ...prev.data, weight } } : null);
  }, [selectedEdge, setEdges]);

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const results = runSimulation(fcmNodes, fcmEdges, activationFn, lambda);
      setSimulationResults(results);
      
      // Sync final results back to nodes for canvas visualization
      if (results.length > 0) {
        const finalState = results[results.length - 1];
        setNodes((nds) => 
          nds.map(node => ({
            ...node,
            data: {
              ...node.data,
              activation: finalState[node.id]
            }
          }))
        );
      }
      
      setIsSimulating(false);
    }, 800);
  };

  const handleImportData = useCallback((importedNodes: FCMNode[], importedEdges: FCMEdge[]) => {
    saveToHistory();
    
    // Convert FCMNodes to React Flow nodes with positions
    const newNodes: Node[] = importedNodes.map((n, index) => ({
      id: n.id,
      type: 'fcm',
      position: { 
        x: 100 + (index % 3) * 250, 
        y: 100 + Math.floor(index / 3) * 200 
      },
      data: { 
        label: n.label, 
        initialActivation: n.initialActivation,
        activation: n.activation || n.initialActivation
      },
    }));

    // Convert FCMEdges to React Flow edges
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
    setSimulationResults([]);
  }, [saveToHistory, setNodes, setEdges]);

  return (
    <div className={cn(
      "flex h-screen w-full overflow-hidden transition-colors duration-500 antialiased",
      theme === 'modern' ? "bg-[#0a0a14] text-white font-mono" : "bg-[#f5f0e8] text-slate-900 font-serif"
    )}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Responsive Header - Using CSS Grid for reliable layout */}
        <header className={cn(
          "h-14 sm:h-16 md:h-20 backdrop-blur-xl border-b z-20 transition-colors duration-500",
          "grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-4 md:px-6 lg:px-8",
          theme === 'modern' ? "bg-[#0a0a14]/80 border-white/5" : "bg-white border-slate-200 shadow-sm"
        )}>
          {/* Left: Logo (fixed width) */}
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center border transition-all duration-500 shrink-0",
                theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : "bg-emerald-50 border-emerald-200"
              )}
            >
              <Brain className={cn("w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
            </motion.div>
            <div className="hidden md:block">
              <h1 className={cn(
                "text-base lg:text-lg font-black tracking-tighter transition-colors duration-500 whitespace-nowrap",
                theme === 'modern' ? "text-white" : "text-slate-900"
              )}>
                <span className="hidden xl:inline">FuzzyCognitiveMapper</span>
                <span className="xl:hidden">FCM</span>
              </h1>
            </div>
          </div>

          {/* Center: File Menu, Project Name, Tabs (flexible, can shrink) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 min-w-0 overflow-hidden">
            <FileMenu
              currentProject={currentProject}
              onNewProject={createNewProject}
              onOpenProject={loadProject}
              onSaveProject={saveCurrentProject}
              onExportProject={exportProject}
              onImportFile={importProjectFile}
              theme={theme}
            />
            
            <div className={cn("h-5 w-px", theme === 'modern' ? "bg-white/10" : "bg-slate-200")} />
            
            {/* Inline Project Name Editor */}
            <div className="flex items-center gap-2">
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
                    className={cn(
                      "px-2 py-1 text-sm font-medium rounded-lg outline-none max-w-[150px] md:max-w-[200px]",
                      theme === 'modern'
                        ? "bg-white/10 text-white border border-emerald-500/50 focus:border-emerald-400"
                        : "bg-white text-slate-900 border border-emerald-500"
                    )}
                  />
                  <button
                    onClick={() => renameProject(editingNameValue)}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      theme === 'modern' ? "text-emerald-400 hover:bg-emerald-500/20" : "text-emerald-600 hover:bg-emerald-50"
                    )}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className={cn(
                      "p-1 rounded-md transition-colors",
                      theme === 'modern' ? "text-white/40 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setEditingNameValue(currentProject?.name || 'Untitled Project');
                    setIsEditingName(true);
                  }}
                  className={cn(
                    "group flex items-center gap-2 px-2 py-1 rounded-lg transition-all max-w-[120px] sm:max-w-[150px] md:max-w-[200px]",
                    theme === 'modern'
                      ? "hover:bg-white/5 text-white/80"
                      : "hover:bg-slate-100 text-slate-700"
                  )}
                  title="Click to rename project"
                >
                  <span className="text-sm font-medium truncate">
                    {currentProject?.name || 'Untitled Project'}
                  </span>
                  <Edit3 className={cn(
                    "w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    theme === 'modern' ? "text-white/40" : "text-slate-400"
                  )} />
                </button>
              )}
              
              {/* Save Status Indicator */}
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  saveStatus === 'saved' 
                    ? "bg-emerald-500"
                    : saveStatus === 'saving'
                      ? "bg-amber-500 animate-pulse"
                      : "bg-orange-500"
                )} />
                <span className={cn(
                  "text-[9px] uppercase tracking-widest hidden sm:inline",
                  theme === 'modern' ? "text-white/30" : "text-slate-400"
                )}>
                  {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved'}
                </span>
              </div>
            </div>
            
            {/* Tabs */}
            <div className={cn(
              "flex p-0.5 rounded-lg border transition-colors duration-500 shrink-0",
              theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
            )}>
              {[
                { id: 'canvas', icon: Layers, label: 'Canvas' },
                { id: 'data', icon: Database, label: 'Data' },
                { id: 'matrix', icon: Table, label: 'Matrix' },
                { id: 'inference', icon: Brain, label: 'Inference' },
                { id: 'experiments', icon: FlaskConical, label: 'Experiments' },
              ].map(({ id, icon: Icon, label }) => (
                <button 
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={cn(
                    "flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all",
                    activeTab === id 
                      ? (theme === 'modern' ? "bg-white/10 text-emerald-400" : "bg-white text-emerald-600 shadow-sm")
                      : (theme === 'modern' ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
                  )}
                  title={label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Theme toggle & Actions (fixed width) */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(t => t === 'modern' ? 'academic' : 'modern')}
              className={cn(
                "p-2 rounded-lg border transition-all duration-500",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white/60 hover:bg-white/10" : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
              )}
              title={theme === 'modern' ? 'Switch to Academic Mode' : 'Switch to Modern Mode'}
            >
              {theme === 'modern' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <button 
              onClick={reorganizeTopology}
              className={cn(
                "p-2 rounded-lg transition-all border hidden sm:flex",
                theme === 'modern' ? "text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 border-transparent hover:border-emerald-500/20" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border-transparent hover:border-emerald-200"
              )}
              title="Reorganize Topology"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Workspace Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden min-h-0">
          <div className="flex-1 relative min-h-0 overflow-hidden">
            {activeTab === 'canvas' ? (
              <Canvas
                nodes={nodesWithCallbacks}
                edges={edgesWithCallbacks}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                onNodeClick={onNodeClick}
                onNodeDragStop={() => saveToHistory()}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                theme={theme}
              />
            ) : activeTab === 'matrix' ? (
              <MatrixEditor
                nodes={nodes}
                edges={edges}
                onUpdateWeight={updateMatrixWeight}
                onUpdateNode={updateNodeData}
                onAddNode={addNode}
                onDeleteNode={deleteNode}
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
            ) : activeTab === 'experiments' ? (
              <ExperimentsTab
                nodes={fcmNodes}
                edges={fcmEdges}
                onRunSimulation={handleRunSimulation}
                theme={theme}
              />
            ) : (
              <DataInspector 
                nodes={fcmNodes} 
                edges={fcmEdges} 
                onImportData={handleImportData}
                theme={theme} 
              />
            )}
            
            <AnimatePresence>
              {selectedEdge && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute top-6 right-6 z-50"
                >
                  <EdgeEditor
                    edge={selectedEdge}
                    onUpdate={updateEdgeWeight}
                    onClose={() => setSelectedEdge(null)}
                    linguisticTerms={currentLinguisticTerms}
                    theme={theme}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Floating Action Bar */}
            <div className={cn(
              "absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 backdrop-blur-md p-2 rounded-2xl border shadow-2xl transition-all duration-500",
              theme === 'modern' ? "bg-[#0a0a14]/90 border-white/10" : "bg-white/90 border-slate-200"
            )}>
              <button 
                onClick={addNode}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  theme === 'modern' ? "bg-white/5 text-white border-white/10 hover:bg-white/10" : "bg-slate-100 text-slate-900 border-slate-200 hover:bg-slate-200"
                )}
              >
                <Plus className="w-4 h-4" />
                Add Concept
              </button>
              <div className={cn("w-px h-8 mx-1 transition-colors", theme === 'modern' ? "bg-white/5" : "bg-slate-200")} />
              <button 
                onClick={handleRunSimulation}
                disabled={isSimulating || nodes.length === 0}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50",
                  theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <Play className={cn("w-4 h-4 fill-current", isSimulating && "animate-pulse")} />
                {isSimulating ? 'Processing...' : 'Run Engine'}
              </button>
            </div>
          </div>

          {/* Collapsible Results Panel */}
          <motion.div 
            initial={{ height: 120 }}
            animate={{ height: simulationResults.length > 0 ? Math.max(panelHeight, 300) : 120 }}
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
                isResizing ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "hover:bg-emerald-500/30"
              )}
            />

            <div className="max-w-7xl mx-auto p-8 h-full flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className={cn(
                    "text-[10px] font-black uppercase tracking-[0.4em] transition-colors duration-500",
                    theme === 'modern' ? "text-white/40" : "text-slate-400"
                  )}>Simulation Output</h3>
                  <p className={cn(
                    "text-[10px] mt-1 transition-colors duration-500",
                    theme === 'modern' ? "text-white/20" : "text-slate-400"
                  )}>Real-time convergence analysis across {simulationResults.length} iterations</p>
                </div>
                <div className="flex items-center gap-4">
                  {simulationResults.length > 0 && (
                    <>
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-500",
                        theme === 'modern' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                          theme === 'modern' ? "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-emerald-600"
                        )} />
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest transition-colors duration-500",
                          theme === 'modern' ? "text-emerald-400" : "text-emerald-700"
                        )}>
                          {simulationResults.length < 20 ? 'Converged' : 'Stabilized'}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setSimulationResults([]);
                          // Reset nodes to their initial activation values
                          setNodes((nds) => 
                            nds.map(node => ({
                              ...node,
                              data: {
                                ...node.data,
                                activation: node.data.initialActivation
                              }
                            }))
                          );
                        }}
                        className={cn(
                          "text-[9px] font-black px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest",
                          theme === 'modern' ? "text-red-400/60 hover:text-red-400 hover:bg-red-500/5" : "text-red-600 hover:text-red-700 hover:bg-red-50"
                        )}
                      >
                        Reset
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3">
                  <SimulationChart data={simulationResults} nodes={fcmNodes} theme={theme} />
                </div>
                <div className={cn(
                  "rounded-2xl border p-6 overflow-y-auto custom-scrollbar transition-colors duration-500",
                  theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                  <h4 className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] mb-6 transition-colors duration-500",
                    theme === 'modern' ? "text-white/20" : "text-slate-400"
                  )}>Final Vector</h4>
                  {simulationResults.length > 0 ? (
                    <div className="space-y-5">
                      {fcmNodes.map(node => {
                        const finalVal = simulationResults[simulationResults.length - 1][node.id];
                        const initialVal = node.initialActivation;
                        const diff = finalVal - initialVal;
                        return (
                          <div key={node.id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={cn(
                                "text-[10px] font-bold truncate w-24 uppercase tracking-tighter transition-colors duration-500",
                                theme === 'modern' ? "text-white/60" : "text-slate-600"
                              )}>{node.label}</span>
                              <span className={cn(
                                "text-xs font-black transition-colors duration-500",
                                theme === 'modern' ? "text-white" : "text-slate-900"
                              )}>{(finalVal * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "flex-1 h-1 rounded-full overflow-hidden transition-colors duration-500",
                                theme === 'modern' ? "bg-white/5" : "bg-slate-200"
                              )}>
                                <div 
                                  className={cn(
                                    "h-full bg-emerald-500 transition-all duration-1000",
                                    theme === 'modern' && "shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                  )}
                                  style={{ width: `${finalVal * 100}%` }}
                                />
                              </div>
                              <span className={cn(
                                "text-[10px] font-black",
                                diff > 0 ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-600") : diff < 0 ? (theme === 'modern' ? "text-red-400" : "text-red-600") : "text-white/10"
                              )}>
                                {diff > 0 ? '↑' : diff < 0 ? '↓' : '•'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                      <Database className={cn("w-8 h-8 mb-3", theme === 'modern' ? "text-white" : "text-slate-900")} />
                      <p className={cn("text-[9px] font-black uppercase tracking-widest", theme === 'modern' ? "text-white" : "text-slate-900")}>Awaiting Data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-40 p-2 rounded-l-xl border-l border-t border-b shadow-lg transition-all duration-300",
          theme === 'modern' 
            ? "bg-[#0a0a14] border-white/10 text-white/60 hover:text-emerald-400 hover:bg-white/5" 
            : "bg-[#faf8f5] border-stone-200 text-slate-400 hover:text-emerald-600 hover:bg-white",
          sidebarCollapsed ? "translate-x-0" : "translate-x-96"
        )}
        title={sidebarCollapsed ? "Show Configuration Panel" : "Hide Configuration Panel"}
      >
        {sidebarCollapsed ? <PanelRightOpen className="w-5 h-5" /> : <PanelRightClose className="w-5 h-5" />}
      </button>

      {/* Sidebar with refined styling */}
      <motion.div
        initial={false}
        animate={{ 
          width: sidebarCollapsed ? 0 : 384,
          opacity: sidebarCollapsed ? 0 : 1 
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <Sidebar
          nodes={fcmNodes}
          edges={fcmEdges}
          onUpdateNode={updateNodeData}
          onAddNode={addNode}
          onDeleteNode={deleteNode}
          onAddEdge={addEdgeFromSidebar}
          onDeleteEdge={deleteEdge}
          activationFn={activationFn}
          setActivationFn={setActivationFn}
          onRunSimulation={handleRunSimulation}
          isSimulating={isSimulating}
          lambda={lambda}
          setLambda={setLambda}
          linguisticScale={linguisticScale}
          setLinguisticScale={setLinguisticScale}
          membershipFunction={membershipFunction}
          setMembershipFunction={setMembershipFunction}
          theme={theme}
        />
      </motion.div>

      {/* Project Manager Modal */}
      <ProjectManager
        isOpen={projectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
        currentProject={currentProject}
        onLoadProject={loadProject}
        onNewProject={createNewProject}
        onSaveCurrentProject={saveCurrentProject}
        theme={theme}
      />
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
