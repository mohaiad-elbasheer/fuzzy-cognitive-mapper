import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  MarkerType,
  Panel,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import { Camera, Loader2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { cn } from '../lib/utils';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node) => void;
  nodeTypes?: any;
  edgeTypes?: any;
  theme?: 'modern' | 'academic';
}

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onEdgeClick,
  onNodeClick,
  onNodeDragStop,
  nodeTypes,
  edgeTypes,
  theme = 'modern',
}) => {
  const { getNodes, getEdges, fitView, getViewport, setViewport } = useReactFlow();
  const [isExporting, setIsExporting] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  const edgeOptions = useMemo(() => ({
    type: 'fcm',
    animated: !isExporting,
    style: { strokeWidth: 2 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: theme === 'modern' ? '#10b981' : '#059669',
    },
  }), [theme, isExporting]);

  const styledEdges = useMemo(() => {
    return edges.map((edge) => {
      const weight = (edge.data?.weight as number) || 0;
      const color = weight > 0 
        ? (theme === 'modern' ? '#10b981' : '#059669') 
        : weight < 0 
          ? (theme === 'modern' ? '#ef4444' : '#dc2626') 
          : (theme === 'modern' ? '#ffffff' : '#475569');
      
      return {
        ...edge,
        type: 'fcm',
        animated: !isExporting,
        data: {
          ...edge.data,
          isExporting,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
        },
      };
    });
  }, [edges, theme, isExporting]);

  const onDownloadImage = useCallback(async () => {
    if (!flowRef.current) return;

    const flowViewport = getViewport();
    setIsExporting(true);

    try {
      const nodes = getNodes();
      if (nodes.length === 0) {
        setIsExporting(false);
        return;
      }

      // 1. Wait for UI to hide
      await new Promise(resolve => setTimeout(resolve, 200));

      // 2. Calculate deterministic viewport to fit all nodes
      const bounds = getNodesBounds(nodes);
      const { clientWidth, clientHeight } = flowRef.current;
      const viewport = getViewportForBounds(bounds, clientWidth, clientHeight, 0.1, 2, 0.4);
      
      // 3. Apply the viewport
      setViewport(viewport, { duration: 0 });

      // 4. Wait for React Flow to update the DOM
      await new Promise(resolve => setTimeout(resolve, 600));

      const dataUrl = await toPng(flowRef.current, {
        backgroundColor: theme === 'modern' ? '#0a0a14' : '#f5f0e8',
        style: {
          width: flowRef.current.clientWidth + 'px',
          height: flowRef.current.clientHeight + 'px',
        },
        filter: (node) => {
          const exclusionClasses = ['react-flow__controls', 'react-flow__panel', 'react-flow__attribution'];
          return !exclusionClasses.some((cls) => (node as HTMLElement).classList?.contains(cls));
        },
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `fcm-map-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
      // Restore the user's original viewport
      setViewport(flowViewport, { duration: 0 });
    }
  }, [getNodes, setViewport, getViewport, theme]);

  return (
    <div 
      ref={flowRef}
      className={cn(
        "h-full w-full transition-colors duration-500",
        theme === 'modern' ? "bg-[#0a0a14]" : "bg-[#f5f0e8]"
      )}
    >
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={edgeOptions}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        colorMode={theme === 'modern' ? 'dark' : 'light'}
        connectionMode="loose"
        connectionRadius={40}
      >
        <Background 
          color={theme === 'modern' ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.05)"} 
          gap={20} 
          size={1} 
        />
        <Controls className={cn(
          "!shadow-2xl !rounded-xl overflow-hidden !border transition-all duration-500",
          theme === 'modern' ? "!bg-[#0a0a14] !border-white/10" : "!bg-white !border-slate-200",
          isExporting && "hidden"
        )} />
        
        <Panel position="top-left" className={cn(
          "flex items-center gap-2 transition-all duration-500",
          isExporting && "hidden"
        )}>
          <button
            onClick={onDownloadImage}
            disabled={isExporting}
            className={cn(
              "relative group flex items-center justify-center w-9 h-9 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-300",
              theme === 'modern' 
                ? "bg-[#0a0a14]/80 border-white/10 text-white hover:bg-white/10 hover:border-white/20" 
                : "bg-white/80 border-slate-200 text-slate-900 hover:bg-white hover:border-slate-300"
            )}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            
            {/* Floating Tooltip */}
            {!isExporting && (
              <div className={cn(
                "absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-300 shadow-2xl border",
                theme === 'modern' 
                  ? "bg-[#0a0a14] text-white border-white/10" 
                  : "bg-white text-slate-900 border-slate-200"
              )}>
                Capture Map
              </div>
            )}
          </button>

          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-xl border backdrop-blur-md shadow-xl transition-all duration-500",
            theme === 'modern' ? "bg-[#0a0a14]/80 border-white/10" : "bg-white/80 border-slate-200"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors duration-500",
              theme === 'modern' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-emerald-600"
            )} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
              theme === 'modern' ? "text-white/40" : "text-slate-400"
            )}>
              Neural Topology
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export default Canvas;
