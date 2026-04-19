/**
 * Storage Service - Main API for project persistence
 * 
 * This service wraps storage providers and adds:
 * - Auto-save functionality
 * - Project conversion utilities
 * - Export/Import helpers
 * - Event callbacks for UI updates
 * 
 * Designed for easy backend swapping:
 *   storageService.setProvider(firebaseProvider)
 */

import { Node, Edge } from '@xyflow/react';
import { 
  StorageProvider, 
  StorageResult, 
  Project, 
  ProjectMeta,
  ProjectNode,
  ProjectEdge,
  ProjectConfig,
  createEmptyProject,
  DEFAULT_PROJECT_CONFIG,
} from './types';
import { localStorageProvider } from './localStorageProvider';
import { FCMNode, FCMEdge, SimulationResult } from '../../types';

// Re-export types for convenience
export * from './types';

type SaveCallback = (project: Project) => void;
type ErrorCallback = (error: string) => void;

class StorageService {
  private provider: StorageProvider;
  private autoSaveInterval: number | null = null;
  private autoSaveDelay: number = 5000; // 5 seconds
  private pendingSave: Project | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  
  private onSaveCallbacks: SaveCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];

  constructor(provider: StorageProvider = localStorageProvider) {
    this.provider = provider;
  }

  /**
   * Switch to a different storage provider (for future cloud integration)
   */
  setProvider(provider: StorageProvider): void {
    this.provider = provider;
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { name: string; isAvailable: boolean } {
    return {
      name: this.provider.name,
      isAvailable: this.provider.isAvailable,
    };
  }

  // ============================================================
  // Project CRUD Operations
  // ============================================================

  async listProjects(): Promise<StorageResult<ProjectMeta[]>> {
    return this.provider.listProjects();
  }

  async getProject(id: string): Promise<StorageResult<Project>> {
    return this.provider.getProject(id);
  }

  async saveProject(project: Project): Promise<StorageResult<Project>> {
    const result = await this.provider.saveProject(project);
    
    if (result.success && result.data) {
      this.notifySave(result.data);
    } else if (!result.success && result.error) {
      this.notifyError(result.error);
    }
    
    return result;
  }

  async deleteProject(id: string): Promise<StorageResult<void>> {
    return this.provider.deleteProject(id);
  }

  async createProject(name?: string): Promise<StorageResult<Project>> {
    const project = createEmptyProject(name);
    return this.saveProject(project);
  }

  // ============================================================
  // Current Project Management
  // ============================================================

  async getCurrentProjectId(): Promise<string | null> {
    return this.provider.getCurrentProjectId();
  }

  async setCurrentProjectId(id: string | null): Promise<void> {
    return this.provider.setCurrentProjectId(id);
  }

  async loadCurrentProject(): Promise<StorageResult<Project | null>> {
    const currentId = await this.getCurrentProjectId();
    
    if (!currentId) {
      return { success: true, data: null };
    }
    
    return this.getProject(currentId);
  }

  // ============================================================
  // Auto-Save Functionality
  // ============================================================

  /**
   * Schedule an auto-save (debounced)
   */
  scheduleAutoSave(project: Project): void {
    this.pendingSave = project;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(async () => {
      if (this.pendingSave) {
        await this.saveProject(this.pendingSave);
        this.pendingSave = null;
      }
    }, this.autoSaveDelay);
  }

  /**
   * Force immediate save of pending changes
   */
  async flushPendingSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    if (this.pendingSave) {
      await this.saveProject(this.pendingSave);
      this.pendingSave = null;
    }
  }

  /**
   * Set auto-save delay in milliseconds
   */
  setAutoSaveDelay(ms: number): void {
    this.autoSaveDelay = ms;
  }

  // ============================================================
  // Conversion Utilities (React Flow ↔ Project format)
  // ============================================================

  /**
   * Convert React Flow nodes/edges to Project format
   */
  nodesToProject(
    nodes: Node[],
    edges: Edge[],
    config: Partial<ProjectConfig> = {}
  ): { nodes: ProjectNode[]; edges: ProjectEdge[]; config: ProjectConfig } {
    const projectNodes: ProjectNode[] = nodes.map(node => ({
      id: node.id,
      label: (node.data?.label as string) || 'Untitled',
      initialActivation: (node.data?.initialActivation as number) ?? 0.5,
      activation: (node.data?.activation as number) ?? (node.data?.initialActivation as number) ?? 0.5,
      position: node.position,
    }));

    const projectEdges: ProjectEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data?.weight as number) ?? 0,
    }));

    return {
      nodes: projectNodes,
      edges: projectEdges,
      config: { ...DEFAULT_PROJECT_CONFIG, ...config },
    };
  }

  /**
   * Convert Project format to React Flow nodes/edges
   */
  projectToNodes(project: Project): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = project.nodes.map(node => ({
      id: node.id,
      type: 'fcm',
      position: node.position,
      data: {
        label: node.label,
        initialActivation: node.initialActivation,
        activation: node.activation,
      },
    }));

    const edges: Edge[] = project.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'fcm',
      data: { weight: edge.weight },
      animated: true,
    }));

    return { nodes, edges };
  }

  /**
   * Convert FCMNode/FCMEdge arrays to Project format
   */
  fcmToProject(
    nodes: FCMNode[],
    edges: FCMEdge[],
    config: Partial<ProjectConfig> = {}
  ): { nodes: ProjectNode[]; edges: ProjectEdge[]; config: ProjectConfig } {
    const projectNodes: ProjectNode[] = nodes.map((node, index) => ({
      id: node.id,
      label: node.label,
      initialActivation: node.initialActivation,
      activation: node.activation,
      position: node.x !== undefined && node.y !== undefined 
        ? { x: node.x, y: node.y }
        : { x: 100 + (index % 3) * 250, y: 100 + Math.floor(index / 3) * 200 },
    }));

    const projectEdges: ProjectEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }));

    return {
      nodes: projectNodes,
      edges: projectEdges,
      config: { ...DEFAULT_PROJECT_CONFIG, ...config },
    };
  }

  // ============================================================
  // Export/Import (File-based)
  // ============================================================

  /**
   * Export project to downloadable JSON file
   */
  exportToFile(project: Project, filename?: string): void {
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${project.name.replace(/[^a-z0-9]/gi, '_')}.fcm.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import project from JSON file
   */
  async importFromFile(file: File): Promise<StorageResult<Project>> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const project: Project = JSON.parse(content);
          
          // Validate basic structure
          if (!project.nodes || !project.edges) {
            resolve({ success: false, error: 'Invalid project file: missing nodes or edges' });
            return;
          }
          
          // Generate new ID to avoid conflicts
          project.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          project.name = `${project.name} (Imported)`;
          project.createdAt = new Date().toISOString();
          project.updatedAt = new Date().toISOString();
          
          // Save to storage
          const result = await this.saveProject(project);
          resolve(result);
        } catch (error) {
          resolve({ 
            success: false, 
            error: `Failed to parse file: ${error instanceof Error ? error.message : 'Invalid JSON'}` 
          });
        }
      };
      
      reader.onerror = () => {
        resolve({ success: false, error: 'Failed to read file' });
      };
      
      reader.readAsText(file);
    });
  }

  // ============================================================
  // Event Callbacks
  // ============================================================

  onSave(callback: SaveCallback): () => void {
    this.onSaveCallbacks.push(callback);
    return () => {
      this.onSaveCallbacks = this.onSaveCallbacks.filter(cb => cb !== callback);
    };
  }

  onError(callback: ErrorCallback): () => void {
    this.onErrorCallbacks.push(callback);
    return () => {
      this.onErrorCallbacks = this.onErrorCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifySave(project: Project): void {
    this.onSaveCallbacks.forEach(cb => cb(project));
  }

  private notifyError(error: string): void {
    this.onErrorCallbacks.forEach(cb => cb(error));
  }
}

// Singleton instance
export const storageService = new StorageService();
