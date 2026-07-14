/**
 * Storage Types - Data models for project persistence
 * Designed for scalability: same types work with localStorage, IndexedDB, or cloud storage
 */

import { LinguisticScalePreset, MembershipFunctionType, ActivationFunction } from '../../types';

/**
 * Project metadata - lightweight info for project listings
 */
export interface ProjectMeta {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  edgeCount: number;
  thumbnail?: string; // Base64 encoded small preview image
}

/**
 * Full project data - complete state for save/load
 */
export interface Project extends ProjectMeta {
  // Graph data
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  
  // Configuration
  config: ProjectConfig;
  
  // Simulation results (optional - can be large)
  lastSimulationResults?: SimulationSnapshot[];
  
  // Version for future migrations
  version: number;
}

/**
 * Node with position data for React Flow
 */
export interface ProjectNode {
  id: string;
  label: string;
  initialActivation: number;
  activation: number;
  position: { x: number; y: number };
}

/**
 * Edge data
 */
export interface ProjectEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
}

/**
 * Project configuration
 */
export interface ProjectConfig {
  activationFunction: ActivationFunction;
  lambda: number;
  linguisticScale: LinguisticScalePreset;
  membershipFunction: MembershipFunctionType;
  theme: 'modern' | 'academic';
}

/**
 * Simulation snapshot for history
 */
export interface SimulationSnapshot {
  timestamp: string;
  iterations: number;
  results: Record<string, number>[];
}

/**
 * Storage operation result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Storage provider interface - implement this for different backends
 * This abstraction allows swapping localStorage → IndexedDB → Firebase → etc.
 */
export interface StorageProvider {
  // Project operations
  listProjects(): Promise<StorageResult<ProjectMeta[]>>;
  getProject(id: string): Promise<StorageResult<Project>>;
  saveProject(project: Project): Promise<StorageResult<Project>>;
  deleteProject(id: string): Promise<StorageResult<void>>;
  
  // Quick access for auto-save (current session)
  getCurrentProjectId(): Promise<string | null>;
  setCurrentProjectId(id: string | null): Promise<void>;
  
  // Provider info
  readonly name: string;
  readonly isAvailable: boolean;
}

/**
 * Default project configuration
 */
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  activationFunction: 'sigmoid',
  lambda: 1,
  linguisticScale: '9-point',
  membershipFunction: 'triangular',
  theme: 'modern',
};

/**
 * Current project data version (for future migrations)
 */
export const PROJECT_VERSION = 1;

/**
 * Generate a unique project ID
 */
export const generateProjectId = (): string => {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create a new empty project
 */
export const createEmptyProject = (name: string = 'Untitled Project'): Project => {
  const now = new Date().toISOString();
  return {
    id: generateProjectId(),
    name,
    createdAt: now,
    updatedAt: now,
    nodeCount: 0,
    edgeCount: 0,
    nodes: [],
    edges: [],
    config: { ...DEFAULT_PROJECT_CONFIG },
    version: PROJECT_VERSION,
  };
};
