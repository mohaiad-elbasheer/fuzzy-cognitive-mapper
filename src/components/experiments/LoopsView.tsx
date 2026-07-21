import React, { useMemo } from 'react';
import { RefreshCw, ArrowRight, TrendingUp, Scale } from 'lucide-react';
import { cn } from '../../lib/utils';
import { FCMNode, FCMEdge } from '../../types';
import { findFeedbackLoops } from '../../lib/analysis/loops';
import { ExperimentTheme } from './shared';

interface LoopsViewProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  theme: ExperimentTheme;
}

/**
 * Lists every feedback loop in the map, classified as reinforcing
 * (runaway growth/decline) or balancing (self-correcting), ranked by
 * how strongly the loop feeds back.
 */
const LoopsView: React.FC<LoopsViewProps> = ({ nodes, edges, theme }) => {
  const loops = useMemo(() => findFeedbackLoops(nodes, edges), [nodes, edges]);

  if (loops.length === 0) {
    return (
      <div className={cn(
        "p-8 rounded-xl border text-center",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <RefreshCw className={cn("w-12 h-12 mx-auto mb-3", theme === 'modern' ? "text-white/60" : "text-slate-500")} />
        <p className={cn("font-medium", theme === 'modern' ? "text-white/60" : "text-slate-600")}>
          No feedback loops in this map
        </p>
        <p className={cn("text-sm mt-1 max-w-md mx-auto", theme === 'modern' ? "text-white/55" : "text-slate-500")}>
          The causal structure is a one-way flow. Loops appear when influence
          eventually returns to a concept it started from.
        </p>
      </div>
    );
  }

  const reinforcing = loops.filter(l => l.type === 'reinforcing').length;
  const balancing = loops.length - reinforcing;

  return (
    <div className="space-y-4">
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <h4 className={cn("text-sm font-bold mb-1", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
          Feedback Loops
        </h4>
        <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
          {loops.length} loop{loops.length > 1 ? 's' : ''}: {reinforcing} reinforcing (amplify change),{' '}
          {balancing} balancing (resist change). Strength is the product of the loop's absolute weights.
        </p>

        <div className="space-y-2">
          {loops.map((loop, i) => (
            <div
              key={i}
              className={cn(
                "p-3 rounded-lg border",
                theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold",
                  loop.type === 'reinforcing'
                    ? (theme === 'modern' ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-100 text-emerald-700")
                    : (theme === 'modern' ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-700")
                )}>
                  {loop.type === 'reinforcing' ? <TrendingUp className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                  {loop.type === 'reinforcing' ? 'Reinforcing (R)' : 'Balancing (B)'}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <div className={cn(
                    "w-24 h-1.5 rounded-full overflow-hidden",
                    theme === 'modern' ? "bg-white/10" : "bg-slate-200"
                  )}>
                    <div
                      className={loop.type === 'reinforcing' ? "h-full bg-emerald-500" : "h-full bg-blue-500"}
                      style={{ width: `${Math.min(loop.strength, 1) * 100}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-mono w-12 text-right", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
                    {loop.strength.toFixed(3)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap text-sm">
                {loop.labels.map((label, j) => (
                  <React.Fragment key={j}>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md",
                      theme === 'modern' ? "bg-white/10 text-white/80" : "bg-white border border-slate-200 text-slate-700"
                    )}>
                      {label}
                    </span>
                    <ArrowRight className={cn("w-3.5 h-3.5 shrink-0", theme === 'modern' ? "text-white/55" : "text-slate-500")} />
                  </React.Fragment>
                ))}
                <span className={cn(
                  "px-2 py-0.5 rounded-md",
                  theme === 'modern' ? "bg-white/10 text-white/80" : "bg-white border border-slate-200 text-slate-700"
                )}>
                  {loop.labels[0]}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={cn(
          "mt-4 p-3 rounded-lg text-xs leading-relaxed",
          theme === 'modern' ? "bg-white/5 text-white/60" : "bg-slate-50 text-slate-500"
        )}>
          <p><strong>Reinforcing loops</strong> amplify whatever direction the system is moving — growth spirals or vicious cycles.</p>
          <p><strong>Balancing loops</strong> push back against change and pull the system toward equilibrium.</p>
        </div>
      </div>
    </div>
  );
};

export default LoopsView;
