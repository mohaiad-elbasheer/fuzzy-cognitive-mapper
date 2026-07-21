import React, { useState } from 'react';
import { FlaskConical, Trash2, Play, Camera, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FCMNode, FCMEdge } from '../../types';
import { SimulationConfig } from '../../lib/experiments';
import { Scenario } from '../../lib/storage';
import { runSimulation } from '../../logic/fcmEngine';
import { ExperimentTheme } from './shared';

interface ScenariosViewProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  config: SimulationConfig;
  scenarios: Scenario[];
  onCaptureScenario: (name: string) => void;
  onDeleteScenario: (id: string) => void;
  onApplyScenario: (scenario: Scenario) => void;
  theme: ExperimentTheme;
}

interface BatchResult {
  /** concept id -> scenario id -> final activation ('baseline' = current map) */
  finals: Map<string, Map<string, number>>;
  scenarioIds: string[];
}

/**
 * Named what-if scenarios: each captures a set of initial activations and
 * clamps. Run them all as a batch to compare outcomes side by side.
 */
const ScenariosView: React.FC<ScenariosViewProps> = ({
  nodes,
  edges,
  config,
  scenarios,
  onCaptureScenario,
  onDeleteScenario,
  onApplyScenario,
  theme,
}) => {
  const [newName, setNewName] = useState('');
  const [batch, setBatch] = useState<BatchResult | null>(null);

  const runOne = (activations: Record<string, number>, clampedIds: string[]) => {
    const scenarioNodes: FCMNode[] = nodes.map(n => ({
      ...n,
      initialActivation: activations[n.id] ?? n.initialActivation,
      clamped: clampedIds.includes(n.id),
    }));
    const outcome = runSimulation(
      scenarioNodes,
      edges,
      config.activationFunction,
      config.lambda,
      config.maxIterations,
      config.convergenceThreshold,
      { clampedNodeIds: clampedIds, inferenceRule: config.inferenceRule }
    );
    return outcome.steps[outcome.steps.length - 1];
  };

  const runBatch = () => {
    const finals = new Map<string, Map<string, number>>(nodes.map(n => [n.id, new Map()]));

    // Baseline: the map as it stands now
    const baseline = runOne(
      Object.fromEntries(nodes.map(n => [n.id, n.initialActivation])),
      nodes.filter(n => n.clamped).map(n => n.id)
    );
    for (const n of nodes) finals.get(n.id)!.set('baseline', baseline[n.id]);

    for (const scenario of scenarios) {
      const final = runOne(scenario.activations, scenario.clampedIds);
      for (const n of nodes) finals.get(n.id)!.set(scenario.id, final[n.id]);
    }

    setBatch({ finals, scenarioIds: scenarios.map(s => s.id) });
  };

  const capture = () => {
    if (!newName.trim()) return;
    onCaptureScenario(newName.trim());
    setNewName('');
    setBatch(null);
  };

  return (
    <div className="space-y-4">
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <h4 className={cn("text-sm font-bold mb-1", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
          Scenarios
        </h4>
        <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/40" : "text-slate-500")}>
          A scenario snapshots the map's initial activations and clamps. Set up a
          what-if on the Map workspace, capture it here, then run all scenarios
          as a batch to compare outcomes.
        </p>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && capture()}
            placeholder="Scenario name, e.g. Strict Regulation…"
            aria-label="New scenario name"
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm outline-none border",
              theme === 'modern'
                ? "bg-white/5 border-white/10 text-white focus:border-emerald-500 placeholder:text-white/30"
                : "bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-600 placeholder:text-slate-400"
            )}
          />
          <button
            onClick={capture}
            disabled={!newName.trim() || nodes.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
              theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <Camera className="w-4 h-4" />
            Capture current state
          </button>
        </div>

        {scenarios.length > 0 && (
          <div className="mt-4 space-y-2">
            {scenarios.map(s => (
              <div key={s.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border",
                theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
              )}>
                <FlaskConical className={cn("w-4 h-4 shrink-0", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", theme === 'modern' ? "text-white/90" : "text-slate-800")}>{s.name}</p>
                  <p className={cn("text-xs", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                    {s.clampedIds.length > 0 ? `${s.clampedIds.length} clamped` : 'no clamps'}
                  </p>
                </div>
                <button
                  onClick={() => onApplyScenario(s)}
                  title="Load this scenario onto the map"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    theme === 'modern' ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Apply to map
                </button>
                <button
                  onClick={() => { onDeleteScenario(s.id); setBatch(null); }}
                  aria-label={`Delete scenario ${s.name}`}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    theme === 'modern' ? "text-white/40 hover:text-red-400 hover:bg-red-500/10" : "text-slate-400 hover:text-red-600 hover:bg-red-50"
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <button
              onClick={runBatch}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors",
                theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <Play className="w-4 h-4" />
              Run all scenarios ({scenarios.length + 1} incl. baseline)
            </button>
          </div>
        )}
      </div>

      {batch && (
        <div className={cn(
          "p-4 rounded-xl border overflow-x-auto",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        )}>
          <h4 className={cn("text-sm font-bold mb-3", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
            Final activations by scenario
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className={cn("text-left text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
                <th className="pb-2 pr-4">Concept</th>
                <th className="pb-2 text-right pr-4">Baseline</th>
                {scenarios.map(s => (
                  <th key={s.id} className="pb-2 text-right pr-4 normal-case">{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map(n => {
                const row = batch.finals.get(n.id)!;
                const baseline = row.get('baseline') ?? 0;
                return (
                  <tr key={n.id} className={cn("border-t", theme === 'modern' ? "border-white/5" : "border-slate-100")}>
                    <td className={cn("py-1.5 pr-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>{n.label}</td>
                    <td className={cn("py-1.5 text-right pr-4 font-mono", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
                      {baseline.toFixed(3)}
                    </td>
                    {scenarios.map(s => {
                      const v = row.get(s.id) ?? 0;
                      const delta = v - baseline;
                      return (
                        <td key={s.id} className="py-1.5 text-right pr-4 font-mono">
                          <span className={theme === 'modern' ? "text-white" : "text-slate-900"}>{v.toFixed(3)}</span>
                          {Math.abs(delta) >= 0.005 && (
                            <span className={cn("ml-1.5 text-xs", delta > 0 ? "text-emerald-500" : "text-red-500")}>
                              {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={cn("text-xs mt-3", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
            Deltas are relative to the baseline (the map as currently configured). Runs use your
            current simulation settings ({config.activationFunction}, λ {config.lambda}).
          </p>
        </div>
      )}
    </div>
  );
};

export default ScenariosView;
