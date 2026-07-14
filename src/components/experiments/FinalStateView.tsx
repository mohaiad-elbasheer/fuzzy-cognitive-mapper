import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../../lib/utils';
import { SimulationRun } from '../../lib/experiments';
import { ExperimentTheme, chartTooltipStyle, chartAxisColor, chartGridColor } from './shared';

interface FinalStateViewProps {
  run: SimulationRun;
  theme: ExperimentTheme;
}

const FinalStateView: React.FC<FinalStateViewProps> = ({ run, theme }) => {
  const finalStateData = useMemo(() => {
    return run.finalState.map(concept => ({
      name: concept.label,
      initial: concept.initialActivation,
      final: concept.activation,
      change: concept.activation - concept.initialActivation,
    }));
  }, [run]);

  return (
    <div className={cn(
      "p-4 rounded-xl border",
      theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
    )}>
      <h4 className={cn(
        "text-sm font-bold mb-4",
        theme === 'modern' ? "text-white/80" : "text-slate-700"
      )}>
        Final State: {run.name}
      </h4>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={finalStateData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor(theme)} />
            <XAxis
              type="number"
              domain={[0, 1]}
              stroke={chartAxisColor(theme)}
              fontSize={10}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              stroke={chartAxisColor(theme)}
              fontSize={10}
            />
            <Tooltip
              contentStyle={chartTooltipStyle(theme)}
              formatter={(value: number) => value.toFixed(3)}
            />
            <Legend />
            <Bar dataKey="initial" name="Initial" fill="#64748b" opacity={0.5} />
            <Bar dataKey="final" name="Final">
              {finalStateData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.change >= 0 ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FinalStateView;
