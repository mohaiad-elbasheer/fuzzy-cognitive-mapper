/**
 * IndexedDB Provider - Stores projects in the browser's IndexedDB.
 *
 * Compared to localStorage this removes the ~5MB quota ceiling and avoids
 * blocking the main thread with large JSON.parse/stringify on every access.
 *
 * Database layout:
 * - db "fcm-mapper", version 1
 *   - object store "projects" (keyPath: "id") - full Project objects
 *   - object store "meta" (key: "currentProjectId") - session pointers
 */

import {
  StorageProvider,
  StorageResult,
  Project,
  ProjectMeta,
  PROJECT_VERSION,
} from './types';

const DB_NAME = 'fcm-mapper';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const META_STORE = 'meta';
const CURRENT_KEY = 'currentProjectId';

const openDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
};

/** Run one transaction and resolve with the request's result. */
const withStore = <T>(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = operation(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB operation failed'));
  });
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown IndexedDB error';

export class IndexedDbProvider implements StorageProvider {
  readonly name = 'indexedDB';
  private dbPromise: Promise<IDBDatabase> | null = null;

  get isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb();
    }
    return this.dbPromise;
  }

  async listProjects(): Promise<StorageResult<ProjectMeta[]>> {
    try {
      const db = await this.db();
      const projects = await withStore<Project[]>(db, PROJECTS_STORE, 'readonly', s => s.getAll());

      const metas: ProjectMeta[] = projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        nodeCount: p.nodeCount,
        edgeCount: p.edgeCount,
        thumbnail: p.thumbnail,
      }));

      metas.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return { success: true, data: metas };
    } catch (error) {
      return { success: false, error: `Failed to list projects: ${errorMessage(error)}` };
    }
  }

  async getProject(id: string): Promise<StorageResult<Project>> {
    try {
      const db = await this.db();
      const project = await withStore<Project | undefined>(db, PROJECTS_STORE, 'readonly', s => s.get(id));

      if (!project) {
        return { success: false, error: `Project not found: ${id}` };
      }

      if (project.version !== PROJECT_VERSION) {
        // Migrate project data here when the format changes
        project.version = PROJECT_VERSION;
      }

      return { success: true, data: project };
    } catch (error) {
      return { success: false, error: `Failed to load project: ${errorMessage(error)}` };
    }
  }

  async saveProject(project: Project): Promise<StorageResult<Project>> {
    try {
      project.updatedAt = new Date().toISOString();
      project.nodeCount = project.nodes.length;
      project.edgeCount = project.edges.length;
      project.version = PROJECT_VERSION;

      const db = await this.db();
      await withStore(db, PROJECTS_STORE, 'readwrite', s => s.put(project));

      return { success: true, data: project };
    } catch (error) {
      return { success: false, error: `Failed to save project: ${errorMessage(error)}` };
    }
  }

  async deleteProject(id: string): Promise<StorageResult<void>> {
    try {
      const db = await this.db();
      await withStore(db, PROJECTS_STORE, 'readwrite', s => s.delete(id));

      const currentId = await this.getCurrentProjectId();
      if (currentId === id) {
        await this.setCurrentProjectId(null);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: `Failed to delete project: ${errorMessage(error)}` };
    }
  }

  async getCurrentProjectId(): Promise<string | null> {
    try {
      const db = await this.db();
      const id = await withStore<string | undefined>(db, META_STORE, 'readonly', s => s.get(CURRENT_KEY));
      return id ?? null;
    } catch {
      return null;
    }
  }

  async setCurrentProjectId(id: string | null): Promise<void> {
    const db = await this.db();
    if (id) {
      await withStore(db, META_STORE, 'readwrite', s => s.put(id, CURRENT_KEY));
    } else {
      await withStore(db, META_STORE, 'readwrite', s => s.delete(CURRENT_KEY));
    }
  }
}

// Singleton instance
export const indexedDbProvider = new IndexedDbProvider();
