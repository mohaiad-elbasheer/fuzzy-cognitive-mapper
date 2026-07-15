import React, { useState } from 'react';
import {
  Settings2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Lock,
  Unlock,
  Play,
  Sliders,
  Circle,
} from 'lucide-react';
import {
  FCMNode,
  FCMEdge,
  ActivationFunction,
  LinguisticScalePreset,
  MembershipFunctionType,
  LinguisticTerm,
} from '../types';
import { cn } from '../lib/utils';
import AdvancedParameters from './AdvancedParameters';

interface InspectorProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onUpdateNode: (nodeId: string, updates: Partial<FCMNode>) => void;
  onDeleteNode: (nodeId: string) => void;
  onAddEdge: (sourceId: string, targetId: string, weight: number) => void;
  onDeleteEdge: (edgeId: string) => void;
  onUpdateEdgeWeight: (edgeId: string, weight: number) => void;
  onFlipEdge: (edgeId: string) => void;
  onClearSelection: () => void;
  activationFn: ActivationFunction;
  setActivationFn: (fn: ActivationFunction) => void;
  lambda: number;
  setLambda: (val: number) => void;
  maxIterations: number;
  setMaxIterations: (val: number) => void;
  convergenceThreshold: number;
  setConvergenceThreshold: (val: number) => void;
  linguisticScale: LinguisticScalePreset;
  setLinguisticScale: (scale: LinguisticScalePreset) => void;
  membershipFunction: MembershipFunctionType;
  setMembershipFunction: (fn: MembershipFunctionType) => void;
  linguisticTerms: LinguisticTerm[];
  onRunSimulation: () => void;
  isSimulating: boolean;
  theme?: 'modern' | 'academic';
}

const SectionLabel: React.FC<{ children: React.ReactNode; theme: 'modern' | 'academic' }> = ({ children, theme }) => (
  <label className={cn(
    "text-xs font-semibold uppercase tracking-wider block",
    theme === 'modern' ? "text-white/50" : "text-slate-500"
  )}>
    {children}
  </label>
);

/**
 * Contextual right panel. Shows the editor for whatever is selected on the
 * canvas (a relationship, a concept) and falls back to the simulation
 * settings when nothing is selected.
 */
