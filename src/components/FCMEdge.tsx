import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { RefreshCw, Plus, Minus, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FCMEdgeData {
  weight: number;
  theme?: 'modern' | 'academic';
  onWeightChange?: (id: string, weight: number) => void;
  onFlip?: (id: string) => void;
  onDelete?: (id: string) => void;
  isExporting?: boolean;
}

export default function FCMEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  animated,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as unknown as FCMEdgeData;
  const weight = edgeData?.weight || 0;
  const theme = edgeData?.theme || 'modern';
  const isExporting = edgeData?.isExporting || false;
  const color = weight > 0 ? '#10b981' : weight < 0 ? '#ef4444' : (theme === 'modern' ? '#ffffff' : '#94a3b8');
  const absWeight = Math.abs(weight);

  const onWeightChange = (delta: number) => {
    if (edgeData?.onWeightChange) {
      edgeData.onWeightChange(id, Math.max(-1, Math.min(1, weight + delta)));
    }
  };

  const onFlip = () => {
    if (edgeData?.onFlip) {
      edgeData.onFlip(id);
    }
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          stroke: color,
          strokeWidth: 1 + absWeight * 4,
          opacity: theme === 'modern' ? (0.2 + absWeight * 0.6) : (0.4 + absWeight * 0.6),
        }} 
        animated={isExporting ? false : animated}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="flex flex-col items-center gap-1 group">
            <div className={cn(
              "flex items-center gap-1 backdrop-blur-md border rounded-lg p-1 shadow-2xl transition-all",
              theme === 'modern' ? "bg-[#0a0a14]/90 border-white/10 group-hover:border-white/20" : "bg-white/90 border-slate-200 group-hover:border-slate-300",
              isExporting && "border-transparent bg-transparent shadow-none"
            )}>
              {!isExporting && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWeightChange(-0.1);
                  }}
                  className={cn(
                    "p-1 rounded transition-colors",
                    theme === 'modern' ? "hover:bg-white/10 text-white/40 hover:text-red-400" : "hover:bg-red-50 text-slate-400 hover:text-red-600"
                  )}
                >
                  <Minus className="w-3 h-3" />
                </button>
              )}
              
              <div className="px-2 py-0.5 flex flex-col items-center min-w-[40px]">
                <span className={cn(
                  "text-[10px] font-black leading-none",
                  theme === 'modern' ? "font-mono" : "font-serif",
                  weight > 0 ? "text-emerald-500" : weight < 0 ? "text-red-500" : (theme === 'modern' ? "text-white/40" : "text-slate-400")
                )}>
                  {weight > 0 ? '+' : ''}{weight.toFixed(2)}
                </span>
              </div>

              {!isExporting && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onWeightChange(0.1);
                  }}
                  className={cn(
                    "p-1 rounded transition-colors",
                    theme === 'modern' ? "hover:bg-white/10 text-white/40 hover:text-emerald-400" : "hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"
                  )}
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {!isExporting && (
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFlip();
                  }}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2 py-1 backdrop-blur-md border rounded-full text-[8px] font-black uppercase tracking-widest transition-all",
                    theme === 'modern' ? "bg-[#0a0a14]/90 border-white/10 text-white/40 hover:text-white hover:border-white/30" : "bg-white/90 border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm"
                  )}
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                  Flip
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (edgeData.onDelete) edgeData.onDelete(id);
                  }}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 border rounded-full transition-all",
                    theme === 'modern' ? "bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border-red-500/20" : "bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-red-200 shadow-sm"
                  )}
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
