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
                domain={[0, 1]}
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
            theme === 'modern' ? "text-white/30" : "text-slate-400"
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
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
              Status
            </p>
            <p className={cn("text-lg font-bold mt-1", run.converged ? "text-emerald-500" : "text-amber-500")}>
              {run.converged ? 'Converged' : 'Not Converged'}
            </p>
          </div>
          <div>
            <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
              Iterations
            </p>
            <p className={cn("text-lg font-bold mt-1", theme === 'modern' ? "text-white" : "text-slate-800")}>
              {run.iterations}
            </p>
          </div>
          <div>
            <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
              Concepts
            </p>
            <p className={cn("text-lg font-bold mt-1", theme === 'modern' ? "text-white" : "text-slate-800")}>
              {run.finalState.length}
            </p>
          </div>
          <div>
            <p className={cn("text-xs uppercase tracking-wider", theme === 'modern' ? "text-white/40" : "text-slate-400")}>
              Activation Fn
            </p>
            <p className={cn("text-lg font-bold mt-1 capitalize", theme === 'modern' ? "text-white" : "text-slate-800")}>
              {run.config.activationFunction}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvergenceView;
