import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from '@xyflow/react';

/**
 * Copy/paste/delete for the currently selected nodes and edges.
 * Copying a set of nodes also copies the edges between them; pasting
 * clones everything with fresh ids, offset by 40px.
 */
export function useSelectionActions(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>,
  saveToHistory: () => void
) {
  const [clipboard, setClipboard] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const copy = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter(
      (e) =>
        e.selected ||
        (selectedNodes.some((sn) => sn.id === e.source) &&
          selectedNodes.some((sn) => sn.id === e.target))
    );
    if (selectedNodes.length > 0) {
      setClipboard({ nodes: selectedNodes, edges: selectedEdges });
    }
  }, [nodes, edges]);

  const paste = useCallback(() => {
    if (!clipboard) return;
    saveToHistory();
    const idMap: Record<string, string> = {};
    const newNodes = clipboard.nodes.map((node) => {
      const newId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: true,
      };
    });

    const newEdges = clipboard.edges.map((edge) => ({
      ...edge,
      id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target,
      selected: true,
    }));

    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })).concat(newNodes));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })).concat(newEdges));
  }, [clipboard, saveToHistory, setNodes, setEdges]);

  const deleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);
    if (selectedNodes.length > 0 || selectedEdges.length > 0) {
      saveToHistory();
      setNodes((nds) => nds.filter((n) => !n.selected));
      setEdges((eds) =>
        eds.filter(
          (e) => !e.selected && !selectedNodes.some((sn) => sn.id === e.source || sn.id === e.target)
        )
      );
    }
  }, [nodes, edges, saveToHistory, setNodes, setEdges]);

  return { copy, paste, deleteSelected };
}
