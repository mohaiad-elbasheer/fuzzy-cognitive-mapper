/**
 * Storage Module - Project persistence layer
 * 
 * Usage:
 *   import { storageService, Project } from '@/lib/storage';
 *   
 *   // List all projects
 *   const { data: projects } = await storageService.listProjects();
 *   
 *   // Save current work
 *   await storageService.saveProject(project);
 *   
 *   // Export to file
 *   storageService.exportToFile(project);
 * 
 * Future: To switch to cloud storage:
 *   import { firebaseProvider } from './firebaseProvider';
 *   storageService.setProvider(firebaseProvider);
 */

export * from './types';
export * from './storageService';
export { localStorageProvider } from './localStorageProvider';
