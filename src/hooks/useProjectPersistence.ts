import { useState, useCallback, useEffect, Dispatch, SetStateAction } from 'react';
import { Node, Edge } from '@xyflow/react';
import { storageService, Project, ProjectConfig, Scenario, createEmptyProject, generateProjectId } from '../lib/storage';
import { toast } from '../lib/toast';

export type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface PersistenceArgs {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  config: ProjectConfig;
  scenarios: Scenario[];
  /** Apply a loaded project's config to the app state. */
  applyConfig: (config: ProjectConfig) => void;
  /** Restore a loaded project's scenarios into app state. */
  applyScenarios: (scenarios: Scenario[]) => void;
  /** Called whenever a different project becomes active (load/new/import). */
  onProjectSwitched: () => void;
}

/**
 * Owns project lifecycle and persistence: load-on-startup, debounced
 * auto-save, save/rename/export/import, and the current save status.
 */
export function useProjectPersistence({
  nodes,
  edges,
  setNodes,
  setEdges,
  config,
  scenarios,
  applyConfig,
  applyScenarios,
  onProjectSwitched,
}: PersistenceArgs) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  // Build current project object from state
  const buildCurrentProject = useCallback((): Project => {
    const now = new Date().toISOString();
    const projectNodes = nodes.map(node => ({
      id: node.id,
      label: (node.data?.label as string) || 'Untitled',
      initialActivation: (node.data?.initialActivation as number) ?? 0.5,
      activation: (node.data?.activation as number) ?? (node.data?.initialActivation as number) ?? 0.5,
      clamped: (node.data?.clamped as boolean) ?? false,
      position: node.position,
    }));
    const projectEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      weight: (edge.data?.weight as number) ?? 0,
      uncertainty: (edge.data?.uncertainty as number) ?? 0,
    }));

    if (currentProject) {
      return {
        ...currentProject,
        nodes: projectNodes,
        edges: projectEdges,
        nodeCount: projectNodes.length,
        edgeCount: projectEdges.length,
        updatedAt: now,
        config: { ...config },
        scenarios,
      };
    }

    // Create new project if none exists
    return {
      id: generateProjectId(),
      name: 'Untitled Project',
      createdAt: now,
      updatedAt: now,
      nodeCount: projectNodes.length,
      edgeCount: projectEdges.length,
      nodes: projectNodes,
      edges: projectEdges,
      config: { ...config },
      scenarios,
      version: 2,
    };
  }, [nodes, edges, currentProject, config, scenarios]);

  // Save current project
  const saveCurrentProject = useCallback(async (): Promise<Project | null> => {
    setSaveStatus('saving');
    const project = buildCurrentProject();
    const result = await storageService.saveProject(project);

    if (result.success && result.data) {
      setCurrentProject(result.data);
      await storageService.setCurrentProjectId(result.data.id);
      setSaveStatus('saved');
      return result.data;
    } else {
      setSaveStatus('unsaved');
      console.error('Failed to save project:', result.error);
      toast.error(`Could not save project: ${result.error ?? 'unknown error'}`);
      return null;
    }
  }, [buildCurrentProject]);

  // Load project into state
  const loadProject = useCallback((project: Project) => {
    const { nodes: flowNodes, edges: flowEdges } = storageService.projectToNodes(project);
    setNodes(flowNodes);
    setEdges(flowEdges);
    setCurrentProject(project);

    if (project.config) {
      applyConfig(project.config);
    }
    applyScenarios(project.scenarios ?? []);

    onProjectSwitched();
    setSaveStatus('saved');
  }, [setNodes, setEdges, applyConfig, applyScenarios, onProjectSwitched]);

  // Create new empty project
  const createNewProject = useCallback(() => {
    const emptyProject = createEmptyProject();
    setNodes([]);
    setEdges([]);
    setCurrentProject(emptyProject);
    onProjectSwitched();
    setSaveStatus('unsaved');
    // Auto-save the new project immediately
    storageService.saveProject(emptyProject).then(result => {
      if (result.success && result.data) {
        setCurrentProject(result.data);
        storageService.setCurrentProjectId(result.data.id);
        setSaveStatus('saved');
      }
    });
  }, [setNodes, setEdges, onProjectSwitched]);

  // Surface persistence failures (auto-save runs in the background)
  useEffect(() => {
    return storageService.onError((error) => {
      setSaveStatus('unsaved');
      toast.error(`Saving failed: ${error}`);
    });
  }, []);

  // Load last project on startup
  useEffect(() => {
    const loadLastProject = async () => {
      const result = await storageService.loadCurrentProject();
      if (result.success && result.data) {
        loadProject(result.data);
      } else {
        // No existing project, create one from the initial nodes/edges
        const initialProject = buildCurrentProject();
        const saveResult = await storageService.saveProject(initialProject);
        if (saveResult.success && saveResult.data) {
          setCurrentProject(saveResult.data);
          await storageService.setCurrentProjectId(saveResult.data.id);
        }
      }
    };
    loadLastProject();
    // Intentionally mount-only: this restores the last session exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save when nodes/edges/config change (debounced)
  useEffect(() => {
    if (!currentProject) return;

    setSaveStatus('unsaved');
    const project = buildCurrentProject();
    storageService.scheduleAutoSave(project);

    // Update save status when auto-save completes
    const unsubscribe = storageService.onSave(() => {
      setSaveStatus('saved');
    });

    return () => unsubscribe();
    // buildCurrentProject/currentProject are deliberately excluded: re-running
    // on every save would schedule redundant auto-saves. The deps list is the
    // set of user-editable inputs that should trigger an auto-save. `config`
    // is spread into individual fields so a new object identity per render
    // does not retrigger the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    nodes,
    edges,
    scenarios,
    config.activationFunction,
    config.lambda,
    config.maxIterations,
    config.convergenceThreshold,
    config.linguisticScale,
    config.membershipFunction,
    config.theme,
  ]);

  // Rename project
  const renameProject = useCallback(async (newName: string) => {
    if (!currentProject || !newName.trim()) return;

    const updatedProject = { ...currentProject, name: newName.trim() };
    const result = await storageService.saveProject(updatedProject);
    if (result.success && result.data) {
      setCurrentProject(result.data);
    }
  }, [currentProject]);

  // Export current project to file
  const exportProject = useCallback(() => {
    if (!currentProject) return;
    const project = buildCurrentProject();
    storageService.exportToFile(project);
  }, [currentProject, buildCurrentProject]);

  // Import project from file
  const importProjectFile = useCallback(async (file: File) => {
    const result = await storageService.importFromFile(file);
    if (result.success && result.data) {
      loadProject(result.data);
      toast.success(`Imported "${result.data.name}"`);
    } else {
      toast.error(`Import failed: ${result.error ?? 'invalid project file'}`);
    }
  }, [loadProject]);

  return {
    currentProject,
    saveStatus,
    saveCurrentProject,
    loadProject,
    createNewProject,
    renameProject,
    exportProject,
    importProjectFile,
  };
}
