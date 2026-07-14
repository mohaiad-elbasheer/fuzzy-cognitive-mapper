import React, { useState } from 'react';
import { Settings2, Plus, Trash2, Info, Activity, Zap, Link as LinkIcon, ArrowRight, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FCMNode, FCMEdge, ActivationFunction, LinguisticScalePreset, MembershipFunctionType } from '../types';
import { cn } from '../lib/utils';
import AdvancedParameters from './AdvancedParameters';

interface SidebarProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  onUpdateNode: (nodeId: string, updates: Partial<FCMNode>) => void;
  onAddNode: () => void;
  onDeleteNode: (nodeId: string) => void;
  onAddEdge: (sourceId: string, targetId: string, weight: number) => void;
  onDeleteEdge: (edgeId: string) => void;
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
  onRunSimulation: () => void;
  isSimulating: boolean;
  theme?: 'modern' | 'academic';
}

const Sidebar: React.FC<SidebarProps> = ({
  nodes,
  edges,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onAddEdge,
  onDeleteEdge,
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
  theme = 'modern',
}) => {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [newEdgeTarget, setNewEdgeTarget] = useState<string>('');

  const PALETTE = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
  ];

  return (
    <div className={cn(
      "w-96 h-full flex flex-col border-l shadow-2xl z-30 transition-all duration-500",
      theme === 'modern' ? "bg-[#0a0a14] border-white/5 font-mono" : "bg-[#faf8f5] border-stone-200 font-serif"
    )}>
      {/* Fixed Header */}
      <div className={cn("p-6 border-b flex items-center justify-between shrink-0 transition-colors duration-500", theme === 'modern' ? "border-white/5" : "border-slate-100")}>
        <div>
          <h2 className={cn(
            "text-xl font-black flex items-center gap-2 transition-colors duration-500",
            theme === 'modern' ? "text-white" : "text-slate-900"
          )}>
            <Settings2 className={cn("w-5 h-5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
            Engine
          </h2>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors duration-500",
            theme === 'modern' ? "text-white/30" : "text-slate-400"
          )}>Configuration Panel</p>
        </div>
        <button
          onClick={onAddNode}
          className={cn(
            "w-10 h-10 rounded-xl transition-all flex items-center justify-center shadow-sm border",
            theme === 'modern' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white"
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {/* Global Parameters Section */}
        <div className={cn("p-6 border-b transition-colors duration-500", theme === 'modern' ? "border-white/5" : "border-slate-100")}>
          <label className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] mb-4 block transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            Global Parameters
          </label>
          <div className="space-y-6">
          <div>
            <label className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] mb-3 block transition-colors duration-500",
              theme === 'modern' ? "text-white/40" : "text-slate-500"
            )}>
              Inference Function
            </label>
            <div className={cn(
              "grid grid-cols-2 gap-2 p-1.5 rounded-2xl border transition-colors duration-500",
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
                    "py-2.5 px-4 text-xs font-bold rounded-xl transition-all",
                    activationFn === fn
                      ? (theme === 'modern' ? "bg-white/10 text-emerald-400 shadow-md" : "bg-white text-emerald-600 shadow-sm border border-slate-200")
                      : (theme === 'modern' ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] block transition-colors duration-500",
                theme === 'modern' ? "text-white/40" : "text-slate-500"
              )}>
                Lambda (λ)
              </label>
              <span className={cn("text-xs font-bold transition-colors duration-500", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>{lambda.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value))}
              className={cn(
                "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-colors duration-500",
                theme === 'modern' ? "bg-white/10" : "bg-slate-200"
              )}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] block transition-colors duration-500",
                theme === 'modern' ? "text-white/40" : "text-slate-500"
              )}>
                Max Iterations
              </label>
              <span className={cn("text-xs font-bold transition-colors duration-500", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>{maxIterations}</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={maxIterations}
              onChange={(e) => setMaxIterations(parseInt(e.target.value, 10))}
              className={cn(
                "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-colors duration-500",
                theme === 'modern' ? "bg-white/10" : "bg-slate-200"
              )}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <label className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] block transition-colors duration-500",
                theme === 'modern' ? "text-white/40" : "text-slate-500"
              )}>
                Convergence ε
              </label>
              <span className={cn("text-xs font-bold transition-colors duration-500", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")}>{convergenceThreshold.toExponential(0)}</span>
            </div>
            <select
              value={convergenceThreshold}
              onChange={(e) => setConvergenceThreshold(parseFloat(e.target.value))}
              className={cn(
                "w-full border rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none transition-all duration-500",
                theme === 'modern' ? "bg-white/5 border-white/10 focus:border-emerald-500 text-white/80" : "bg-white border-slate-200 focus:border-emerald-600 text-slate-700"
              )}
            >
              {[0.01, 0.001, 0.0001, 0.00001].map(v => (
                <option key={v} value={v} className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>
                  {v.toExponential(0)} — stop when max change per step falls below
                </option>
              ))}
            </select>
          </div>

          {/* Advanced Parameters - Collapsed by default */}
          <AdvancedParameters
            linguisticScale={linguisticScale}
            onLinguisticScaleChange={setLinguisticScale}
            membershipFunction={membershipFunction}
            onMembershipFunctionChange={setMembershipFunction}
            theme={theme}
          />
          </div>
        </div>

        {/* System Concepts Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <label className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] block transition-colors duration-500",
              theme === 'modern' ? "text-white/40" : "text-slate-500"
            )}>
              System Concepts ({nodes.length})
            </label>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          
          <div className="space-y-4">
            {nodes.length === 0 && (
              <div className={cn(
                "text-center py-12 px-6 border-2 border-dashed rounded-3xl transition-colors duration-500",
                theme === 'modern' ? "border-white/5" : "border-slate-200"
              )}>
                <p className={cn(
                  "text-sm font-medium italic transition-colors duration-500",
                  theme === 'modern' ? "text-white/20" : "text-slate-400"
                )}>Define your first concept to begin modeling.</p>
              </div>
            )}
            {nodes.map((node, index) => {
              const nodeEdges = edges.filter(e => e.source === node.id);
              const isExpanded = expandedNode === node.id;
              const color = PALETTE[index % PALETTE.length];

              return (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={node.id} 
                  className={cn(
                    "group p-5 rounded-2xl border transition-all space-y-4",
                    isExpanded 
                      ? (theme === 'modern' ? "bg-white/5 border-emerald-500/30 shadow-xl shadow-emerald-500/5" : "bg-slate-50 border-emerald-200 shadow-sm")
                      : (theme === 'modern' ? "border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10" : "border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200")
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-black transition-all duration-500",
                        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
                      )} style={{ color }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <input
                        type="text"
                        value={node.label}
                        onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
                        className={cn(
                          "bg-transparent font-bold focus:outline-none focus:ring-0 w-32 truncate transition-colors duration-500",
                          theme === 'modern' ? "text-white/80" : "text-slate-700"
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateNode(node.id, { clamped: !node.clamped })}
                        title={node.clamped ? "Unclamp: let this concept evolve during simulation" : "Clamp: hold this concept at its initial value (scenario input)"}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          node.clamped
                            ? (theme === 'modern' ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600")
                            : (theme === 'modern' ? "text-white/20 hover:text-amber-400 hover:bg-amber-500/10" : "text-slate-300 hover:text-amber-600 hover:bg-amber-50")
                        )}
                      >
                        {node.clamped ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-all",
                          isExpanded ? (theme === 'modern' ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600") : (theme === 'modern' ? "text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10" : "text-slate-300 hover:text-emerald-600 hover:bg-emerald-50")
                        )}
                      >
                        <LinkIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteNode(node.id)}
                        className={cn(
                          "opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg",
                          theme === 'modern' ? "text-white/20 hover:text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:text-red-600 hover:bg-red-50"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className={cn(
                        "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors duration-500",
                        theme === 'modern' ? "text-white/40" : "text-slate-500"
                      )}>
                        <Activity className="w-3 h-3" />
                        Initial State
                      </div>
                      <span className={cn(
                        "text-xs font-mono font-black px-2 py-0.5 rounded-md transition-colors duration-500",
                        theme === 'modern' ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-700 bg-emerald-50"
                      )}>
                        {(node.initialActivation * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="relative h-6 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={node.initialActivation}
                        onChange={(e) => onUpdateNode(node.id, { initialActivation: parseFloat(e.target.value) })}
                        className={cn(
                          "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-colors duration-500",
                          theme === 'modern' ? "bg-white/10" : "bg-slate-200"
                        )}
                      />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={cn(
                          "overflow-hidden pt-4 border-t space-y-4 transition-colors duration-500",
                          theme === 'modern' ? "border-white/5" : "border-slate-100"
                        )}
                      >
                        <div className="space-y-3">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest block transition-colors duration-500",
                            theme === 'modern' ? "text-white/40" : "text-slate-500"
                          )}>
                            Outgoing Connections
                          </label>
                          {nodeEdges.length === 0 ? (
                            <p className={cn(
                              "text-[10px] italic transition-colors duration-500",
                              theme === 'modern' ? "text-white/20" : "text-slate-400"
                            )}>No connections defined.</p>
                          ) : (
                            <div className="space-y-2">
                              {nodeEdges.map(edge => {
                                const targetNode = nodes.find(n => n.id === edge.target);
                                return (
                                  <div key={edge.id} className={cn(
                                    "flex items-center justify-between p-2 rounded-lg border transition-colors duration-500",
                                    theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className={cn("w-3 h-3 transition-colors duration-500", theme === 'modern' ? "text-white/20" : "text-slate-400")} />
                                      <span className={cn(
                                        "text-[10px] font-bold truncate w-24 transition-colors duration-500",
                                        theme === 'modern' ? "text-white/60" : "text-slate-600"
                                      )}>{targetNode?.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={cn(
                                        "text-[10px] font-mono font-bold",
                                        edge.weight > 0 ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-600") : (theme === 'modern' ? "text-red-400" : "text-red-600")
                                      )}>
                                        {edge.weight > 0 ? '+' : ''}{edge.weight.toFixed(1)}
                                      </span>
                                      <button 
                                        onClick={() => onDeleteEdge(edge.id)}
                                        className={cn(
                                          "transition-colors",
                                          theme === 'modern' ? "text-white/20 hover:text-red-400" : "text-slate-400 hover:text-red-600"
                                        )}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className={cn(
                            "text-[10px] font-black uppercase tracking-widest block transition-colors duration-500",
                            theme === 'modern' ? "text-white/40" : "text-slate-500"
                          )}>
                            Add New Connection
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={newEdgeTarget}
                              onChange={(e) => setNewEdgeTarget(e.target.value)}
                              className={cn(
                                "flex-1 border rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none transition-all duration-500",
                                theme === 'modern' ? "bg-white/5 border-white/10 focus:border-emerald-500 text-white/80" : "bg-white border-slate-200 focus:border-emerald-600 text-slate-700"
                              )}
                            >
                              <option value="" className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>Select Target...</option>
                              {nodes.filter(n => n.id !== node.id && !nodeEdges.some(e => e.target === n.id)).map(n => (
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
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-50 transition-all",
                                theme === 'modern' ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-emerald-600 text-white hover:bg-emerald-700"
                              )}
                            >
                              Connect
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Weight Matrix Preview */}
        <div className={cn("px-8 py-4 border-t transition-colors duration-500", theme === 'modern' ? "border-white/5" : "border-slate-100")}>
          <label className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] mb-4 block transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            Weight Matrix
          </label>
          <div className={cn(
            "rounded-xl border p-3 overflow-x-auto custom-scrollbar transition-colors duration-500",
            theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
          )}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-1"></th>
                  {nodes.map((n, i) => (
                    <th key={n.id} className="p-1 text-[9px] font-bold" style={{ color: PALETTE[i % PALETTE.length] }}>{n.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nodes.map((row, i) => (
                  <tr key={row.id}>
                    <td className="p-1 text-[9px] font-bold" style={{ color: PALETTE[i % PALETTE.length] }}>{row.label}</td>
                    {nodes.map((col) => {
                      const edge = edges.find(e => e.source === row.id && e.target === col.id);
                      const weight = edge ? edge.weight : 0;
                      return (
                        <td key={col.id} className={cn(
                          "p-1 text-[9px] text-center font-mono",
                          weight > 0 ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-600") : weight < 0 ? (theme === 'modern' ? "text-red-400" : "text-red-600") : (theme === 'modern' ? "text-white/10" : "text-slate-300")
                        )}>
                          {row.id === col.id ? '—' : weight.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inference Formula */}
        <div className={cn("px-8 py-4 border-t transition-colors duration-500", theme === 'modern' ? "border-white/5" : "border-slate-100")}>
          <div className={cn(
            "border rounded-xl p-4 transition-colors duration-500",
            theme === 'modern' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200"
          )}>
            <label className={cn(
              "text-[9px] font-black uppercase tracking-widest mb-2 block transition-colors duration-500",
              theme === 'modern' ? "text-emerald-400/60" : "text-emerald-700"
            )}>
              FCM Inference Rule
            </label>
            <div className={cn(
              "text-xs font-bold leading-relaxed transition-colors duration-500",
              theme === 'modern' ? "text-white/70" : "text-slate-700"
            )}>
              A<sub>i</sub><sup>(k+1)</sup> = f( Σ A<sub>j</sub><sup>(k)</sup> · w<sub>ji</sub> + A<sub>i</sub><sup>(k)</sup> )
            </div>
          </div>
        </div>
      </div>

      <div className={cn("p-8 border-t transition-colors duration-500", theme === 'modern' ? "bg-white/[0.02] backdrop-blur-sm border-white/5" : "bg-slate-50 border-slate-200")}>
        <div className={cn(
          "flex items-start gap-3 p-4 rounded-2xl border shadow-sm transition-colors duration-500",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        )}>
          <Info className={cn("w-4 h-4 mt-0.5 shrink-0", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          <p className={cn(
            "text-[10px] leading-relaxed font-medium transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            Manage causal links between concepts here or by dragging handles in the canvas. Click the link icon on a concept to manage its connections.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
