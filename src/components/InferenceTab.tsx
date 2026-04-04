import React, { useMemo } from 'react';
import { SimulationResult, FCMNode, FCMEdge, LINGUISTIC_TERMS } from '../types';
import { Brain, TrendingUp, TrendingDown, Minus, Info, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface InferenceTabProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  results: SimulationResult[];
  theme?: 'modern' | 'academic';
}

const InferenceTab: React.FC<InferenceTabProps> = ({ nodes, edges, results, theme = 'modern' }) => {
  const analysis = useMemo(() => {
    if (results.length < 2) return null;

    const first = results[0];
    const last = results[results.length - 1];
    const iterations = results.length;

    const nodeChanges = nodes.map(node => {
      const start = first[node.id] || 0;
      const end = last[node.id] || 0;
      const diff = end - start;
      const percentChange = start !== 0 ? (diff / start) * 100 : (end > 0 ? 100 : 0);
      
      return {
        ...node,
        start,
        end,
        diff,
        percentChange,
        trend: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'stable'
      };
    });

    // Find most influential edges
    const influentialEdges = [...edges]
      .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
      .slice(0, 3);

    const isStable = results.length < 50; // Simple heuristic for convergence

    return {
      nodeChanges,
      influentialEdges,
      iterations,
      isStable
    };
  }, [nodes, edges, results]);

  if (!analysis) {
    return (
      <div className={cn(
        "absolute inset-0 flex flex-col items-center justify-center p-10 text-center transition-all duration-500",
        theme === 'modern' ? "bg-[#0a0a14] font-mono" : "bg-[#f5f0e8] font-serif"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border transition-colors duration-500",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
        )}>
          <Brain className={cn("w-8 h-8", theme === 'modern' ? "text-white/20" : "text-slate-300")} />
        </div>
        <h2 className={cn(
          "text-xl font-black uppercase tracking-tighter mb-2 transition-colors duration-500",
          theme === 'modern' ? "text-white" : "text-slate-900"
        )}>Inference Engine Idle</h2>
        <p className={cn(
          "text-xs font-black uppercase tracking-[0.3em] max-w-md leading-relaxed transition-colors duration-500",
          theme === 'modern' ? "text-white/30" : "text-slate-400"
        )}>
          Run a simulation to generate a semantic analysis of your causal model's behavior and equilibrium.
        </p>
      </div>
    );
  }

  const getLinguisticWeight = (weight: number) => {
    const term = LINGUISTIC_TERMS.reduce((prev, curr) => 
      Math.abs(curr.value - weight) < Math.abs(prev.value - weight) ? curr : prev
    );
    return term.label;
  };

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col overflow-hidden transition-all duration-500",
      theme === 'modern' ? "bg-[#0a0a14] font-mono" : "bg-[#f5f0e8] font-serif"
    )}>
      {/* Header */}
      <div className={cn(
        "p-8 border-b flex items-center justify-between transition-colors duration-500",
        theme === 'modern' ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-500",
            theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
          )}>
            <Brain className={cn("w-5 h-5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          </div>
          <div>
            <h2 className={cn(
              "text-lg font-black uppercase tracking-tighter transition-colors duration-500",
              theme === 'modern' ? "text-white" : "text-slate-900"
            )}>Inference Report</h2>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-500",
              theme === 'modern' ? "text-white/30" : "text-slate-400"
            )}>Semantic Decision Support</p>
          </div>
        </div>

        <div className={cn(
          "px-4 py-2 rounded-xl border flex items-center gap-2 transition-colors duration-500",
          analysis.isStable 
            ? (theme === 'modern' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600") 
            : (theme === 'modern' ? "bg-amber-500/5 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-200 text-amber-600")
        )}>
          {analysis.isStable ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {analysis.isStable ? `Converged in ${analysis.iterations} steps` : "Non-Convergent System"}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-8 custom-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-8 content-start">
        {/* Concept Shifts */}
        <div className="space-y-6">
          <h3 className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            <Target className="w-3 h-3" />
            Concept Equilibrium Shifts
          </h3>
          
          <div className="grid gap-4">
            {analysis.nodeChanges.map(node => (
              <div key={node.id} className={cn(
                "border rounded-2xl p-5 transition-all group",
                theme === 'modern' ? "bg-white/5 border-white/5 hover:bg-white/[0.07]" : "bg-slate-50 border-slate-100 hover:bg-slate-100"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <span className={cn(
                    "text-[11px] font-black uppercase tracking-wider transition-colors duration-500",
                    theme === 'modern' ? "text-white" : "text-slate-900"
                  )}>{node.label}</span>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors duration-500",
                    node.trend === 'up' ? (theme === 'modern' ? "text-emerald-400 bg-emerald-500/10" : "text-emerald-700 bg-emerald-100") :
                    node.trend === 'down' ? (theme === 'modern' ? "text-red-400 bg-red-500/10" : "text-red-700 bg-red-100") :
                    (theme === 'modern' ? "text-white/40 bg-white/5" : "text-slate-400 bg-slate-200")
                  )}>
                    {node.trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
                     node.trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {node.trend}
                  </div>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <div className={cn(
                      "flex justify-between text-[9px] font-black uppercase tracking-widest transition-colors duration-500",
                      theme === 'modern' ? "text-white/20" : "text-slate-400"
                    )}>
                      <span>Initial: {node.start.toFixed(2)}</span>
                      <span>Final: {node.end.toFixed(2)}</span>
                    </div>
                    <div className={cn(
                      "h-1.5 rounded-full overflow-hidden flex transition-colors duration-500",
                      theme === 'modern' ? "bg-black/40" : "bg-slate-200"
                    )}>
                      <div 
                        className={cn("h-full transition-colors duration-500", theme === 'modern' ? "bg-white/10" : "bg-slate-300")} 
                        style={{ width: `${node.start * 100}%` }} 
                      />
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000",
                          node.trend === 'up' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                          node.trend === 'down' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                          (theme === 'modern' ? "bg-white/40" : "bg-slate-400")
                        )}
                        style={{ 
                          width: `${Math.abs(node.diff) * 100}%`,
                          marginLeft: node.trend === 'down' ? `-${Math.abs(node.diff) * 100}%` : '0'
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-lg font-black tracking-tighter transition-colors duration-500",
                      node.trend === 'up' ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-700") :
                      node.trend === 'down' ? (theme === 'modern' ? "text-red-400" : "text-red-700") :
                      (theme === 'modern' ? "text-white/40" : "text-slate-400")
                    )}>
                      {node.diff > 0 ? '+' : ''}{node.percentChange.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Causal Insights */}
        <div className="space-y-6">
          <h3 className={cn(
            "text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            <Info className="w-3 h-3" />
            Causal Drivers & Bottlenecks
          </h3>

          <div className={cn(
            "border rounded-3xl p-8 space-y-8 relative overflow-hidden transition-all duration-500",
            theme === 'modern' ? "bg-black/40 border-white/5" : "bg-slate-50 border-slate-100 shadow-sm"
          )}>
            <div className={cn(
              "absolute top-0 left-0 w-full h-full bg-gradient-to-b pointer-events-none opacity-20",
              theme === 'modern' ? "from-emerald-500/5 to-transparent" : "from-emerald-600/5 to-transparent"
            )} />
            
            <div className="space-y-4 relative z-10">
              <p className={cn(
                "text-xs leading-relaxed transition-colors duration-500",
                theme === 'modern' ? "text-white/60" : "text-slate-600"
              )}>
                Based on the inference engine, the system reached equilibrium after <span className={cn("font-black", theme === 'modern' ? "text-white" : "text-slate-900")}>{analysis.iterations} iterations</span>. 
                The primary drivers of this state are:
              </p>
              
              <div className="space-y-4">
                {analysis.influentialEdges.map((edge, i) => {
                  const source = nodes.find(n => n.id === edge.source);
                  const target = nodes.find(n => n.id === edge.target);
                  return (
                    <div key={edge.id} className={cn(
                      "flex items-start gap-4 p-4 rounded-2xl border transition-colors duration-500",
                      theme === 'modern' ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"
                    )}>
                      <div className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors duration-500",
                        theme === 'modern' ? "bg-white/5 text-white/20" : "bg-slate-50 text-slate-400"
                      )}>
                        0{i + 1}
                      </div>
                      <div className="flex-1">
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-wider mb-1 transition-colors duration-500",
                          theme === 'modern' ? "text-white/80" : "text-slate-800"
                        )}>
                          {source?.label} <span className={cn("mx-1", theme === 'modern' ? "text-white/20" : "text-slate-300")}>→</span> {target?.label}
                        </p>
                        <p className={cn(
                          "text-[9px] leading-relaxed transition-colors duration-500",
                          theme === 'modern' ? "text-white/40" : "text-slate-500"
                        )}>
                          Has a <span className={cn("font-black", edge.weight > 0 ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-700") : (theme === 'modern' ? "text-red-400" : "text-red-700"))}>
                            {getLinguisticWeight(edge.weight)}
                          </span> influence, significantly impacting the final convergence of the system.
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cn(
              "pt-6 border-t relative z-10 transition-colors duration-500",
              theme === 'modern' ? "border-white/5" : "border-slate-200"
            )}>
              <h4 className={cn(
                "text-[9px] font-black uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors duration-500",
                theme === 'modern' ? "text-emerald-400" : "text-emerald-700"
              )}>
                <AlertCircle className="w-3 h-3" />
                Strategic Recommendation
              </h4>
              <p className={cn(
                "text-[11px] italic leading-relaxed transition-colors duration-500",
                theme === 'modern' ? "text-white/50" : "text-slate-600"
              )}>
                {analysis.nodeChanges.some(n => n.trend === 'down') ? (
                  <>
                    "To mitigate the decline in <span className={cn("font-black not-italic", theme === 'modern' ? "text-white" : "text-slate-900")}>{analysis.nodeChanges.find(n => n.trend === 'down')?.label}</span>, 
                    consider reversing or weakening the negative influence from <span className={cn("font-black not-italic", theme === 'modern' ? "text-white" : "text-slate-900")}>{nodes.find(n => edges.find(e => e.target === analysis.nodeChanges.find(nc => nc.trend === 'down')?.id && e.weight < 0)?.source)?.label || 'external factors'}</span>."
                  </>
                ) : (
                  <>
                    "The system shows strong positive synergy. To further accelerate <span className={cn("font-black not-italic", theme === 'modern' ? "text-white" : "text-slate-900")}>{analysis.nodeChanges.sort((a,b) => b.end - a.end)[0].label}</span>, 
                    focus on strengthening the <span className={cn("font-black not-italic", theme === 'modern' ? "text-emerald-400" : "text-emerald-700")}>{getLinguisticWeight(analysis.influentialEdges[0].weight)}</span> link from 
                    <span className={cn("font-black not-italic", theme === 'modern' ? "text-white" : "text-slate-900")}>{nodes.find(n => n.id === analysis.influentialEdges[0].source)?.label}</span>."
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InferenceTab;
