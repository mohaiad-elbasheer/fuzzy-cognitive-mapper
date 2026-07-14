import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from '@xyflow/react';

type Snapshot = { nodes: Node[]; edges: Edge[] };

const MAX_HISTORY = 50;

const snapshot = (nodes: Node[], edges: Edge[]): Snapshot => ({
  nodes: JSON.parse(JSON.stringify(nodes)),
  edges: JSON.parse(JSON.stringify(edges)),
});

/**
 * Undo/redo history for the graph. Call `saveToHistory` BEFORE applying a
 * mutation so the pre-mutation state can be restored.
 */
export function useGraphHistory(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>
) {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const saveToHistory = useCallback(() => {
    setHistory((prev) => [...prev, snapshot(nodes, edges)].slice(-MAX_HISTORY));
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture((prev) => [snapshot(nodes, edges), ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [history, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((prev) => [...prev, snapshot(nodes, edges)]);
    setFuture((prev) => prev.slice(1));
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  return { saveToHistory, undo, redo };
}