const Inspector: React.FC<InspectorProps> = ({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  onUpdateNode,
  onDeleteNode,
  onAddEdge,
  onDeleteEdge,
  onUpdateEdgeWeight,
  onFlipEdge,
  onClearSelection,
  activationFn,
  setActivationFn,
  lambda,
  setLambda,
  maxIterations,
  setMaxIterations,
  convergenceThreshold,
  setConvergenceThreshold,
  linguisticScale,
  setLinguisticScale,
  membershipFunction,
  setMembershipFunction,
  linguisticTerms,
  onRunSimulation,
  isSimulating,
  theme = 'modern',
}) => {
  const [newEdgeTarget, setNewEdgeTarget] = useState('');

  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) ?? null : null;
  const selectedNode = !selectedEdge && selectedNodeId ? nodes.find(n => n.id === selectedNodeId) ?? null : null;

  const inputClass = cn(
    "w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-colors",
    theme === 'modern'
      ? "bg-white/5 border-white/10 focus:border-emerald-500 text-white"
      : "bg-white border-slate-200 focus:border-emerald-600 text-slate-800"
  );

  const backButton = (
    <button
      onClick={onClearSelection}
      className={cn(
        "flex items-center gap-2 text-sm font-medium mb-4 px-2 py-1.5 -ml-2 rounded-lg transition-colors",
        theme === 'modern' ? "text-white/50 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
      )}
    >
      <ArrowLeft className="w-4 h-4" />
      Simulation settings
    </button>
  );

  // ------------------------------------------------------------------
  // Relationship editor
  // ------------------------------------------------------------------
  const renderEdgeEditor = (edge: FCMEdge) => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    const weight = edge.weight;

    return (
      <div className="p-5 space-y-6">
        {backButton}
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sliders className={cn("w-4 h-4", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          <span className={theme === 'modern' ? "text-white" : "text-slate-900"}>Relationship</span>
        </div>

        <div className={cn(
          "flex items-center gap-2 text-sm p-3 rounded-xl border",
          theme === 'modern' ? "bg-white/5 border-white/10 text-white/80" : "bg-slate-50 border-slate-200 text-slate-700"
        )}>
          <span className="font-medium truncate max-w-[110px]">{source?.label ?? edge.source}</span>
          <ArrowRight className={cn("w-4 h-4 shrink-0", theme === 'modern' ? "text-white/40" : "text-slate-400")} />
          <span className="font-medium truncate max-w-[110px]">{target?.label ?? edge.target}</span>
        </div>

        <div className="space-y-2">
          <SectionLabel theme={theme}>Linguistic term</SectionLabel>
          <select
            value={weight}
            onChange={(e) => onUpdateEdgeWeight(edge.id, parseFloat(e.target.value))}
            className={inputClass}
          >
            {linguisticTerms.map((term) => (
              <option key={term.value} value={term.value} className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>
                {term.label} ({term.value > 0 ? '+' : ''}{term.value})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <SectionLabel theme={theme}>Weight</SectionLabel>
            <span className={cn(
              "text-lg font-bold font-mono",
              weight > 0 ? "text-emerald-500" : weight < 0 ? "text-red-500" : (theme === 'modern' ? "text-white/30" : "text-slate-300")
            )}>
              {weight > 0 ? '+' : ''}{weight.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={weight}
            aria-label="Relationship weight"
            onChange={(e) => onUpdateEdgeWeight(edge.id, parseFloat(e.target.value))}
            className={cn(
              "w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500",
              theme === 'modern' ? "bg-white/10" : "bg-slate-200"
            )}
          />
          <div className={cn(
            "flex justify-between text-xs",
            theme === 'modern' ? "text-white/40" : "text-slate-400"
          )}>
            <span>−1 inhibits</span>
            <span>0</span>
            <span>+1 promotes</span>
          </div>
        </div>

        <p className={cn(
          "text-sm leading-relaxed p-3 rounded-xl border",
          theme === 'modern' ? "bg-white/5 border-white/10 text-white/60" : "bg-slate-50 border-slate-100 text-slate-500"
        )}>
          {weight > 0
            ? 'Increasing the source concept increases the target.'
            : weight < 0
              ? 'Increasing the source concept decreases the target.'
              : 'No causal effect while the weight is zero.'}
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onFlipEdge(edge.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors",
              theme === 'modern' ? "border-white/10 text-white/70 hover:bg-white/10" : "border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Flip direction
          </button>
          <button
            onClick={() => { onDeleteEdge(edge.id); onClearSelection(); }}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors",
              theme === 'modern' ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"
            )}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Concept editor
  // ------------------------------------------------------------------
  const renderNodeEditor = (node: FCMNode) => {
    const outgoing = edges.filter(e => e.source === node.id);
    const availableTargets = nodes.filter(n => n.id !== node.id && !outgoing.some(e => e.target === n.id));

    return (
      <div className="p-5 space-y-6">
        {backButton}
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Circle className={cn("w-4 h-4", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          <span className={theme === 'modern' ? "text-white" : "text-slate-900"}>Concept</span>
        </div>

        <div className="space-y-2">
          <SectionLabel theme={theme}>Name</SectionLabel>
          <input
            type="text"
            value={node.label}
            onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <SectionLabel theme={theme}>Initial activation</SectionLabel>
            <span className={cn("text-lg font-bold font-mono", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>
              {node.initialActivation.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={node.initialActivation}
            aria-label="Initial activation"
            onChange={(e) => onUpdateNode(node.id, { initialActivation: parseFloat(e.target.value) })}
            className={cn(
              "w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500",
              theme === 'modern' ? "bg-white/10" : "bg-slate-200"
            )}
          />
        </div>

        <button
          onClick={() => onUpdateNode(node.id, { clamped: !node.clamped })}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-colors text-left",
            node.clamped
              ? (theme === 'modern' ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-amber-50 border-amber-300 text-amber-800")
              : (theme === 'modern' ? "border-white/10 text-white/60 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50")
          )}
        >
          {node.clamped ? <Lock className="w-4 h-4 shrink-0" /> : <Unlock className="w-4 h-4 shrink-0" />}
          <span>
            <span className="font-medium block">{node.clamped ? 'Clamped (scenario input)' : 'Free to evolve'}</span>
            <span className={cn("text-xs", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
              {node.clamped
                ? 'Held at its initial value during simulation'
                : 'Click to hold this concept fixed during simulation'}
            </span>
          </span>
        </button>

        <div className="space-y-3">
          <SectionLabel theme={theme}>Outgoing connections ({outgoing.length})</SectionLabel>
          {outgoing.length === 0 ? (
            <p className={cn("text-sm", theme === 'modern' ? "text-white/30" : "text-slate-400")}>
              No connections yet.
            </p>
          ) : (
            <div className="space-y-2">
              {outgoing.map(edge => {
                const target = nodes.find(n => n.id === edge.target);
                return (
                  <div key={edge.id} className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border",
                    theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                  )}>
                    <div className="flex items-center gap-2 min-w-0">
                      <ArrowRight className={cn("w-3.5 h-3.5 shrink-0", theme === 'modern' ? "text-white/30" : "text-slate-400")} />
                      <span className={cn("text-sm truncate", theme === 'modern' ? "text-white/70" : "text-slate-600")}>
                        {target?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-sm font-mono font-semibold",
                        edge.weight > 0 ? "text-emerald-500" : edge.weight < 0 ? "text-red-500" : (theme === 'modern' ? "text-white/30" : "text-slate-400")
                      )}>
                        {edge.weight > 0 ? '+' : ''}{edge.weight.toFixed(1)}
                      </span>
                      <button
                        onClick={() => onDeleteEdge(edge.id)}
                        aria-label={`Delete connection to ${target?.label ?? edge.target}`}
                        className={cn(
                          "p-1.5 rounded transition-colors",
                          theme === 'modern' ? "text-white/30 hover:text-red-400" : "text-slate-400 hover:text-red-600"
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {availableTargets.length > 0 && (
            <div className="flex gap-2">
              <select
                value={newEdgeTarget}
                onChange={(e) => setNewEdgeTarget(e.target.value)}
                aria-label="Connection target"
                className={cn(inputClass, "flex-1 py-2")}
              >
                <option value="" className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>Connect to…</option>
                {availableTargets.map(n => (
                  <option key={n.id} value={n.id} className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>{n.label}</option>
                ))}
              </select>
              <button
                disabled={!newEdgeTarget}
                onClick={() => {
                  onAddEdge(node.id, newEdgeTarget, 0.5);
                  setNewEdgeTarget('');
                }}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors",
                  "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                Add
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => { onDeleteNode(node.id); onClearSelection(); }}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-colors",
            theme === 'modern' ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-red-200 text-red-600 hover:bg-red-50"
          )}
        >
          <Trash2 className="w-4 h-4" />
          Delete concept
        </button>
      </div>
    );
  };

  // ------------------------------------------------------------------
  // Simulation settings (default)
  // ------------------------------------------------------------------
  const renderSettings = () => (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Settings2 className={cn("w-4 h-4", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
        <span className={theme === 'modern' ? "text-white" : "text-slate-900"}>Simulation settings</span>
      </div>

      <div className="space-y-2">
        <SectionLabel theme={theme}>Activation function</SectionLabel>
        <div className={cn(
          "grid grid-cols-2 gap-1.5 p-1.5 rounded-xl border",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
        )}>
          {([
            { fn: 'sigmoid', label: 'σ Sigmoid' },
            { fn: 'tanh', label: 'tanh' },
            { fn: 'bivalent', label: 'Bivalent' },
            { fn: 'trivalent', label: 'Trivalent' },
            { fn: 'linear', label: 'Linear' },
          ] as { fn: ActivationFunction; label: string }[]).map(({ fn, label }) => (
            <button
              key={fn}
              onClick={() => setActivationFn(fn)}
              className={cn(
                "py-2.5 px-3 text-sm font-medium rounded-lg transition-colors",
                activationFn === fn
                  ? (theme === 'modern' ? "bg-white/10 text-emerald-400" : "bg-white text-emerald-600 shadow-sm border border-slate-200")
                  : (theme === 'modern' ? "text-white/50 hover:text-white/80" : "text-slate-400 hover:text-slate-600")
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className={cn("text-xs leading-relaxed", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
          {activationFn === 'sigmoid' && 'Continuous, activations stay in [0, 1].'}
          {activationFn === 'tanh' && 'Continuous, activations range across [−1, 1].'}
          {activationFn === 'bivalent' && 'Binary on/off: activations are 0 or 1.'}
          {activationFn === 'trivalent' && 'Three states: −1, 0, or +1.'}
          {activationFn === 'linear' && 'Linear scaling, clamped to [0, 1].'}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <SectionLabel theme={theme}>Steepness λ</SectionLabel>
          <span className={cn("text-sm font-mono font-semibold", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>{lambda.toFixed(1)}</span>
        </div>
        <input
          type="range" min="0.1" max="5" step="0.1" value={lambda}
          aria-label="Lambda steepness"
          onChange={(e) => setLambda(parseFloat(e.target.value))}
          className={cn("w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500", theme === 'modern' ? "bg-white/10" : "bg-slate-200")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <SectionLabel theme={theme}>Max iterations</SectionLabel>
          <span className={cn("text-sm font-mono font-semibold", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>{maxIterations}</span>
        </div>
        <input
          type="range" min="5" max="200" step="5" value={maxIterations}
          aria-label="Maximum iterations"
          onChange={(e) => setMaxIterations(parseInt(e.target.value, 10))}
          className={cn("w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500", theme === 'modern' ? "bg-white/10" : "bg-slate-200")}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <SectionLabel theme={theme}>Convergence ε</SectionLabel>
          <span className={cn("text-sm font-mono font-semibold", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>{convergenceThreshold.toExponential(0)}</span>
        </div>
        <select
          value={convergenceThreshold}
          aria-label="Convergence threshold"
          onChange={(e) => setConvergenceThreshold(parseFloat(e.target.value))}
          className={inputClass}
        >
          {[0.01, 0.001, 0.0001, 0.00001].map(v => (
            <option key={v} value={v} className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>
              {v.toExponential(0)} — stop when max change per step falls below
            </option>
          ))}
        </select>
      </div>

      <AdvancedParameters
        linguisticScale={linguisticScale}
        onLinguisticScaleChange={setLinguisticScale}
        membershipFunction={membershipFunction}
        onMembershipFunctionChange={setMembershipFunction}
        theme={theme}
      />

      <div className={cn(
        "p-3 rounded-xl border text-sm",
        theme === 'modern' ? "bg-emerald-500/5 border-emerald-500/10 text-white/70" : "bg-emerald-50 border-emerald-200 text-slate-600"
      )}>
        <span className="font-medium">{nodes.length}</span> concepts · <span className="font-medium">{edges.length}</span> connections
        {nodes.some(n => n.clamped) && (
          <span> · <span className="font-medium">{nodes.filter(n => n.clamped).length}</span> clamped</span>
        )}
      </div>

      <button
        onClick={onRunSimulation}
        disabled={isSimulating || nodes.length === 0}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50",
          theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
        )}
      >
        <Play className="w-4 h-4 fill-current" />
        {isSimulating ? 'Running…' : 'Run simulation'}
      </button>
    </div>
  );

  return (
    <div className={cn(
      "w-80 h-full flex flex-col border-l overflow-y-auto custom-scrollbar",
      theme === 'modern' ? "bg-[#0a0a14] border-white/5" : "bg-[#faf8f5] border-stone-200"
    )}>
      {selectedEdge ? renderEdgeEditor(selectedEdge) : selectedNode ? renderNodeEditor(selectedNode) : renderSettings()}
    </div>
  );
};

export default Inspector;
