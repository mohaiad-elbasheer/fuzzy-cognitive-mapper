import React, { useState, useMemo } from 'react';
import { Sliders, Loader2 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../lib/utils';
import { FCMNode, FCMEdge } from '../../types';
import { SimulationConfig } from '../../lib/experiments';
import { runSimulation } from '../../logic/fcmEngine';
import { COLORS, ExperimentTheme, chartTooltipStyle, chartAxisColor, chartGridColor } from './shared';

interface SensitivityData {
  inputValue: number;
  [conceptLabel: string]: number;
}

interface SensitivityViewProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  /** Current simulation settings; the sweep uses these, not defaults. */
  config: SimulationConfig;
  theme: ExperimentTheme;
}

const SensitivityView: React.FC<SensitivityViewProps> = ({ nodes, edges, config, theme }) => {
  const [inputId, setInputId] = useState<string | null>(null);
  const [data, setData] = useState<SensitivityData[]>([]);
  const [running, setRunning] = useState(false);

  // tanh/trivalent activations span [-1, 1]; sweep and plot accordingly
  const signedRange = config.activationFunction === 'tanh' || config.activationFunction === 'trivalent';
  const sweepMin = signedRange ? -1 : 0;

  // Sweep one input concept across its activation range and record every
  // final state, using the current simulation settings and clamps.
  const runAnalysis = (inputConceptId: string) => {
    setRunning(true);
    setInputId(inputConceptId);
    setData([]);

    const stepCount = 21;
    const stepSize = (1 - sweepMin) / (stepCount - 1);
    const sweepValues = Array.from({ length: stepCount }, (_, i) => sweepMin + i * stepSize);
    const clampedIds = nodes.filter(n => n.clamped).map(n => n.id);
    const results: SensitivityData[] = [];

    for (const sweepValue of sweepValues) {
      const modifiedNodes = nodes.map(node => ({
        ...node,
        initialActivation: node.id === inputConceptId ? sweepValue : node.initialActivation,
      }));

      const { steps } = runSimulation(
        modifiedNodes,
        edges,
        config.activationFunction,
        config.lambda,
        config.maxIterations,
        config.convergenceThreshold,
        { clampedNodeIds: clampedIds }
      );

      if (steps.length > 0) {
        const finalState = steps[steps.length - 1];
        const dataPoint: SensitivityData = { inputValue: sweepValue };
        nodes.forEach(node => {
          dataPoint[node.label] = finalState[node.id] ?? node.initialActivation;
        });
        results.push(dataPoint);
      }
    }

    setData(results);
    setRunning(false);
  };

  // How much each output changes across the full input sweep
  const slopes = useMemo(() => {
    if (data.length < 2) return [];

    const inputNode = nodes.find(n => n.id === inputId);
    if (!inputNode) return [];

    return nodes
      .filter(n => n.id !== inputId)
      .map(node => {
        const firstValue = data[0][node.label] || 0;
        const lastValue = data[data.length - 1][node.label] || 0;
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
  }, [data, inputId, nodes]);

  const inputLabel = nodes.find(n => n.id === inputId)?.label;

  return (
    <div className="space-y-4">
      {/* Input Selector */}
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <h4 className={cn("text-sm font-bold mb-3", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
          Sensitivity Analysis
        </h4>
        <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
          Select a concept to sweep from {sweepMin} to 1 and see how it affects all other concepts.
          Uses your current settings ({config.activationFunction}, λ {config.lambda}).
        </p>

        <div className="flex flex-wrap gap-2">
          {nodes.map(node => (
            <button
              key={node.id}
              onClick={() => runAnalysis(node.id)}
              disabled={running}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                inputId === node.id
                  ? (theme === 'modern'
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-emerald-100 text-emerald-700 border border-emerald-300")
                  : (theme === 'modern'
                      ? "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"),
                running && "opacity-50 cursor-wait"
              )}
            >
              {running && inputId === node.id ? (
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
      {data.length > 0 && inputId && (
        <>
          <div className={cn(
            "p-4 rounded-xl border",
            theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
          )}>
            <h4 className={cn("text-sm font-bold mb-4", theme === 'modern' ? "text-white/80" : "text-slate-700")}>
              Response Curves: Varying "{inputLabel}"
            </h4>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(theme)} />
                  <XAxis
                    dataKey="inputValue"
                    stroke={chartAxisColor(theme)}
                    fontSize={10}
                    tickFormatter={(v) => v.toFixed(1)}
                    label={{
                      value: `${inputLabel} (Input)`,
                      position: 'bottom',
                      offset: -5,
                      style: { fill: chartAxisColor(theme), fontSize: 10 },
                    }}
                  />
                  <YAxis
                    domain={[sweepMin, 1]}
                    stroke={chartAxisColor(theme)}
                    fontSize={10}
                    label={{
                      value: 'Activation',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: chartAxisColor(theme), fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{ ...chartTooltipStyle(theme), fontSize: 11 }}
                    formatter={(value: number) => value.toFixed(3)}
                    labelFormatter={(v) => `Input: ${Number(v).toFixed(2)}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {nodes
                    .filter(n => n.id !== inputId)
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
            {nodes.filter(n => n.id !== inputId).length > 8 && (
              <p className={cn(
                "text-xs mt-2 text-center",
                theme === 'modern' ? "text-white/55" : "text-slate-500"
              )}>
                Showing first 8 concepts. Total: {nodes.filter(n => n.id !== inputId).length}
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
            <p className={cn("text-xs mb-4", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
              Concepts sorted by how much they change when "{inputLabel}" varies from {sweepMin} to 1.
            </p>

            <div className="grid gap-2">
              {slopes.slice(0, 10).map((item, i) => (
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
                      : (theme === 'modern' ? "bg-white/10 text-white/60" : "bg-slate-200 text-slate-500")
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
                      (theme === 'modern' ? "text-white/60" : "text-slate-500")
                    )}>
                      {item.slope > 0 ? '+' : ''}{(item.slope * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className={cn(
              "mt-4 p-3 rounded-lg text-xs",
              theme === 'modern' ? "bg-white/5 text-white/60" : "bg-slate-50 text-slate-500"
            )}>
              <p><strong className="text-emerald-500">Steep positive slope:</strong> Concept increases as input increases</p>
              <p><strong className="text-red-500">Steep negative slope:</strong> Concept decreases as input increases</p>
              <p><strong>Flat (near 0):</strong> Concept is not sensitive to this input</p>
            </div>
          </div>
        </>
      )}

      {!inputId && (
        <div className={cn(
          "p-8 rounded-xl border text-center",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
        )}>
          <Sliders className={cn(
            "w-12 h-12 mx-auto mb-3",
            theme === 'modern' ? "text-white/60" : "text-slate-500"
          )} />
          <p className={cn("font-medium", theme === 'modern' ? "text-white/60" : "text-slate-600")}>
            Select a concept above to analyze
          </p>
          <p className={cn("text-sm mt-1", theme === 'modern' ? "text-white/55" : "text-slate-500")}>
            The analysis will show how all other concepts respond when you vary the selected input.
          </p>
        </div>
      )}
    </div>
  );
};

export default SensitivityView;
