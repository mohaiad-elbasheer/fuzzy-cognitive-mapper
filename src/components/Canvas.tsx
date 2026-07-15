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
import { toPng, toSvg } from 'html-to-image';
import { Camera, FileCode, Loader2 } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { toast } from '../lib/toast';
import { cn } from '../lib/utils';

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  onEdgeClick?: (event: React.MouseEvent, edge: Edge) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
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
  const { getNodes, getViewport, setViewport } = useReactFlow();
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

  const exportImage = useCallback(async (format: 'png' | 'svg') => {
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

      const exportOptions = {
        backgroundColor: theme === 'modern' ? '#0a0a14' : '#f5f0e8',
        style: {
          width: flowRef.current.clientWidth + 'px',
          height: flowRef.current.clientHeight + 'px',
        },
        filter: (node: HTMLElement) => {
          const exclusionClasses = ['react-flow__controls', 'react-flow__panel', 'react-flow__attribution'];
          return !exclusionClasses.some((cls) => node.classList?.contains(cls));
        },
      };

      const dataUrl = format === 'png'
        ? await toPng(flowRef.current, { ...exportOptions, pixelRatio: 2 })
        : await toSvg(flowRef.current, exportOptions);

      const link = document.createElement('a');
      link.download = `fcm-map-${new Date().toISOString().split('T')[0]}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Export failed', err);
      toast.error(`Image export failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setIsExporting(false);
      // Restore the user's original viewport
      setViewport(flowViewport, { duration: 0 });
    }
  }, [getNodes, setViewport, getViewport, theme]);

  const onDownloadImage = useCallback(() => exportImage('png'), [exportImage]);
  const onDownloadSvg = useCallback(() => exportImage('svg'), [exportImage]);

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
        fitViewOptions={{ padding: 0.2 }}
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
                "absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-300 shadow-2xl border",
                theme === 'modern' 
                  ? "bg-[#0a0a14] text-white border-white/10" 
                  : "bg-white text-slate-900 border-slate-200"
              )}>
                Export PNG
              </div>
            )}
          </button>

          <button
            onClick={onDownloadSvg}
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
              <FileCode className="w-4 h-4" />
            )}

            {!isExporting && (
              <div className={cn(
                "absolute left-full ml-3 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 pointer-events-none transition-all duration-300 shadow-2xl border",
                theme === 'modern' 
                  ? "bg-[#0a0a14] text-white border-white/10" 
                  : "bg-white text-slate-900 border-slate-200"
              )}>
                Export SVG
              </div>
            )}
          </button>

        </Panel>
      </ReactFlow>
    </div>
  );
};

export default Canvas;
