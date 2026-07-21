import React, { useMemo } from 'react';
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
import { SimulationRun } from '../../lib/experiments';
import { COLORS, ExperimentTheme, chartTooltipStyle, chartAxisColor, chartGridColor } from './shared';

interface ConvergenceViewProps {
  run: SimulationRun;
  theme: ExperimentTheme;
}

const ConvergenceView: React.FC<ConvergenceViewProps> = ({ run, theme }) => {
  const convergenceData = useMemo(() => {
    if (run.history.length === 0) return [];

    return run.history.map((iterState, i) => {
      const point: Record<string, number | string> = { iteration: i };
      iterState.forEach(concept => {
        point[concept.label] = parseFloat(concept.activation.toFixed(4));
      });
      return point;
    });
  }, [run]);

  // tanh/trivalent runs can go negative; widen the axis when they do
  const hasNegative = useMemo(
    () => run.history.some(iterState => iterState.some(c => c.activation < 0)),
    [run]
  );
  const clampedLabels = useMemo(() => {
    if (!run.clampedConcepts || run.clampedConcepts.length === 0) return [];
    return run.clampedConcepts
      .map(id => run.finalState.find(c => c.id === id)?.label ?? id);
  }, [run]);

  return (
    <div className="space-y-4">
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <h4 className={cn(
          "text-sm font-bold mb-4",
          theme === 'modern' ? "text-white/80" : "text-slate-700"
        )}>
          Convergence: {run.name}
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={convergenceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(theme)} />
              <XAxis
                dataKey="iteration"
                stroke={chartAxisColor(theme)}
                fontSize={10}
                label={{ value: 'Iteration', position: 'bottom', offset: -5 }}
              />
              <YAxis
                domain={hasNegative ? [-1, 1] : [0, 1]}
                stroke={chartAxisColor(theme)}
                fontSize={10}
                label={{ value: 'Activation', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip contentStyle={chartTooltipStyle(theme)} />
              <Legend />
              {run.finalState.slice(0, 10).map((concept, i) => (
                <Line
                  key={concept.id}
                  type="monotone"
                  dataKey={concept.label}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {run.finalState.length > 10 && (
          <p className={cn(
            "text-xs mt-2 text-center",
            theme === 'modern' ? "text-white/55" : "text-slate-500"
          )}>
            Showing first 10 concepts. Total: {run.finalState.length}
          </p>
        )}
      </div>

      {/* Run Info */}
      <div className={cn(
        "p-4 rounded-xl border",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Status', value: run.converged ? 'Converged' : 'Not Converged', className: run.converged ? "text-emerald-500" : "text-amber-500" },
            { label: 'Iterations', value: String(run.iterations) },
            { label: 'Concepts', value: String(run.finalState.length) },
            { label: 'Activation Fn', value: run.config.activationFunction, capitalize: true },
            { label: 'Rule', value: run.config.inferenceRule ?? 'modified-kosko' },
            { label: 'Lambda λ', value: String(run.config.lambda) },
            { label: 'Max Iterations', value: String(run.config.maxIterations) },
            { label: 'Convergence ε', value: run.config.convergenceThreshold.toExponential(0) },
            { label: 'Clamped', value: clampedLabels.length > 0 ? `${clampedLabels.length}` : 'None' },
          ].map(({ label, value, className, capitalize }) => (
            <div key={label}>
              <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
                {label}
              </p>
              <p className={cn(
                "text-lg font-bold mt-1",
                capitalize && "capitalize",
                className ?? (theme === 'modern' ? "text-white" : "text-slate-800")
              )}>
                {value}
              </p>
            </div>
          ))}
        </div>
        {clampedLabels.length > 0 && (
          <p className={cn("text-xs mt-3", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
            Clamped concepts: {clampedLabels.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ConvergenceView;
