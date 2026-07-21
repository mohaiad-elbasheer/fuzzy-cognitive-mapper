import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from '@xyflow/react';

type Snapshot = { nodes: Node[]; edges: Edge[] };

const MAX_HISTORY = 50;
/** Quiet period after the last change before a history entry is committed. */
const COMMIT_DELAY_MS = 350;

const deepCopy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const takeSnapshot = (nodes: Node[], edges: Edge[]): Snapshot => ({
  nodes: deepCopy(nodes),
  edges: deepCopy(edges),
});

/**
 * The parts of the graph that constitute an undoable edit. Volatile fields
 * (selection, hover, simulation-derived activation) are excluded so that
 * selecting a node or running a simulation never creates a history entry.
 */
const historyKey = (nodes: Node[], edges: Edge[]): string =>
  JSON.stringify({
    n: nodes.map(n => ({
      i: n.id,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      l: n.data?.label,
      a: n.data?.initialActivation,
      c: n.data?.clamped ?? false,
    })),
    e: edges.map(e => ({
      i: e.id,
      s: e.source,
      t: e.target,
      w: e.data?.weight,
      u: e.data?.uncertainty ?? 0,
    })),
  });

/**
 * Automatic undo/redo history for the graph.
 *
 * Instead of requiring every mutation site to call saveToHistory (which
 * previously missed sidebar edits, matrix edits, and node drags), this hook
 * observes nodes/edges and commits a history entry after each burst of
 * changes settles. Rapid sequences (slider drags, node drags) collapse into
 * a single undoable step.
 */
export function useGraphHistory(
  nodes: Node[],
  edges: Edge[],
  setNodes: Dispatch<SetStateAction<Node[]>>,
  setEdges: Dispatch<SetStateAction<Edge[]>>
) {
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  /** Last state that history considers "current" (start point of any pending edit). */
  const baseline = useRef<Snapshot | null>(null);
  const baselineKey = useRef<string>('');
  /** Set while applying an undo/redo/reset so the observer doesn't record it. */
  const restoring = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (baseline.current === null || restoring.current) {
      restoring.current = false;
      baseline.current = takeSnapshot(nodes, edges);
      baselineKey.current = historyKey(nodes, edges);
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const key = historyKey(nodes, edges);
      if (key === baselineKey.current) return; // selection/activation only

      // Capture the ref value NOW: the state updater runs after this
      // callback finishes, by which point baseline has been reassigned
      // to the post-edit snapshot.
      const entry = baseline.current!;
      setPast(p => [...p, entry].slice(-MAX_HISTORY));
      setFuture([]);
      baseline.current = takeSnapshot(nodes, edges);
      baselineKey.current = key;
    }, COMMIT_DELAY_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [nodes, edges]);

  const restore = useCallback((snap: Snapshot) => {
    restoring.current = true;
    setNodes(deepCopy(snap.nodes));
    setEdges(deepCopy(snap.edges));
  }, [setNodes, setEdges]);

  const undo = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    // An edit still inside the commit window: undo back to the baseline
    const currentKey = historyKey(nodes, edges);
    if (baseline.current && currentKey !== baselineKey.current) {
      setFuture(f => [takeSnapshot(nodes, edges), ...f]);
      restore(baseline.current);
      return;
    }

    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(p => p.slice(0, -1));
    setFuture(f => [takeSnapshot(nodes, edges), ...f]);
    restore(previous);
  }, [past, nodes, edges, restore]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(f => f.slice(1));
    setPast(p => [...p, takeSnapshot(nodes, edges)].slice(-MAX_HISTORY));
    restore(next);
  }, [future, nodes, edges, restore]);

  /** Clear all history, e.g. when switching to a different project. */
  const resetHistory = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setPast([]);
    setFuture([]);
    baseline.current = null; // re-baselined by the observer on next render
  }, []);

  return {
    undo,
    redo,
    resetHistory,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
