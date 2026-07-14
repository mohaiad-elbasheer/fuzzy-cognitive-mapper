/**
 * Experiment Store - Manages simulation run storage
 */

import { SimulationRun, generateRunId, ConceptState, SimulationConfig, DEFAULT_SIMULATION_CONFIG } from './types';
import { FCMNode, FCMEdge, SimulationResult } from '../../types';
import { runSimulation } from '../../logic/fcmEngine';

const STORAGE_KEY = 'fcm_experiment_runs';
const MAX_RUNS = 50; // Keep last 50 runs

class ExperimentStore {
  private runs: SimulationRun[] = [];
  private listeners: (() => void)[] = [];
  
  constructor() {
    this.loadFromStorage();
  }
  
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.runs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load experiments:', error);
      this.runs = [];
    }
  }
  
  private saveToStorage(): void {
    try {
      // Keep only last MAX_RUNS
      const toSave = this.runs.slice(-MAX_RUNS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save experiments:', error);
    }
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());
  }
  
  /**
   * Subscribe to changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Get all runs
   */
  getRuns(): SimulationRun[] {
    return [...this.runs].reverse(); // Most recent first
  }
  
  /**
   * Get a specific run
   */
  getRun(id: string): SimulationRun | undefined {
    return this.runs.find(r => r.id === id);
  }
  
  /**
   * Create and save a new simulation run
   */
  createRun(
    nodes: FCMNode[],
    edges: FCMEdge[],
    name: string,
    description?: string,
    config: Partial<SimulationConfig> = {},
    clampedConceptIds?: string[]
  ): SimulationRun {
    const fullConfig: SimulationConfig = { ...DEFAULT_SIMULATION_CONFIG, ...config };
    
    // Build initial state
    const initialState: ConceptState[] = nodes.map(node => ({
      id: node.id,
      label: node.label,
      activation: node.initialActivation,
      initialActivation: node.initialActivation,
    }));
    
    // Run simulation - results is array of {iteration, [nodeId]: activation}
    const results: SimulationResult[] = runSimulation(
      nodes, 
      edges, 
      fullConfig.activationFunction,
      fullConfig.lambda,
      fullConfig.maxIterations,
      fullConfig.convergenceThreshold
    );
    
    // Build history from results - each result is one iteration
    const history: ConceptState[][] = results.map((iterResult) => {
      return nodes.map(node => ({
        id: node.id,
        label: node.label,
        activation: iterResult[node.id] ?? node.initialActivation,
        initialActivation: node.initialActivation,
      }));
    });
    
    // Final state is the last iteration
    const lastResult = results[results.length - 1];
    const finalState: ConceptState[] = nodes.map(node => ({
      id: node.id,
      label: node.label,
      activation: lastResult ? (lastResult[node.id] ?? node.initialActivation) : node.initialActivation,
      initialActivation: node.initialActivation,
    }));
    
    // Check convergence - if we have fewer iterations than max, it converged
    const converged = results.length < fullConfig.maxIterations;
    
    const run: SimulationRun = {
      id: generateRunId(),
      name,
      description,
      createdAt: new Date().toISOString(),
      config: fullConfig,
      initialState,
      history,
      finalState,
      converged,
      iterations: results.length,
      clampedConcepts: clampedConceptIds,
    };
    
    this.runs.push(run);
    this.saveToStorage();
    this.notifyListeners();
    
    return run;
  }
  
  /**
   * Delete a run
   */
  deleteRun(id: string): void {
    this.runs = this.runs.filter(r => r.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }
  
  /**
   * Delete multiple runs
   */
  deleteRuns(ids: string[]): void {
    this.runs = this.runs.filter(r => !ids.includes(r.id));
    this.saveToStorage();
    this.notifyListeners();
  }
  
  /**
   * Rename a run
   */
  renameRun(id: string, name: string, description?: string): void {
    const run = this.runs.find(r => r.id === id);
    if (run) {
      run.name = name;
      if (description !== undefined) run.description = description;
      this.saveToStorage();
      this.notifyListeners();
    }
  }
  
  /**
   * Export runs as JSON
   */
  exportRuns(ids: string[]): string {
    const toExport = this.runs.filter(r => ids.includes(r.id));
    return JSON.stringify(toExport, null, 2);
  }
  
  /**
   * Export runs as CSV
   */
  exportRunsCSV(ids: string[]): string {
    const toExport = this.runs.filter(r => ids.includes(r.id));
    if (toExport.length === 0) return '';
    
    // Header
    const conceptIds = toExport[0].finalState.map(c => c.id);
    const conceptLabels = toExport[0].finalState.map(c => c.label);
    
    let csv = 'Run Name,Created,Converged,Iterations,' + conceptLabels.join(',') + '\n';
    
    // Data rows
    for (const run of toExport) {
      const values = conceptIds.map(id => {
        const concept = run.finalState.find(c => c.id === id);
        return concept?.activation.toFixed(4) ?? '';
      });
      csv += `"${run.name}",${run.createdAt},${run.converged},${run.iterations},${values.join(',')}\n`;
    }
    
    return csv;
  }
  
  /**
   * Clear all runs
   */
  clearAll(): void {
    this.runs = [];
    this.saveToStorage();
    this.notifyListeners();
  }
}

// Singleton instance
export const experimentStore = new ExperimentStore();
