import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { cn } from '../lib/utils';

interface FCMEdgeData {
  weight: number;
  theme?: 'modern' | 'academic';
  isExporting?: boolean;
}

/**
 * Causal edge with a weight pill at its midpoint. Clicking the edge selects
 * it and opens the relationship editor in the inspector; the pill itself is
 * display-only so the canvas stays calm. Positive weights render green with
 * a "+", negative red with a "−", so color is not the only signal.
 */
export default function FCMEdge({
  id: _id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
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

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: color,
          strokeWidth: 1 + absWeight * 4,
          opacity: theme === 'modern' ? (0.25 + absWeight * 0.6) : (0.4 + absWeight * 0.6),
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="nodrag nopan pointer-events-none"
        >
          <div className={cn(
            "px-2 py-0.5 rounded-full border text-xs font-mono font-semibold backdrop-blur-sm",
            weight > 0
              ? "text-emerald-500"
              : weight < 0
                ? "text-red-500"
                : (theme === 'modern' ? "text-white/60" : "text-slate-500"),
            theme === 'modern' ? "bg-[#0a0a14]/85 border-white/10" : "bg-white/90 border-slate-200",
            isExporting && "border-transparent shadow-none"
          )}>
            {weight > 0 ? '+' : weight < 0 ? '−' : ''}{Math.abs(weight).toFixed(2)}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
