import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { calculateCentrality } from '../../lib/experiments';
import { FCMNode, FCMEdge } from '../../types';
import { ExperimentTheme } from './shared';

interface CentralityViewProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  theme: ExperimentTheme;
}

const CentralityView: React.FC<CentralityViewProps> = ({ nodes, edges, theme }) => {
  const centrality = useMemo(() => calculateCentrality(nodes, edges), [nodes, edges]);

  return (
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
  );
};

export default CentralityView;
