import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FCMNodeData {
  label: string;
  activation: number;
  initialActivation: number;
  color?: string;
  theme?: 'modern' | 'academic';
  onLabelChange?: (label: string) => void;
  onActivationChange?: (val: number) => void;
  onDelete?: () => void;
}

const FCMNodeComponent = ({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as FCMNodeData;
  const activation = nodeData.activation || 0;
  const initialActivation = nodeData.initialActivation || 0;
  const color = nodeData.color || '#10b981';
  const theme = nodeData.theme || 'modern';
  
  // Calculate ring properties
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (activation * circumference);

  const [isEditing, setIsEditing] = React.useState(false);
  const [label, setLabel] = React.useState(nodeData.label);

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  const handleLabelBlur = () => {
    setIsEditing(false);
    if (nodeData.onLabelChange) {
      nodeData.onLabelChange(label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelBlur();
    }
  };

  const onActivationChange = (delta: number) => {
    if (nodeData.onActivationChange) {
      nodeData.onActivationChange(Math.max(0, Math.min(1, initialActivation + delta)));
    }
  };

  return (
    <div className={cn(
      "relative group transition-all duration-500",
      selected ? "scale-110" : "hover:scale-105",
      theme === 'academic' && "font-serif"
    )}>
      {/* Outer Glow */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full blur-xl transition-opacity group-hover:opacity-40",
          theme === 'modern' ? "opacity-20" : "opacity-10"
        )}
        style={{ backgroundColor: color }}
      />

      {/* Main Node Body */}
      <div className={cn(
        "relative w-20 h-20 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300 overflow-hidden",
        theme === 'modern' ? "bg-[#0a0a14]" : "bg-white",
        selected 
          ? (theme === 'modern' ? "border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" : "border-slate-900 shadow-[0_0_20px_rgba(0,0,0,0.1)]")
          : (theme === 'modern' ? "border-white/10" : "border-slate-200")
      )}>
        {/* Activation Ring (SVG) */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="3"
            className={theme === 'modern' ? "text-white/5" : "text-slate-100"}
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
            style={{ filter: theme === 'modern' ? `drop-shadow(0 0 3px ${color})` : 'none' }}
          />
        </svg>

        {/* Content */}
        <div className="z-10 flex flex-col items-center justify-center p-2 text-center">
          <span className={cn(
            "text-[10px] font-black uppercase tracking-tighter leading-none mb-1 transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-400"
          )}>
            ACT
          </span>
          <span className={cn(
            "text-lg font-black leading-none tracking-tighter transition-colors duration-500",
            theme === 'modern' ? "text-white" : "text-slate-900"
          )}>
            {Math.round(activation * 100)}%
          </span>
        </div>

        {/* Quick Adjustment Overlay (Visible on Hover/Selected) */}
        <div className={cn(
          "absolute inset-0 z-20 flex items-center justify-between px-1 transition-opacity duration-300",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivationChange(-0.1);
            }}
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center transition-all",
              theme === 'modern' ? "bg-white/10 hover:bg-red-500/20 text-white/40 hover:text-red-400" : "bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600"
            )}
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onActivationChange(0.1);
            }}
            className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center transition-all",
              theme === 'modern' ? "bg-white/10 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400" : "bg-slate-100 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
            )}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Delete Button (Moved outside overflow-hidden) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (nodeData.onDelete) nodeData.onDelete();
        }}
        className={cn(
          "absolute -top-2 -right-2 z-30 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 scale-0 group-hover:scale-100 hover:bg-red-600",
          selected && "scale-100"
        )}
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Label (Floating) */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap z-20">
        {isEditing ? (
          <input
            autoFocus
            value={label}
            onChange={handleLabelChange}
            onBlur={handleLabelBlur}
            onKeyDown={handleKeyDown}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded outline-none w-32 text-center transition-all duration-500",
              theme === 'modern' ? "bg-[#0a0a14] border-emerald-500 text-white" : "bg-white border-slate-900 text-slate-900 shadow-sm"
            )}
          />
        ) : (
          <span 
            onClick={() => setIsEditing(true)}
            className={cn(
              "text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 cursor-text",
              theme === 'modern' 
                ? (selected ? "text-white" : "text-white/40 group-hover:text-white/60")
                : (selected ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600")
            )}
          >
            {data.label as string}
          </span>
        )}
      </div>

      {/* Connection Handles - All 4 sides for flexible connections */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2 !translate-x-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2 !translate-x-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2 !-translate-y-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={cn(
          "!w-2.5 !h-2.5 transition-all z-30 !border-2 !-translate-y-2",
          theme === 'modern' 
            ? "!bg-white/30 !border-white/20 hover:!bg-emerald-400 hover:!border-emerald-300" 
            : "!bg-slate-300 !border-slate-400 hover:!bg-emerald-500 hover:!border-emerald-400"
        )}
      />
    </div>
  );
};

export default memo(FCMNodeComponent);
