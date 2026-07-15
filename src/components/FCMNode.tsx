import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Trash2, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface FCMNodeData {
  label: string;
  activation: number;
  initialActivation: number;
  clamped?: boolean;
  color?: string;
  theme?: 'modern' | 'academic';
  /** True while the app is in connect mode and this node is the chosen source */
  isConnectSource?: boolean;
  connectMode?: boolean;
  onLabelChange?: (label: string) => void;
  onDelete?: () => void;
}

/**
 * Concept card. The label lives inside the card so React Flow's measured
 * bounds (and therefore fitView / auto-layout / image export) include it.
 * Activation is shown as a signed value with a diverging bar, so tanh and
 * trivalent results in [−1, 1] render truthfully.
 */
const FCMNodeComponent = ({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as FCMNodeData;
  const activation = nodeData.activation ?? nodeData.initialActivation ?? 0;
  const clamped = nodeData.clamped ?? false;
  const theme = nodeData.theme || 'modern';

  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);

  const commitLabel = () => {
    setIsEditing(false);
    const trimmed = label.trim();
    if (trimmed && trimmed !== nodeData.label) {
      nodeData.onLabelChange?.(trimmed);
    } else {
      setLabel(nodeData.label);
    }
  };

  const magnitude = Math.min(Math.abs(activation), 1);
  const negative = activation < 0;

  const handleClass = cn(
    "!w-3 !h-3 !border-2 transition-opacity z-30",
    theme === 'modern'
      ? "!bg-emerald-400 !border-emerald-300"
      : "!bg-emerald-500 !border-emerald-400",
    // Reveal on hover/selection to keep the resting canvas calm
    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
  );

  return (
    <div className={cn("relative group", theme === 'academic' && "font-serif")}>
      <div
        className={cn(
          "w-40 rounded-2xl border-2 px-3 py-2.5 transition-colors",
          theme === 'modern' ? "bg-[#12121f]" : "bg-white shadow-sm",
          nodeData.isConnectSource
            ? "border-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]"
            : selected
              ? (theme === 'modern' ? "border-emerald-400" : "border-emerald-600")
              : (theme === 'modern' ? "border-white/15 group-hover:border-white/30" : "border-slate-200 group-hover:border-slate-300"),
          nodeData.connectMode && "cursor-crosshair"
        )}
      >
        {/* Label (inside the card so it's part of the node bounds) */}
        {isEditing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLabel();
              if (e.key === 'Escape') {
                setLabel(nodeData.label);
                setIsEditing(false);
              }
            }}
            aria-label="Concept name"
            className={cn(
              "w-full text-sm font-semibold bg-transparent outline-none border-b",
              theme === 'modern' ? "text-white border-emerald-500" : "text-slate-900 border-emerald-600"
            )}
          />
        ) : (
          <div
            onDoubleClick={() => {
              setLabel(nodeData.label);
              setIsEditing(true);
            }}
            title="Double-click to rename"
            className={cn(
              "text-sm font-semibold leading-snug break-words",
              theme === 'modern' ? "text-white" : "text-slate-900"
            )}
          >
            {nodeData.label}
          </div>
        )}

        {/* Activation: signed value + diverging bar */}
        <div className="mt-2 flex items-center gap-2">
          <div className={cn(
            "relative flex-1 h-1.5 rounded-full overflow-hidden",
            theme === 'modern' ? "bg-white/10" : "bg-slate-200"
          )}>
            {/* center line for the diverging scale */}
            <div className={cn(
              "absolute left-1/2 top-0 bottom-0 w-px",
              theme === 'modern' ? "bg-white/20" : "bg-slate-300"
            )} />
            <div
              className={cn("absolute top-0 bottom-0", negative ? "bg-red-500" : "bg-emerald-500")}
              style={
                negative
                  ? { right: '50%', width: `${magnitude * 50}%` }
                  : { left: '50%', width: `${magnitude * 50}%` }
              }
            />
          </div>
          <span className={cn(
            "text-xs font-mono font-semibold w-11 text-right",
            negative ? "text-red-500" : (theme === 'modern' ? "text-emerald-400" : "text-emerald-600")
          )}>
            {activation >= 0 ? '+' : ''}{activation.toFixed(2)}
          </span>
        </div>

        {/* Clamp badge */}
        {clamped && (
          <div
            title="Clamped: held at its initial value during simulation"
            className={cn(
              "absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full border flex items-center justify-center",
              theme === 'modern' ? "bg-amber-500/20 border-amber-500/50 text-amber-400" : "bg-amber-100 border-amber-300 text-amber-700"
            )}
          >
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Delete (hover/selected) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          nodeData.onDelete?.();
        }}
        aria-label={`Delete concept ${nodeData.label}`}
        className={cn(
          "absolute -top-2.5 -right-2.5 z-30 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 scale-0 group-hover:scale-100 hover:bg-red-600",
          selected && "scale-100"
        )}
      >
        <Trash2 className="w-3 h-3" />
      </button>

      {/* Single deliberate pair of handles: flow left → right */}
      <Handle type="target" position={Position.Left} id="in" className={handleClass} aria-label="Incoming connection point" />
      <Handle type="source" position={Position.Right} id="out" className={handleClass} aria-label="Outgoing connection point" />
    </div>
  );
};

export default memo(FCMNodeComponent);
