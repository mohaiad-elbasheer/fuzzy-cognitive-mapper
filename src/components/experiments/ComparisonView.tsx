import React, { useMemo } from 'react';
import { GitCompare } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../lib/utils';
import { ComparisonResult } from '../../lib/experiments';
import { ExperimentTheme, chartTooltipStyle, chartAxisColor, chartGridColor } from './shared';

interface ComparisonViewProps {
  selectedCount: number;
  result: ComparisonResult | null;
  theme: ExperimentTheme;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ selectedCount, result, theme }) => {
  const comparisonData = useMemo(() => {
    if (!result) return [];
    return result.deltas.map(d => ({
      name: d.label,
      [result.runA.name]: d.valueA,
      [result.runB.name]: d.valueB,
      delta: d.delta,
    }));
  }, [result]);

  const hasNegative = useMemo(
    () => !!result && result.deltas.some(d => d.valueA < 0 || d.valueB < 0),
    [result]
  );

  if (selectedCount < 2 || !result) {
    return (
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
          Currently selected: {selectedCount}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
          {result.runA.name} vs {result.runB.name}
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(theme)} />
              <XAxis type="number" domain={hasNegative ? [-1, 1] : [0, 1]} stroke={chartAxisColor(theme)} fontSize={10} />
              <YAxis type="category" dataKey="name" width={120} stroke={chartAxisColor(theme)} fontSize={10} />
              <Tooltip
                contentStyle={chartTooltipStyle(theme)}
                formatter={(value: number) => value.toFixed(3)}
              />
              <Legend />
              <Bar dataKey={result.runA.name} fill="#3b82f6" />
              <Bar dataKey={result.runB.name} fill="#10b981" />
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
          {result.summary.mostIncreased && (
            <div className={cn("p-3 rounded-lg", theme === 'modern' ? "bg-emerald-500/10" : "bg-emerald-50")}>
              <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-emerald-400/60" : "text-emerald-600")}>
                Most Increased
              </p>
              <p className={cn("font-bold mt-1", theme === 'modern' ? "text-emerald-400" : "text-emerald-700")}>
                {result.summary.mostIncreased.label}
              </p>
              <p className="text-emerald-500 text-sm">
                +{(result.summary.mostIncreased.delta * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {result.summary.mostDecreased && (
            <div className={cn("p-3 rounded-lg", theme === 'modern' ? "bg-red-500/10" : "bg-red-50")}>
              <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-red-400/60" : "text-red-600")}>
                Most Decreased
              </p>
              <p className={cn("font-bold mt-1", theme === 'modern' ? "text-red-400" : "text-red-700")}>
                {result.summary.mostDecreased.label}
              </p>
              <p className="text-red-500 text-sm">
                {(result.summary.mostDecreased.delta * 100).toFixed(1)}%
              </p>
            </div>
          )}
          <div className={cn("p-3 rounded-lg", theme === 'modern' ? "bg-white/5" : "bg-slate-50")}>
            <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
              Avg. Change
            </p>
            <p className={cn("font-bold mt-1 text-lg", theme === 'modern' ? "text-white" : "text-slate-800")}>
              {(result.summary.averageAbsDelta * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
