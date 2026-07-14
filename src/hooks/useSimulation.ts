import { useState, useCallback, Dispatch, SetStateAction } from 'react';
import { Node } from '@xyflow/react';
import { FCMNode, FCMEdge, ActivationFunction } from '../types';
import { runSimulation, SimulationOutcome } from '../logic/fcmEngine';

interface SimulationParams {
  activationFn: ActivationFunction;
  lambda: number;
  maxIterations: number;
  convergenceThreshold: number;
}

/**
 * Owns the simulation lifecycle: running the engine, exposing the outcome,
 * and syncing final activations back onto the canvas nodes.
 */
export function useSimulation(
  fcmNodes: FCMNode[],
  fcmEdges: FCMEdge[],
  params: SimulationParams,
  setNodes: Dispatch<SetStateAction<Node[]>>
) {
  const [simulation, setSimulation] = useState<SimulationOutcome | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const run = useCallback(() => {
    setIsSimulating(true);
    try {
      const outcome = runSimulation(
        fcmNodes,
        fcmEdges,
        params.activationFn,
        params.lambda,
        params.maxIterations,
        params.convergenceThreshold,
        { clampedNodeIds: fcmNodes.filter(n => n.clamped).map(n => n.id) }
      );
      setSimulation(outcome);

      // Sync final results back to nodes for canvas visualization
      if (outcome.steps.length > 0) {
        const finalState = outcome.steps[outcome.steps.length - 1];
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              activation: finalState[node.id],
            },
          }))
        );
      }
    } finally {
      setIsSimulating(false);
    }
  }, [fcmNodes, fcmEdges, params.activationFn, params.lambda, params.maxIterations, params.convergenceThreshold, setNodes]);

  /** Clear results and restore node activations to their initial values. */
  const reset = useCallback(() => {
    setSimulation(null);
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          activation: node.data.initialActivation,
        },
      }))
    );
  }, [setNodes]);

  /** Discard results without touching node state (e.g. on project switch). */
  const clear = useCallback(() => setSimulation(null), []);

  return {
    simulation,
    steps: simulation?.steps ?? [],
    isSimulating,
    run,
    reset,
    clear,
  };
}
