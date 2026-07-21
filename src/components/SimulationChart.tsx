import React from 'react';
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
import { Activity } from 'lucide-react';
import { SimulationResult, FCMNode } from '../types';

import { cn } from '../lib/utils';

interface SimulationChartProps {
  data: SimulationResult[];
  nodes: FCMNode[];
  theme?: 'modern' | 'academic';
}

const SimulationChart: React.FC<SimulationChartProps> = ({ data, nodes, theme = 'modern' }) => {
  if (data.length === 0) {
    return (
      <div className={cn(
        "h-full flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-500",
        theme === 'modern' ? "border-white/5 bg-white/[0.02]" : "border-slate-200 bg-slate-50"
      )}>
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors duration-500",
          theme === 'modern' ? "bg-white/5" : "bg-slate-100"
        )}>
          <Activity className={cn("w-6 h-6", theme === 'modern' ? "text-white/60" : "text-slate-500")} />
        </div>
        <p className={cn(
          "text-xs font-bold uppercase tracking-wide transition-colors duration-500",
          theme === 'modern' ? "text-white/60" : "text-slate-500"
        )}>
          No Simulation Data
        </p>
        <p className={cn(
          "text-xs mt-2 max-w-[200px] transition-colors duration-500",
          theme === 'modern' ? "text-white/60" : "text-slate-500"
        )}>
          Initialize concepts and trigger the inference engine to visualize convergence.
        </p>
      </div>
    );
  }

  const colors = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
  ];

  // tanh/trivalent activations can be negative; widen the axis when needed
  const hasNegative = data.some(step =>
    nodes.some(node => (step[node.id] ?? 0) < 0)
  );
  const yDomain: [number, number] = hasNegative ? [-1, 1] : [0, 1];
  const yTicks = hasNegative ? [-1, -0.5, 0, 0.5, 1] : [0, 0.5, 1];

  return (
    <div className={cn(
      "h-full w-full p-6 rounded-2xl border shadow-2xl transition-all duration-500",
      theme === 'modern' ? "bg-[#0a0a14] border-white/10" : "bg-white border-slate-200"
    )}>
      <div className="flex items-center justify-between mb-8">
        <h3 className={cn(
          "text-xs font-bold uppercase tracking-wide flex items-center gap-3 transition-colors duration-500",
          theme === 'modern' ? "text-white/60" : "text-slate-500"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full transition-all duration-500",
            theme === 'modern' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-emerald-600"
          )} />
          Convergence Analysis
          <span className={cn(
            "ml-4 text-xs lowercase font-medium tracking-normal normal-case transition-opacity duration-500",
            theme === 'modern' ? "opacity-50" : "opacity-70"
          )}>
            Visualizes system stability and concept equilibrium over time.
          </span>
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-0.5 transition-colors duration-500",
              theme === 'modern' ? "bg-emerald-500/50" : "bg-emerald-600/30"
            )} />
            <span className={cn(
              "text-xs font-bold uppercase transition-colors duration-500",
              theme === 'modern' ? "text-white/60" : "text-slate-500"
            )}>Stable</span>
          </div>
        </div>
      </div>
      
      <div className="h-[calc(100%-60px)] w-full relative">
        {/* Axis Labels */}
        <div className={cn(
          "absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold uppercase tracking-wide pointer-events-none transition-colors duration-500",
          theme === 'modern' ? "text-white/10" : "text-slate-500"
        )}>
          Activation Level ({hasNegative ? '-1.0 - 1.0' : '0.0 - 1.0'})
        </div>
        <div className={cn(
          "absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wide pointer-events-none transition-colors duration-500",
          theme === 'modern' ? "text-white/10" : "text-slate-500"
        )}>
          Inference Iterations
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke={theme === 'modern' ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} 
            />
            <XAxis 
              dataKey="iteration" 
              axisLine={false} 
              tickLine={false} 
              tick={{ 
                fontSize: 9, 
                fill: theme === 'modern' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)', 
                fontWeight: 700 
              }}
              dy={10}
            />
            <YAxis 
              domain={yDomain} 
              axisLine={false} 
              tickLine={false} 
              tick={{ 
                fontSize: 9, 
                fill: theme === 'modern' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)', 
                fontWeight: 700 
              }}
              dx={-10}
              ticks={yTicks}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: theme === 'modern' ? 'rgba(10, 10, 20, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px', 
                border: theme === 'modern' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', 
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                fontSize: '10px',
                fontWeight: '700',
                color: theme === 'modern' ? '#fff' : '#0f172a'
              }}
              itemStyle={{ padding: '2px 0' }}
            />
            <Legend 
              iconType="circle" 
              wrapperStyle={{ 
                fontSize: '9px', 
                fontWeight: '800', 
                paddingTop: '30px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em', 
                opacity: 0.6,
                color: theme === 'modern' ? '#fff' : '#0f172a'
              }} 
            />
            {nodes.map((node, index) => (
              <Line
                key={node.id}
                type="monotone"
                dataKey={node.id}
                name={node.label}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: colors[index % colors.length] }}
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SimulationChart;
