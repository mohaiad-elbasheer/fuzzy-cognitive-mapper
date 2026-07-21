/**
 * Feedback-loop detection and classification.
 *
 * Enumerates simple cycles in the causal graph (self-loops included) and
 * classifies each as reinforcing (product of edge signs positive) or
 * balancing (negative), following standard systems-dynamics convention.
 */

import { FCMNode, FCMEdge } from '../../types';

export interface FeedbackLoop {
  /** Concept ids in traversal order; the loop closes back to the first id. */
  nodeIds: string[];
  /** Human-readable labels in the same order. */
  labels: string[];
  type: 'reinforcing' | 'balancing';
  /** Product of |weight| along the loop: how strongly it feeds back. */
  strength: number;
}

/**
 * Enumerate simple cycles via DFS. Each cycle is discovered exactly once by
 * only allowing nodes with an index >= the start node's index, so rotations
 * are never revisited. Zero-weight edges are ignored. Enumeration stops at
 * `maxLoops` to stay responsive on dense graphs.
 */
export const findFeedbackLoops = (
  nodes: FCMNode[],
  edges: FCMEdge[],
  maxLoops: number = 100
): FeedbackLoop[] => {
  const index = new Map<string, number>();
  nodes.forEach((n, i) => index.set(n.id, i));
  const labelOf = new Map(nodes.map(n => [n.id, n.label]));

  // Adjacency of non-zero edges only
  const out = new Map<string, FCMEdge[]>();
  for (const edge of edges) {
    if (edge.weight === 0) continue;
    if (!index.has(edge.source) || !index.has(edge.target)) continue;
    const list = out.get(edge.source) ?? [];
    list.push(edge);
    out.set(edge.source, list);
  }

  const loops: FeedbackLoop[] = [];

  const record = (path: string[], pathEdges: FCMEdge[]) => {
    const signProduct = pathEdges.reduce((s, e) => s * Math.sign(e.weight), 1);
    const strength = pathEdges.reduce((s, e) => s * Math.abs(e.weight), 1);
    loops.push({
      nodeIds: [...path],
      labels: path.map(id => labelOf.get(id) ?? id),
      type: signProduct > 0 ? 'reinforcing' : 'balancing',
      strength,
    });
  };

  for (const start of nodes) {
    if (loops.length >= maxLoops) break;
    const startIdx = index.get(start.id)!;
    const path: string[] = [start.id];
    const pathEdges: FCMEdge[] = [];
    const onPath = new Set<string>([start.id]);

    const dfs = (current: string) => {
      if (loops.length >= maxLoops) return;
      for (const edge of out.get(current) ?? []) {
        const next = edge.target;
        if (index.get(next)! < startIdx) continue; // canonical start only
        if (next === start.id) {
          record(path, [...pathEdges, edge]);
          if (loops.length >= maxLoops) return;
          continue;
        }
        if (onPath.has(next)) continue;
        path.push(next);
        pathEdges.push(edge);
        onPath.add(next);
        dfs(next);
        path.pop();
        pathEdges.pop();
        onPath.delete(next);
      }
    };

    dfs(start.id);
  }

  return loops.sort((a, b) => b.strength - a.strength);
};

/** Model-health warnings for the current graph. */
export interface ModelWarning {
  kind: 'isolated' | 'duplicate-edge' | 'zero-weight' | 'self-loop';
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
}

export const checkModel = (nodes: FCMNode[], edges: FCMEdge[]): ModelWarning[] => {
  const warnings: ModelWarning[] = [];

  const connected = new Set<string>();
  for (const e of edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  const isolated = nodes.filter(n => !connected.has(n.id));
  if (isolated.length > 0) {
    warnings.push({
      kind: 'isolated',
      message: `${isolated.length} concept${isolated.length > 1 ? 's are' : ' is'} not connected to anything: ${isolated.map(n => n.label).join(', ')}`,
      nodeIds: isolated.map(n => n.id),
    });
  }

  const seen = new Map<string, FCMEdge>();
  const duplicates: FCMEdge[] = [];
  for (const e of edges) {
    const key = `${e.source}→${e.target}`;
    if (seen.has(key)) duplicates.push(e);
    else seen.set(key, e);
  }
  if (duplicates.length > 0) {
    warnings.push({
      kind: 'duplicate-edge',
      message: `${duplicates.length} duplicate connection${duplicates.length > 1 ? 's' : ''} between the same concepts — their effects add up`,
      edgeIds: duplicates.map(e => e.id),
    });
  }

  const zero = edges.filter(e => e.weight === 0);
  if (zero.length > 0) {
    warnings.push({
      kind: 'zero-weight',
      message: `${zero.length} connection${zero.length > 1 ? 's have' : ' has'} zero weight and no causal effect`,
      edgeIds: zero.map(e => e.id),
    });
  }

  const selfLoops = edges.filter(e => e.source === e.target && e.weight !== 0);
  if (selfLoops.length > 0) {
    warnings.push({
      kind: 'self-loop',
      message: `${selfLoops.length} self-loop${selfLoops.length > 1 ? 's' : ''} active — these add explicit self-feedback on top of the inference rule's own self-memory term`,
      edgeIds: selfLoops.map(e => e.id),
    });
  }

  return warnings;
};
