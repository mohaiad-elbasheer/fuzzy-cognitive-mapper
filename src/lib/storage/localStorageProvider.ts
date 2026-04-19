/**
 * LocalStorage Provider - Stores projects in browser localStorage
 * 
 * Storage structure:
 * - fcm_projects_index: string[] (list of project IDs)
 * - fcm_project_{id}: Project (full project data)
 * - fcm_current_project: string (current project ID)
 */

import { 
  StorageProvider, 
  StorageResult, 
  Project, 
  ProjectMeta,
  PROJECT_VERSION 
} from './types';

const STORAGE_KEYS = {
  INDEX: 'fcm_projects_index',
  PROJECT_PREFIX: 'fcm_project_',
  CURRENT: 'fcm_current_project',
} as const;

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'localStorage';
  
  get isAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async listProjects(): Promise<StorageResult<ProjectMeta[]>> {
    try {
      const indexJson = localStorage.getItem(STORAGE_KEYS.INDEX);
      const projectIds: string[] = indexJson ? JSON.parse(indexJson) : [];
      
      const projects: ProjectMeta[] = [];
      
      for (const id of projectIds) {
        const projectJson = localStorage.getItem(STORAGE_KEYS.PROJECT_PREFIX + id);
        if (projectJson) {
          const project: Project = JSON.parse(projectJson);
          // Extract only metadata for listing
          projects.push({
            id: project.id,
            name: project.name,
            description: project.description,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            nodeCount: project.nodeCount,
            edgeCount: project.edgeCount,
            thumbnail: project.thumbnail,
          });
        }
      }
      
      // Sort by updatedAt descending (most recent first)
      projects.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      return { success: true, data: projects };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to list projects: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getProject(id: string): Promise<StorageResult<Project>> {
    try {
      const projectJson = localStorage.getItem(STORAGE_KEYS.PROJECT_PREFIX + id);
      
      if (!projectJson) {
        return { success: false, error: `Project not found: ${id}` };
      }
      
      const project: Project = JSON.parse(projectJson);
      
      // Version migration if needed (for future use)
      if (project.version !== PROJECT_VERSION) {
        // Migrate project data here when version changes
        project.version = PROJECT_VERSION;
      }
      
      return { success: true, data: project };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async saveProject(project: Project): Promise<StorageResult<Project>> {
    try {
      // Update metadata
      project.updatedAt = new Date().toISOString();
      project.nodeCount = project.nodes.length;
      project.edgeCount = project.edges.length;
      project.version = PROJECT_VERSION;
      
      // Save project
      localStorage.setItem(
        STORAGE_KEYS.PROJECT_PREFIX + project.id, 
        JSON.stringify(project)
      );
      
      // Update index
      const indexJson = localStorage.getItem(STORAGE_KEYS.INDEX);
      const projectIds: string[] = indexJson ? JSON.parse(indexJson) : [];
      
      if (!projectIds.includes(project.id)) {
        projectIds.push(project.id);
        localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(projectIds));
      }
      
      return { success: true, data: project };
    } catch (error) {
      // Check if quota exceeded
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return { 
          success: false, 
          error: 'Storage quota exceeded. Please delete some projects or export and remove old ones.' 
        };
      }
      return { 
        success: false, 
        error: `Failed to save project: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async deleteProject(id: string): Promise<StorageResult<void>> {
    try {
      // Remove project data
      localStorage.removeItem(STORAGE_KEYS.PROJECT_PREFIX + id);
      
      // Update index
      const indexJson = localStorage.getItem(STORAGE_KEYS.INDEX);
      const projectIds: string[] = indexJson ? JSON.parse(indexJson) : [];
      const newIndex = projectIds.filter(pid => pid !== id);
      localStorage.setItem(STORAGE_KEYS.INDEX, JSON.stringify(newIndex));
      
      // Clear current if this was the current project
      const currentId = await this.getCurrentProjectId();
      if (currentId === id) {
        await this.setCurrentProjectId(null);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete project: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  async getCurrentProjectId(): Promise<string | null> {
    return localStorage.getItem(STORAGE_KEYS.CURRENT);
  }

  async setCurrentProjectId(id: string | null): Promise<void> {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.CURRENT, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT);
    }
  }
}

// Singleton instance
export const localStorageProvider = new LocalStorageProvider();
