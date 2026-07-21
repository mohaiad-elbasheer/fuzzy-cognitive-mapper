import React, { useState, useMemo } from 'react';
import { Dices, Loader2 } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../lib/utils';
import { FCMNode, FCMEdge } from '../../types';
import { SimulationConfig } from '../../lib/experiments';
import { runMonteCarlo, MonteCarloResult } from '../../logic/monteCarlo';
import { ExperimentTheme, chartTooltipStyle, chartAxisColor, chartGridColor } from './shared';

interface UncertaintyViewProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  config: SimulationConfig;
  theme: ExperimentTheme;
}

/**
 * Monte Carlo uncertainty analysis: samples the weight matrix within each
 * edge's ± uncertainty and shows the resulting distribution of final
 * activations (5th–95th percentile band with the median marked).
 */
const UncertaintyView: React.FC<UncertaintyViewProps> = ({ nodes, edges, config, theme }) => {
  const [samples, setSamples] = useState(500);
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);

  const uncertainEdges = useMemo(() => edges.filter(e => (e.uncertainty ?? 0) > 0), [edges]);
  const signedRange = config.activationFunction === 'tanh' || config.activationFunction === 'trivalent';

  const run = () => {
    setRunning(true);
    // Let the spinner paint before the synchronous computation
    window.setTimeout(() => {
      const mc = runMonteCarlo(
        nodes,
        edges,
        {
          activationFunction: config.activationFunction,
          lambda: config.lambda,
          maxIterations: config.maxIterations,
          convergenceThreshold: config.convergenceThreshold,
          inferenceRule: config.inferenceRule,
          clampedNodeIds: nodes.filter(n => n.clamped).map(n => n.id),
        },
        { samples }
      );
      setResult(mc);
      setRunning(false);
    }, 30);
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.distributions.map(d => ({
      name: d.label,
      // Stacked bars: an invisible base up to p05, then the p05–p95 band
      base: d.p05,
      band: d.p95 - d.p05,
      median: d.median,
      p05: d.p05,
      p95: d.p95,
      mean: d.mean,
    }));
  }, [result]);

  return (
    <div className="space-y-4">
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <h4 className={cn("text-sm font-bold mb-1", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
          Uncertainty Analysis (Monte Carlo)
        </h4>
        <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
          Samples every weight within its ± uncertainty and re-runs the simulation each time.
          {uncertainEdges.length === 0
            ? ' No connection has uncertainty yet — select a connection on the map and set "Uncertainty ±" to make this meaningful.'
            : ` ${uncertainEdges.length} of ${edges.length} connections carry uncertainty.`}
        </p>

        <div className="flex items-center gap-3">
          <label className={cn("text-sm", theme === 'modern' ? "text-white/60" : "text-slate-600")}>
            Samples
            <select
              value={samples}
              onChange={(e) => setSamples(parseInt(e.target.value, 10))}
              aria-label="Number of Monte Carlo samples"
              className={cn(
                "ml-2 border rounded-lg px-2 py-1.5 text-sm outline-none",
                theme === 'modern' ? "bg-white/5 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              )}
            >
              {[100, 500, 1000, 2000].map(n => (
                <option key={n} value={n} className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>{n}</option>
              ))}
            </select>
          </label>
          <button
            onClick={run}
            disabled={running || nodes.length === 0}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50",
              theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
            {running ? 'Sampling…' : 'Run analysis'}
          </button>
          {result && (
            <span className={cn("text-xs ml-auto", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
              {result.samples} runs · {(result.convergedFraction * 100).toFixed(0)}% converged · seed {result.seed}
            </span>
          )}
        </div>
      </div>

      {result && (
        <div className={cn(
          "p-4 rounded-xl border",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        )}>
          <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
            Final activation: 5th–95th percentile band, median marked
          </h4>
          <div style={{ height: Math.max(240, result.distributions.length * 44) }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(theme)} />
                <XAxis
                  type="number"
                  domain={signedRange ? [-1, 1] : [0, 1]}
                  stroke={chartAxisColor(theme)}
                  fontSize={10}
                />
                <YAxis type="category" dataKey="name" width={130} stroke={chartAxisColor(theme)} fontSize={11} />
                <Tooltip
                  contentStyle={chartTooltipStyle(theme)}
                  formatter={(value: number, key: string) => {
                    if (key === 'band') return [value.toFixed(3), 'p95 − p05 span'];
                    if (key === 'base') return [value.toFixed(3), 'p05'];
                    return [value.toFixed(3), key];
                  }}
                />
                <Bar dataKey="base" stackId="range" fill="transparent" />
                <Bar dataKey="band" stackId="range" fill="#10b981" opacity={0.45} radius={3} />
                <Scatter dataKey="median" fill={theme === 'modern' ? '#ffffff' : '#0f172a'} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={cn("text-left text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
                  <th className="pb-2">Concept</th>
                  <th className="pb-2 text-right">p05</th>
                  <th className="pb-2 text-right">Median</th>
                  <th className="pb-2 text-right">p95</th>
                  <th className="pb-2 text-right">Mean</th>
                </tr>
              </thead>
              <tbody>
                {result.distributions.map(d => (
                  <tr key={d.id} className={cn("border-t", theme === 'modern' ? "border-white/5" : "border-slate-100")}>
                    <td className={cn("py-1.5", theme === 'modern' ? "text-white/80" : "text-slate-700")}>{d.label}</td>
                    <td className={cn("py-1.5 text-right font-mono", theme === 'modern' ? "text-white/60" : "text-slate-500")}>{d.p05.toFixed(3)}</td>
                    <td className={cn("py-1.5 text-right font-mono font-semibold", theme === 'modern' ? "text-white" : "text-slate-900")}>{d.median.toFixed(3)}</td>
                    <td className={cn("py-1.5 text-right font-mono", theme === 'modern' ? "text-white/60" : "text-slate-500")}>{d.p95.toFixed(3)}</td>
                    <td className={cn("py-1.5 text-right font-mono", theme === 'modern' ? "text-white/60" : "text-slate-500")}>{d.mean.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UncertaintyView;
