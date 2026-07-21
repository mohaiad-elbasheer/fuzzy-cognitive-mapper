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
import { indexedDbProvider } from './indexedDbProvider';
import { FCMNode, FCMEdge } from '../../types';

// Re-export types for convenience
export * from './types';

type SaveCallback = (project: Project) => void;
type ErrorCallback = (error: string) => void;

class StorageService {
  private provider: StorageProvider;
  private autoSaveDelay: number = 5000; // 5 seconds
  private pendingSave: Project | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Resolves once the best available provider has been selected (and any
   * one-time localStorage → IndexedDB migration has finished). Every data
   * operation awaits this so reads/writes never race the migration.
   */
  private ready: Promise<void>;

  private onSaveCallbacks: SaveCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];

  constructor(provider?: StorageProvider) {
    if (provider) {
      this.provider = provider;
      this.ready = Promise.resolve();
    } else {
      this.provider = localStorageProvider;
      this.ready = this.initBestProvider();
    }
  }

  /**
   * Prefer IndexedDB (no ~5MB quota, no main-thread JSON churn); migrate any
   * existing localStorage projects into it once. Falls back to localStorage
   * when IndexedDB is unavailable (e.g. some private-browsing modes).
   */
  private async initBestProvider(): Promise<void> {
    if (!indexedDbProvider.isAvailable) return;

    try {
      await this.migrateLocalStorageToIndexedDb();
      this.provider = indexedDbProvider;
    } catch (error) {
      console.warn('IndexedDB unavailable, staying on localStorage:', error);
    }
  }

  private async migrateLocalStorageToIndexedDb(): Promise<void> {
    if (!localStorageProvider.isAvailable) {
      // Nothing to migrate; still verify IndexedDB actually works
      await indexedDbProvider.listProjects();
      return;
    }

    const existing = await indexedDbProvider.listProjects();
    if (!existing.success) throw new Error(existing.error);
    const existingIds = new Set((existing.data ?? []).map(p => p.id));

    const local = await localStorageProvider.listProjects();
    for (const meta of local.data ?? []) {
      if (existingIds.has(meta.id)) continue;
      const project = await localStorageProvider.getProject(meta.id);
      if (project.success && project.data) {
        await indexedDbProvider.saveProject(project.data);
      }
    }

    // Carry over the current-project pointer on first migration.
    // localStorage data is intentionally left in place as a backup.
    const idbCurrent = await indexedDbProvider.getCurrentProjectId();
    if (!idbCurrent) {
      const localCurrent = await localStorageProvider.getCurrentProjectId();
      if (localCurrent) await indexedDbProvider.setCurrentProjectId(localCurrent);
    }
  }

  /**
   * Switch to a different storage provider (for future cloud integration)
   */
  setProvider(provider: StorageProvider): void {
    this.provider = provider;
    this.ready = Promise.resolve();
  }

  /**
   * Get current provider info
   */
  async getProviderInfo(): Promise<{ name: string; isAvailable: boolean }> {
    await this.ready;
    return {
      name: this.provider.name,
      isAvailable: this.provider.isAvailable,
    };
  }

  // ============================================================
  // Project CRUD Operations
  // ============================================================

  async listProjects(): Promise<StorageResult<ProjectMeta[]>> {
    await this.ready;
    return this.provider.listProjects();
  }

  async getProject(id: string): Promise<StorageResult<Project>> {
    await this.ready;
    return this.provider.getProject(id);
  }

  async saveProject(project: Project): Promise<StorageResult<Project>> {
    await this.ready;
    const result = await this.provider.saveProject(project);
    
    if (result.success && result.data) {
      this.notifySave(result.data);
    } else if (!result.success && result.error) {
      this.notifyError(result.error);
    }
    
    return result;
  }

  async deleteProject(id: string): Promise<StorageResult<void>> {
    await this.ready;
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
    await this.ready;
    return this.provider.getCurrentProjectId();
  }

  async setCurrentProjectId(id: string | null): Promise<void> {
    await this.ready;
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
      clamped: (node.data?.clamped as boolean) ?? false,
      position: node.position,
    }));

    const projectEdges: ProjectEdge[] = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data?.weight as number) ?? 0,
      uncertainty: (edge.data?.uncertainty as number) ?? 0,
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
        clamped: node.clamped ?? false,
      },
    }));

    const edges: Edge[] = project.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'fcm',
      data: { weight: edge.weight, uncertainty: edge.uncertainty ?? 0 },
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
