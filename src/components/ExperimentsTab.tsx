import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  BarChart3,
  GitCompare,
  Activity,
  Sliders,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SimulationRun, SimulationConfig, compareRuns, ComparisonResult } from '../lib/experiments';
import { experimentStore } from '../lib/experiments/experimentStore';
import { FCMNode, FCMEdge } from '../types';
import RunsSidebar from './experiments/RunsSidebar';
import NewRunDialog from './experiments/NewRunDialog';
import ConvergenceView from './experiments/ConvergenceView';
import FinalStateView from './experiments/FinalStateView';
import ComparisonView from './experiments/ComparisonView';
import SensitivityView from './experiments/SensitivityView';
import CentralityView from './experiments/CentralityView';
import { ExperimentTheme } from './experiments/shared';

interface ExperimentsTabProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  /** Current simulation settings from the inspector; every new run uses these. */
  config: SimulationConfig;
  theme?: ExperimentTheme;
}

type AnalysisView = 'convergence' | 'finalState' | 'comparison' | 'sensitivity' | 'centrality';

const ExperimentsTab: React.FC<ExperimentsTabProps> = ({
  nodes,
  edges,
  config,
  theme = 'modern',
}) => {
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<AnalysisView>('convergence');
  const [showNewRunDialog, setShowNewRunDialog] = useState(false);

  // Load runs from store
  useEffect(() => {
    setRuns(experimentStore.getRuns());
    const unsubscribe = experimentStore.subscribe(() => {
      setRuns(experimentStore.getRuns());
    });
    return unsubscribe;
  }, []);

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

  const clampedIds = useMemo(() => nodes.filter(n => n.clamped).map(n => n.id), [nodes]);

  const handleCreateRun = (name: string) => {
    // Run with the settings currently configured in the inspector, honoring
    // clamped concepts, so experiment results match the canvas simulation.
    experimentStore.createRun(nodes, edges, name, undefined, config, clampedIds);
    setShowNewRunDialog(false);
  };

  const handleRenameRun = (id: string, name: string) => {
    experimentStore.renameRun(id, name);
  };

  const viewButtons: { id: AnalysisView; icon: React.ElementType; label: string }[] = [
    { id: 'convergence', icon: TrendingUp, label: 'Convergence' },
    { id: 'finalState', icon: BarChart3, label: 'Final State' },
    { id: 'comparison', icon: GitCompare, label: 'Compare' },
    { id: 'sensitivity', icon: Sliders, label: 'Sensitivity' },
    { id: 'centrality', icon: Activity, label: 'Centrality' },
  ];

  return (
    <div className="absolute inset-0 flex">
      <RunsSidebar
        runs={runs}
        selectedRunIds={selectedRunIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onDeleteSelected={handleDeleteSelected}
        onExportCSV={handleExportCSV}
        onNewRun={() => setShowNewRunDialog(true)}
        onRenameRun={handleRenameRun}
        theme={theme}
      />

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
              {activeView === 'convergence' && primaryRun && (
                <ConvergenceView run={primaryRun} theme={theme} />
              )}
              {activeView === 'finalState' && primaryRun && (
                <FinalStateView run={primaryRun} theme={theme} />
              )}
              {activeView === 'comparison' && (
                <ComparisonView
                  selectedCount={selectedRuns.length}
                  result={comparisonResult}
                  theme={theme}
                />
              )}
              {activeView === 'sensitivity' && (
                <SensitivityView nodes={nodes} edges={edges} config={config} theme={theme} />
              )}
              {activeView === 'centrality' && (
                <CentralityView nodes={nodes} edges={edges} theme={theme} />
              )}
            </>
          )}
        </div>
      </div>

      <NewRunDialog
        open={showNewRunDialog}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        clampedCount={clampedIds.length}
        config={config}
        onClose={() => setShowNewRunDialog(false)}
        onCreate={handleCreateRun}
        theme={theme}
      />
    </div>
  );
};

export default ExperimentsTab;
