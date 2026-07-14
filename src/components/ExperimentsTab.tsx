import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Trash2,
  Download,
  CheckSquare,
  Square,
  TrendingUp,
  BarChart3,
  GitCompare,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit3,
  Check,
  Sliders,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../lib/utils';
import {
  SimulationRun,
  compareRuns,
  calculateCentrality,
  ComparisonResult,
  CentralityAnalysis,
} from '../lib/experiments';
import { experimentStore } from '../lib/experiments/experimentStore';
import { FCMNode, FCMEdge } from '../types';
import { runSimulation } from '../logic/fcmEngine';

interface SensitivityData {
  inputValue: number;
  [conceptLabel: string]: number;
}

interface ExperimentsTabProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  onRunSimulation: () => void;
  theme?: 'modern' | 'academic';
}

type AnalysisView = 'convergence' | 'finalState' | 'comparison' | 'sensitivity' | 'centrality';

const COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

const ExperimentsTab: React.FC<ExperimentsTabProps> = ({
  nodes,
  edges,
  theme = 'modern',
}) => {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<AnalysisView>('convergence');
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newRunName, setNewRunName] = useState('');
  const [showNewRunDialog, setShowNewRunDialog] = useState(false);
  
  // Sensitivity analysis state
  const [sensitivityInputId, setSensitivityInputId] = useState<string | null>(null);
  const [sensitivityData, setSensitivityData] = useState<SensitivityData[]>([]);
  const [sensitivityRunning, setSensitivityRunning] = useState(false);

  // Load runs from store
  useEffect(() => {
    setRuns(experimentStore.getRuns());
    const unsubscribe = experimentStore.subscribe(() => {
      setRuns(experimentStore.getRuns());
    });
    return unsubscribe;
  }, []);

  // Get selected runs
  const selectedRuns = useMemo(() => {
    return runs.filter(r => selectedRunIds.has(r.id));
  }, [runs, selectedRunIds]);

  // Primary selected run (for single-run views)
  const primaryRun = selectedRuns[0] || null;

  // Comparison result (for two-run comparison)
  const comparisonResult = useMemo<ComparisonResult | null>(() => {
    if (selectedRuns.length === 2) {
      return compareRuns(selectedRuns[0], selectedRuns[1]);
    }
    return null;
  }, [selectedRuns]);

  // Centrality analysis
  const centrality = useMemo<CentralityAnalysis>(() => {
    return calculateCentrality(nodes, edges);
  }, [nodes, edges]);

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedRunIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRunIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRunIds.size === runs.length) {
      setSelectedRunIds(new Set());
    } else {
      setSelectedRunIds(new Set(runs.map(r => r.id)));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedRunIds.size === 0) return;
    if (!confirm(`Delete ${selectedRunIds.size} selected run(s)?`)) return;
    experimentStore.deleteRuns(Array.from(selectedRunIds));
    setSelectedRunIds(new Set());
  };

  const handleExportCSV = () => {
    const ids = selectedRunIds.size > 0 ? Array.from(selectedRunIds) : runs.map(r => r.id);
    const csv = experimentStore.exportRunsCSV(ids);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fcm_experiments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateRun = () => {
    if (!newRunName.trim()) return;
    experimentStore.createRun(nodes, edges, newRunName.trim());
    setNewRunName('');
    setShowNewRunDialog(false);
  };

  const handleRenameRun = (id: string, name: string) => {
    experimentStore.renameRun(id, name);
    setEditingRunId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build convergence chart data
  const convergenceData = useMemo(() => {
    if (!primaryRun || primaryRun.history.length === 0) return [];
    
    return primaryRun.history.map((iterState, i) => {
      const point: Record<string, number | string> = { iteration: i };
      iterState.forEach(concept => {
        point[concept.label] = parseFloat(concept.activation.toFixed(4));
      });
      return point;
    });
  }, [primaryRun]);

  // Build final state chart data
  const finalStateData = useMemo(() => {
    if (!primaryRun) return [];
    return primaryRun.finalState.map(concept => ({
      name: concept.label,
      initial: concept.initialActivation,
      final: concept.activation,
      change: concept.activation - concept.initialActivation,
    }));
  }, [primaryRun]);

  // Build comparison chart data
  const comparisonData = useMemo(() => {
    if (!comparisonResult) return [];
    return comparisonResult.deltas.map(d => ({
      name: d.label,
      [comparisonResult.runA.name]: d.valueA,
      [comparisonResult.runB.name]: d.valueB,
      delta: d.delta,
    }));
  }, [comparisonResult]);

  // Run sensitivity analysis - sweep one input from 0 to 1
  const runSensitivityAnalysis = async (inputConceptId: string) => {
    setSensitivityRunning(true);
    setSensitivityInputId(inputConceptId);
    setSensitivityData([]);
    
    const sweepValues = Array.from({ length: 21 }, (_, i) => i * 0.05); // 0, 0.05, 0.10, ..., 1.0
    const results: SensitivityData[] = [];
    
    // Run simulation for each sweep value
    for (const sweepValue of sweepValues) {
      // Create modified nodes with the input concept's activation changed
      const modifiedNodes = nodes.map(node => ({
        ...node,
        initialActivation: node.id === inputConceptId ? sweepValue : node.initialActivation,
      }));
      
      // Run simulation
      const { steps } = runSimulation(modifiedNodes, edges, 'sigmoid', 1, 50, 0.001);

      if (steps.length > 0) {
        const finalState = steps[steps.length - 1];
        const dataPoint: SensitivityData = { inputValue: sweepValue };
        
        // Get all concept final values
        nodes.forEach(node => {
          dataPoint[node.label] = finalState[node.id] ?? node.initialActivation;
        });
        
        results.push(dataPoint);
      }
    }
    
    setSensitivityData(results);
    setSensitivityRunning(false);
  };

  // Calculate sensitivity slopes (how much each output changes per unit input change)
  const sensitivitySlopes = useMemo(() => {
    if (sensitivityData.length < 2) return [];
    
    const inputNode = nodes.find(n => n.id === sensitivityInputId);
    if (!inputNode) return [];
    
    return nodes
      .filter(n => n.id !== sensitivityInputId)
      .map(node => {
        const firstValue = sensitivityData[0][node.label] || 0;
        const lastValue = sensitivityData[sensitivityData.length - 1][node.label] || 0;
        const slope = lastValue - firstValue;
        
        return {
          id: node.id,
          label: node.label,
          slope,
          absSlope: Math.abs(slope),
          direction: slope > 0.01 ? 'positive' : slope < -0.01 ? 'negative' : 'neutral',
        };
      })
      .sort((a, b) => b.absSlope - a.absSlope);
  }, [sensitivityData, sensitivityInputId, nodes]);

  const viewButtons: { id: AnalysisView; icon: React.ElementType; label: string }[] = [
    { id: 'convergence', icon: TrendingUp, label: 'Convergence' },
    { id: 'finalState', icon: BarChart3, label: 'Final State' },
    { id: 'comparison', icon: GitCompare, label: 'Compare' },
    { id: 'sensitivity', icon: Sliders, label: 'Sensitivity' },
    { id: 'centrality', icon: Activity, label: 'Centrality' },
  ];

  return (
    <div className="absolute inset-0 flex">
      {/* Sidebar - Run List */}
      <div className={cn(
        "w-72 border-r flex flex-col shrink-0",
        theme === 'modern' ? "bg-[#0a0a14] border-white/5" : "bg-white border-slate-200"
      )}>
        {/* Header */}
        <div className={cn(
          "p-4 border-b",
          theme === 'modern' ? "border-white/5" : "border-slate-100"
        )}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn(
              "text-sm font-black uppercase tracking-wider",
              theme === 'modern' ? "text-white/80" : "text-slate-700"
            )}>
              Simulation Runs
            </h3>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              theme === 'modern' ? "bg-white/10 text-white/50" : "bg-slate-100 text-slate-500"
            )}>
              {runs.length}
            </span>
          </div>
          
          <button
            onClick={() => setShowNewRunDialog(true)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
              theme === 'modern'
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            )}
          >
            <Plus className="w-4 h-4" />
            New Run
          </button>
        </div>

        {/* Run List */}
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {runs.length === 0 ? (
            <div className={cn(
              "text-center py-8 px-4",
              theme === 'modern' ? "text-white/30" : "text-slate-400"
            )}>
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No simulation runs yet</p>
              <p className="text-xs mt-1">Click "New Run" to create one</p>
            </div>
          ) : (
            runs.map(run => (
              <div
                key={run.id}
                className={cn(
                  "group p-3 rounded-lg border transition-all cursor-pointer",
                  selectedRunIds.has(run.id)
                    ? (theme === 'modern' 
                        ? "bg-emerald-500/10 border-emerald-500/30" 
                        : "bg-emerald-50 border-emerald-200")
                    : (theme === 'modern'
                        ? "bg-white/5 border-white/5 hover:bg-white/10"
                        : "bg-slate-50 border-slate-100 hover:bg-slate-100")
                )}
                onClick={() => handleToggleSelect(run.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="pt-0.5">
                    {selectedRunIds.has(run.id) ? (
                      <CheckSquare className={cn(
                        "w-4 h-4",
                        theme === 'modern' ? "text-emerald-400" : "text-emerald-600"
                      )} />
                    ) : (
                      <Square className={cn(
                        "w-4 h-4",
                        theme === 'modern' ? "text-white/20" : "text-slate-300"
                      )} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    {editingRunId === run.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameRun(run.id, editingName);
                            if (e.key === 'Escape') setEditingRunId(null);
                          }}
                          onClick={e => e.stopPropagation()}
                          className={cn(
                            "flex-1 px-1.5 py-0.5 text-sm rounded outline-none",
                            theme === 'modern'
                              ? "bg-white/10 text-white border border-emerald-500/50"
                              : "bg-white text-slate-900 border border-emerald-500"
                          )}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); handleRenameRun(run.id, editingName); }}
                          className="p-0.5 text-emerald-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "text-sm font-semibold truncate",
                          theme === 'modern' ? "text-white/90" : "text-slate-800"
                        )}>
                          {run.name}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingRunId(run.id);
                            setEditingName(run.name);
                          }}
                          className={cn(
                            "p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                            theme === 'modern' ? "hover:bg-white/10 text-white/40" : "hover:bg-slate-200 text-slate-400"
                          )}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    
                    <div className={cn(
                      "flex items-center gap-2 mt-1 text-[10px]",
                      theme === 'modern' ? "text-white/40" : "text-slate-400"
                    )}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(run.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        {run.converged ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        )}
                        {run.iterations} iter
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        {runs.length > 0 && (
          <div className={cn(
            "p-3 border-t flex items-center gap-2",
            theme === 'modern' ? "border-white/5" : "border-slate-100"
          )}>
            <button
              onClick={handleSelectAll}
              className={cn(
                "p-2 rounded-lg text-xs transition-all",
                theme === 'modern'
                  ? "text-white/40 hover:text-white hover:bg-white/10"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title="Select All"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={selectedRunIds.size === 0}
              className={cn(
                "p-2 rounded-lg text-xs transition-all",
                selectedRunIds.size === 0
                  ? "opacity-30 cursor-not-allowed"
                  : "",
                theme === 'modern'
                  ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  : "text-red-500 hover:text-red-600 hover:bg-red-50"
              )}
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCSV}
              className={cn(
                "p-2 rounded-lg text-xs transition-all",
                theme === 'modern'
                  ? "text-white/40 hover:text-white hover:bg-white/10"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Content - Analysis Views */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* View Tabs */}
        <div className={cn(
          "flex items-center gap-1 p-3 border-b",
          theme === 'modern' ? "border-white/5" : "border-slate-100"
        )}>
          {viewButtons.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                activeView === id
                  ? (theme === 'modern'
                      ? "bg-white/10 text-emerald-400"
                      : "bg-emerald-50 text-emerald-700")
                  : (theme === 'modern'
                      ? "text-white/40 hover:text-white/60 hover:bg-white/5"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-50")
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
          
          <div className="flex-1" />
          
          {selectedRuns.length > 0 && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              theme === 'modern' ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"
            )}>
              {selectedRuns.length} selected
            </span>
          )}
        </div>

        {/* Analysis Content */}
        <div className="flex-1 overflow-auto p-4">
          {selectedRuns.length === 0 ? (
            <div className={cn(
              "h-full flex flex-col items-center justify-center",
              theme === 'modern' ? "text-white/30" : "text-slate-400"
            )}>
              <BarChart3 className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a simulation run to analyze</p>
              <p className="text-sm mt-1">Or create a new run to get started</p>
            </div>
          ) : (
            <>
              {/* Convergence View */}
              {activeView === 'convergence' && primaryRun && (
                <div className="space-y-4">
                  <div className={cn(
                    "p-4 rounded-xl border",
                    theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                  )}>
                    <h4 className={cn(
                      "text-sm font-bold mb-4",
                      theme === 'modern' ? "text-white/80" : "text-slate-700"
                    )}>
                      Convergence: {primaryRun.name}
                    </h4>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={convergenceData}>
                          <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={theme === 'modern' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} 
                          />
                          <XAxis 
                            dataKey="iteration" 
                            stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'}
                            fontSize={10}
                            label={{ value: 'Iteration', position: 'bottom', offset: -5 }}
                          />
                          <YAxis 
                            domain={[0, 1]} 
                            stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'}
                            fontSize={10}
                            label={{ value: 'Activation', angle: -90, position: 'insideLeft' }}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: theme === 'modern' ? '#1a1a2e' : '#fff',
                              border: theme === 'modern' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                              borderRadius: '8px',
                              color: theme === 'modern' ? '#fff' : '#1e293b',
                            }}
                          />
                          <Legend />
                          {primaryRun.finalState.slice(0, 10).map((concept, i) => (
                            <Line
                              key={concept.id}
                              type="monotone"
                              dataKey={concept.label}
                              stroke={COLORS[i % COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {primaryRun.finalState.length > 10 && (
                      <p className={cn(
                        "text-xs mt-2 text-center",
                        theme === 'modern' ? "text-white/30" : "text-slate-400"
                      )}>
                        Showing first 10 concepts. Total: {primaryRun.finalState.length}
                      </p>
                    )}
                  </div>
                  
                  {/* Run Info */}
                  <div className={cn(
                    "p-4 rounded-xl border",
                    theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                  )}>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                          Status
                        </p>
                        <p className={cn("text-lg font-bold mt-1", primaryRun.converged ? "text-emerald-500" : "text-amber-500")}>
                          {primaryRun.converged ? 'Converged' : 'Not Converged'}
                        </p>
                      </div>
                      <div>
                        <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                          Iterations
                        </p>
                        <p className={cn("text-lg font-bold mt-1", theme === 'modern' ? "text-white" : "text-slate-800")}>
                          {primaryRun.iterations}
                        </p>
                      </div>
                      <div>
                        <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                          Concepts
                        </p>
                        <p className={cn("text-lg font-bold mt-1", theme === 'modern' ? "text-white" : "text-slate-800")}>
                          {primaryRun.finalState.length}
                        </p>
                      </div>
                      <div>
                        <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                          Activation Fn
                        </p>
                        <p className={cn("text-lg font-bold mt-1 capitalize", theme === 'modern' ? "text-white" : "text-slate-800")}>
                          {primaryRun.config.activationFunction}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Final State View */}
              {activeView === 'finalState' && primaryRun && (
                <div className={cn(
                  "p-4 rounded-xl border",
                  theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                )}>
                  <h4 className={cn(
                    "text-sm font-bold mb-4",
                    theme === 'modern' ? "text-white/80" : "text-slate-700"
                  )}>
                    Final State: {primaryRun.name}
                  </h4>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={finalStateData} layout="vertical">
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke={theme === 'modern' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} 
                        />
                        <XAxis 
                          type="number" 
                          domain={[0, 1]}
                          stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'}
                          fontSize={10}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={120}
                          stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'}
                          fontSize={10}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: theme === 'modern' ? '#1a1a2e' : '#fff',
                            border: theme === 'modern' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: theme === 'modern' ? '#fff' : '#1e293b',
                          }}
                          formatter={(value: number) => value.toFixed(3)}
                        />
                        <Legend />
                        <Bar dataKey="initial" name="Initial" fill="#64748b" opacity={0.5} />
                        <Bar dataKey="final" name="Final">
                          {finalStateData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.change >= 0 ? '#10b981' : '#ef4444'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Comparison View */}
              {activeView === 'comparison' && (
                <div className="space-y-4">
                  {selectedRuns.length < 2 ? (
                    <div className={cn(
                      "p-8 rounded-xl border text-center",
                      theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                    )}>
                      <GitCompare className={cn(
                        "w-12 h-12 mx-auto mb-3",
                        theme === 'modern' ? "text-white/20" : "text-slate-300"
                      )} />
                      <p className={cn("font-medium", theme === 'modern' ? "text-white/60" : "text-slate-600")}>
                        Select exactly 2 runs to compare
                      </p>
                      <p className={cn("text-sm mt-1", theme === 'modern' ? "text-white/30" : "text-slate-400")}>
                        Currently selected: {selectedRuns.length}
                      </p>
                    </div>
                  ) : comparisonResult && (
                    <>
                      <div className={cn(
                        "p-4 rounded-xl border",
                        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                      )}>
                        <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                          {comparisonResult.runA.name} vs {comparisonResult.runB.name}
                        </h4>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={comparisonData} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'modern' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} />
                              <XAxis type="number" domain={[0, 1]} stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'} fontSize={10} />
                              <YAxis type="category" dataKey="name" width={120} stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'} fontSize={10} />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: theme === 'modern' ? '#1a1a2e' : '#fff',
                                  border: theme === 'modern' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  color: theme === 'modern' ? '#fff' : '#1e293b',
                                }}
                                formatter={(value: number) => value.toFixed(3)}
                              />
                              <Legend />
                              <Bar dataKey={comparisonResult.runA.name} fill="#3b82f6" />
                              <Bar dataKey={comparisonResult.runB.name} fill="#10b981" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {/* Delta Summary */}
                      <div className={cn(
                        "p-4 rounded-xl border",
                        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                      )}>
                        <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                          Change Summary
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                          {comparisonResult.summary.mostIncreased && (
                            <div className={cn("p-3 rounded-lg", theme === 'modern' ? "bg-emerald-500/10" : "bg-emerald-50")}>
                              <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-emerald-400/60" : "text-emerald-600")}>
                                Most Increased
                              </p>
                              <p className={cn("font-bold mt-1", theme === 'modern' ? "text-emerald-400" : "text-emerald-700")}>
                                {comparisonResult.summary.mostIncreased.label}
                              </p>
                              <p className="text-emerald-500 text-sm">
                                +{(comparisonResult.summary.mostIncreased.delta * 100).toFixed(1)}%
                              </p>
                            </div>
                          )}
                          {comparisonResult.summary.mostDecreased && (
                            <div className={cn("p-3 rounded-lg", theme === 'modern' ? "bg-red-500/10" : "bg-red-50")}>
                              <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-red-400/60" : "text-red-600")}>
                                Most Decreased
                              </p>
                              <p className={cn("font-bold mt-1", theme === 'modern' ? "text-red-400" : "text-red-700")}>
                                {comparisonResult.summary.mostDecreased.label}
                              </p>
                              <p className="text-red-500 text-sm">
                                {(comparisonResult.summary.mostDecreased.delta * 100).toFixed(1)}%
                              </p>
                            </div>
                          )}
                          <div className={cn("p-3 rounded-lg", theme === 'modern' ? "bg-white/5" : "bg-slate-50")}>
                            <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                              Avg. Change
                            </p>
                            <p className={cn("font-bold mt-1 text-lg", theme === 'modern' ? "text-white" : "text-slate-800")}>
                              {(comparisonResult.summary.averageAbsDelta * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Sensitivity Analysis View */}
              {activeView === 'sensitivity' && (
                <div className="space-y-4">
                  {/* Input Selector */}
                  <div className={cn(
                    "p-4 rounded-xl border",
                    theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                  )}>
                    <h4 className={cn("text-sm font-bold mb-3", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                      Sensitivity Analysis
                    </h4>
                    <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/40" : "text-slate-500")}>
                      Select a concept to sweep from 0 to 1 and see how it affects all other concepts.
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      {nodes.map(node => (
                        <button
                          key={node.id}
                          onClick={() => runSensitivityAnalysis(node.id)}
                          disabled={sensitivityRunning}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            sensitivityInputId === node.id
                              ? (theme === 'modern' 
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                                  : "bg-emerald-100 text-emerald-700 border border-emerald-300")
                              : (theme === 'modern'
                                  ? "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"),
                            sensitivityRunning && "opacity-50 cursor-wait"
                          )}
                        >
                          {sensitivityRunning && sensitivityInputId === node.id ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Running...
                            </span>
                          ) : (
                            node.label
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sensitivity Chart */}
                  {sensitivityData.length > 0 && sensitivityInputId && (
                    <>
                      <div className={cn(
                        "p-4 rounded-xl border",
                        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                      )}>
                        <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                          Response Curves: Varying "{nodes.find(n => n.id === sensitivityInputId)?.label}"
                        </h4>
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sensitivityData}>
                              <CartesianGrid 
                                strokeDasharray="3 3" 
                                stroke={theme === 'modern' ? 'rgba(255,255,255,0.1)' : '#e2e8f0'} 
                              />
                              <XAxis 
                                dataKey="inputValue" 
                                stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'}
                                fontSize={10}
                                tickFormatter={(v) => v.toFixed(1)}
                                label={{ 
                                  value: `${nodes.find(n => n.id === sensitivityInputId)?.label} (Input)`, 
                                  position: 'bottom', 
                                  offset: -5,
                                  style: { fill: theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b', fontSize: 10 }
                                }}
                              />
                              <YAxis 
                                domain={[0, 1]} 
                                stroke={theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b'}
                                fontSize={10}
                                label={{ 
                                  value: 'Activation', 
                                  angle: -90, 
                                  position: 'insideLeft',
                                  style: { fill: theme === 'modern' ? 'rgba(255,255,255,0.4)' : '#64748b', fontSize: 10 }
                                }}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: theme === 'modern' ? '#1a1a2e' : '#fff',
                                  border: theme === 'modern' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  color: theme === 'modern' ? '#fff' : '#1e293b',
                                  fontSize: 11,
                                }}
                                formatter={(value: number) => value.toFixed(3)}
                                labelFormatter={(v) => `Input: ${Number(v).toFixed(2)}`}
                              />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              {nodes
                                .filter(n => n.id !== sensitivityInputId)
                                .slice(0, 8)
                                .map((node, i) => (
                                  <Line
                                    key={node.id}
                                    type="monotone"
                                    dataKey={node.label}
                                    stroke={COLORS[i % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                  />
                                ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {nodes.filter(n => n.id !== sensitivityInputId).length > 8 && (
                          <p className={cn(
                            "text-xs mt-2 text-center",
                            theme === 'modern' ? "text-white/30" : "text-slate-400"
                          )}>
                            Showing first 8 concepts. Total: {nodes.filter(n => n.id !== sensitivityInputId).length}
                          </p>
                        )}
                      </div>

                      {/* Sensitivity Rankings */}
                      <div className={cn(
                        "p-4 rounded-xl border",
                        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                      )}>
                        <h4 className={cn("text-sm font-bold mb-3", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                          Sensitivity Rankings
                        </h4>
                        <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/40" : "text-slate-500")}>
                          Concepts sorted by how much they change when "{nodes.find(n => n.id === sensitivityInputId)?.label}" varies from 0 to 1.
                        </p>
                        
                        <div className="grid gap-2">
                          {sensitivitySlopes.slice(0, 10).map((item, i) => (
                            <div 
                              key={item.id}
                              className={cn(
                                "flex items-center gap-3 p-2 rounded-lg",
                                theme === 'modern' ? "bg-white/5" : "bg-slate-50"
                              )}
                            >
                              <span className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                                i < 3 
                                  ? (theme === 'modern' ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700")
                                  : (theme === 'modern' ? "bg-white/10 text-white/50" : "bg-slate-200 text-slate-500")
                              )}>
                                {i + 1}
                              </span>
                              <span className={cn(
                                "flex-1 text-sm font-medium",
                                theme === 'modern' ? "text-white/80" : "text-slate-700"
                              )}>
                                {item.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <div 
                                  className={cn(
                                    "w-24 h-2 rounded-full overflow-hidden",
                                    theme === 'modern' ? "bg-white/10" : "bg-slate-200"
                                  )}
                                >
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      item.direction === 'positive' ? "bg-emerald-500" : 
                                      item.direction === 'negative' ? "bg-red-500" : "bg-slate-400"
                                    )}
                                    style={{ width: `${Math.min(item.absSlope * 100, 100)}%` }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-xs font-mono w-16 text-right",
                                  item.direction === 'positive' ? "text-emerald-500" :
                                  item.direction === 'negative' ? "text-red-500" :
                                  (theme === 'modern' ? "text-white/40" : "text-slate-400")
                                )}>
                                  {item.slope > 0 ? '+' : ''}{(item.slope * 100).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div className={cn(
                          "mt-4 p-3 rounded-lg text-xs",
                          theme === 'modern' ? "bg-white/5 text-white/50" : "bg-slate-50 text-slate-500"
                        )}>
                          <p><strong className="text-emerald-500">Steep positive slope:</strong> Concept increases as input increases</p>
                          <p><strong className="text-red-500">Steep negative slope:</strong> Concept decreases as input increases</p>
                          <p><strong>Flat (near 0):</strong> Concept is not sensitive to this input</p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {!sensitivityInputId && (
                    <div className={cn(
                      "p-8 rounded-xl border text-center",
                      theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                    )}>
                      <Sliders className={cn(
                        "w-12 h-12 mx-auto mb-3",
                        theme === 'modern' ? "text-white/20" : "text-slate-300"
                      )} />
                      <p className={cn("font-medium", theme === 'modern' ? "text-white/60" : "text-slate-600")}>
                        Select a concept above to analyze
                      </p>
                      <p className={cn("text-sm mt-1", theme === 'modern' ? "text-white/30" : "text-slate-400")}>
                        The analysis will show how all other concepts respond when you vary the selected input.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Centrality View */}
              {activeView === 'centrality' && (
                <div className={cn(
                  "p-4 rounded-xl border",
                  theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                )}>
                  <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                    Concept Centrality Analysis
                  </h4>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={cn(
                          "text-left text-xs uppercase tracking-wider",
                          theme === 'modern' ? "text-white/40" : "text-slate-400"
                        )}>
                          <th className="pb-3">Concept</th>
                          <th className="pb-3 text-right">Out-Degree</th>
                          <th className="pb-3 text-right">In-Degree</th>
                          <th className="pb-3 text-right">Total</th>
                          <th className="pb-3 text-center">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {centrality.concepts.map((c) => (
                          <tr 
                            key={c.id}
                            className={cn(
                              "border-t",
                              theme === 'modern' ? "border-white/5" : "border-slate-100"
                            )}
                          >
                            <td className={cn("py-2", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
                              {c.label}
                            </td>
                            <td className={cn("py-2 text-right font-mono", theme === 'modern' ? "text-blue-400" : "text-blue-600")}>
                              {c.outDegree.toFixed(2)}
                            </td>
                            <td className={cn("py-2 text-right font-mono", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>
                              {c.inDegree.toFixed(2)}
                            </td>
                            <td className={cn("py-2 text-right font-mono font-bold", theme === 'modern' ? "text-white" : "text-slate-800")}>
                              {c.totalCentrality.toFixed(2)}
                            </td>
                            <td className="py-2 text-center">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                c.role === 'transmitter' && (theme === 'modern' ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"),
                                c.role === 'receiver' && (theme === 'modern' ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700"),
                                c.role === 'ordinary' && (theme === 'modern' ? "bg-white/10 text-white/60" : "bg-slate-100 text-slate-600"),
                                c.role === 'isolated' && (theme === 'modern' ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"),
                              )}>
                                {c.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={cn(
                    "mt-4 p-3 rounded-lg text-xs",
                    theme === 'modern' ? "bg-white/5 text-white/50" : "bg-slate-50 text-slate-500"
                  )}>
                    <p><strong>Transmitter:</strong> High out-degree, influences many concepts</p>
                    <p><strong>Receiver:</strong> High in-degree, influenced by many concepts</p>
                    <p><strong>Ordinary:</strong> Balanced in/out connections</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Run Dialog */}
      <AnimatePresence>
        {showNewRunDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowNewRunDialog(false)}
          >
            <div className={cn(
              "absolute inset-0",
              theme === 'modern' ? "bg-black/80" : "bg-black/50"
            )} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className={cn(
                "relative w-full max-w-md p-6 rounded-2xl border shadow-xl",
                theme === 'modern' ? "bg-[#0f0f1a] border-white/10" : "bg-white border-slate-200"
              )}
            >
              <h3 className={cn(
                "text-lg font-black mb-4",
                theme === 'modern' ? "text-white" : "text-slate-900"
              )}>
                New Simulation Run
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={cn(
                    "block text-xs font-bold uppercase tracking-wider mb-2",
                    theme === 'modern' ? "text-white/40" : "text-slate-400"
                  )}>
                    Run Name
                  </label>
                  <input
                    autoFocus
                    value={newRunName}
                    onChange={e => setNewRunName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateRun()}
                    placeholder="e.g., Baseline, High Stress Scenario..."
                    className={cn(
                      "w-full px-4 py-2 rounded-lg outline-none transition-all",
                      theme === 'modern'
                        ? "bg-white/10 text-white border border-white/10 focus:border-emerald-500/50 placeholder:text-white/20"
                        : "bg-slate-50 text-slate-900 border border-slate-200 focus:border-emerald-500 placeholder:text-slate-300"
                    )}
                  />
                </div>
                
                <div className={cn(
                  "p-3 rounded-lg text-sm",
                  theme === 'modern' ? "bg-white/5 text-white/50" : "bg-slate-50 text-slate-500"
                )}>
                  <p>This will run a simulation with the current network configuration:</p>
                  <p className="mt-1 font-medium">{nodes.length} concepts, {edges.length} connections</p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowNewRunDialog(false)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    theme === 'modern'
                      ? "text-white/60 hover:text-white hover:bg-white/10"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRun}
                  disabled={!newRunName.trim()}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    newRunName.trim()
                      ? (theme === 'modern'
                          ? "bg-emerald-500 text-white hover:bg-emerald-400"
                          : "bg-emerald-600 text-white hover:bg-emerald-700")
                      : "opacity-50 cursor-not-allowed bg-slate-500 text-white"
                  )}
                >
                  <Play className="w-4 h-4" />
                  Run Simulation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExperimentsTab;
