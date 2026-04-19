import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Clock, 
  FileJson,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  MoreVertical,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  storageService, 
  Project, 
  ProjectMeta,
} from '../lib/storage';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  onLoadProject: (project: Project) => void;
  onNewProject: () => void;
  onSaveCurrentProject: () => Promise<Project | null>;
  theme?: 'modern' | 'academic';
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  isOpen,
  onClose,
  currentProject,
  onLoadProject,
  onNewProject,
  onSaveCurrentProject,
  theme = 'modern',
}) => {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load projects list
  const loadProjects = async () => {
    setLoading(true);
    const result = await storageService.listProjects();
    if (result.success && result.data) {
      setProjects(result.data);
    } else {
      setError(result.error || 'Failed to load projects');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleOpenProject = async (id: string) => {
    setLoading(true);
    const result = await storageService.getProject(id);
    if (result.success && result.data) {
      await storageService.setCurrentProjectId(id);
      onLoadProject(result.data);
      onClose();
    } else {
      setError(result.error || 'Failed to load project');
    }
    setLoading(false);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    const result = await storageService.deleteProject(id);
    if (result.success) {
      setSuccess('Project deleted');
      loadProjects();
    } else {
      setError(result.error || 'Failed to delete project');
    }
    setLoading(false);
    setMenuOpenId(null);
  };

  const handleExportProject = async (id: string) => {
    const result = await storageService.getProject(id);
    if (result.success && result.data) {
      storageService.exportToFile(result.data);
      setSuccess('Project exported');
    } else {
      setError(result.error || 'Failed to export project');
    }
    setMenuOpenId(null);
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const result = await storageService.importFromFile(file);
    if (result.success) {
      setSuccess('Project imported successfully');
      loadProjects();
    } else {
      setError(result.error || 'Failed to import project');
    }
    setLoading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNewProject = async () => {
    // Save current project first if there are unsaved changes
    if (currentProject) {
      await onSaveCurrentProject();
    }
    onNewProject();
    onClose();
  };

  const handleRenameProject = async (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null);
      return;
    }
    
    const result = await storageService.getProject(id);
    if (result.success && result.data) {
      result.data.name = newName.trim();
      await storageService.saveProject(result.data);
      loadProjects();
    }
    setEditingId(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className={cn(
          "absolute inset-0",
          theme === 'modern' ? "bg-black/80" : "bg-black/50"
        )} />
        
        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative w-full max-w-2xl max-h-[80vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col",
            theme === 'modern' 
              ? "bg-[#0a0a14] border-white/10" 
              : "bg-white border-slate-200"
          )}
        >
          {/* Header */}
          <div className={cn(
            "p-6 border-b flex items-center justify-between shrink-0",
            theme === 'modern' ? "border-white/5" : "border-slate-100"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border",
                theme === 'modern' 
                  ? "bg-emerald-500/10 border-emerald-500/20" 
                  : "bg-emerald-50 border-emerald-200"
              )}>
                <FolderOpen className={cn(
                  "w-5 h-5",
                  theme === 'modern' ? "text-emerald-400" : "text-emerald-600"
                )} />
              </div>
              <div>
                <h2 className={cn(
                  "text-lg font-black uppercase tracking-tighter",
                  theme === 'modern' ? "text-white" : "text-slate-900"
                )}>Projects</h2>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  theme === 'modern' ? "text-white/30" : "text-slate-400"
                )}>
                  {projects.length} saved project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-2 rounded-xl border transition-all",
                  theme === 'modern'
                    ? "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                    : "border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
                title="Import Project"
              >
                <Upload className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.fcm.json"
                onChange={handleImportProject}
                className="hidden"
              />
              
              <button
                onClick={handleNewProject}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  theme === 'modern'
                    ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
              >
                <Plus className="w-4 h-4" />
                New Project
              </button>
              
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  theme === 'modern'
                    ? "text-white/40 hover:text-white hover:bg-white/5"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {(error || success) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                  "px-6 py-3 flex items-center gap-2 border-b",
                  error 
                    ? (theme === 'modern' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600")
                    : (theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")
                )}
              >
                {error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                <span className="text-xs font-medium">{error || success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Project List */}
          <div className="flex-1 min-h-0 overflow-auto p-6 custom-scrollbar">
            {loading && projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className={cn(
                  "w-8 h-8 animate-spin",
                  theme === 'modern' ? "text-white/20" : "text-slate-300"
                )} />
                <p className={cn(
                  "text-sm",
                  theme === 'modern' ? "text-white/40" : "text-slate-400"
                )}>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-12">
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center border",
                  theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                )}>
                  <FileJson className={cn(
                    "w-8 h-8",
                    theme === 'modern' ? "text-white/20" : "text-slate-300"
                  )} />
                </div>
                <div className="text-center">
                  <p className={cn(
                    "font-bold mb-1",
                    theme === 'modern' ? "text-white/60" : "text-slate-600"
                  )}>No saved projects</p>
                  <p className={cn(
                    "text-sm",
                    theme === 'modern' ? "text-white/30" : "text-slate-400"
                  )}>Create a new project or import an existing one</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className={cn(
                      "group relative p-4 rounded-2xl border transition-all cursor-pointer",
                      theme === 'modern'
                        ? "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                        : "bg-slate-50 border-slate-100 hover:bg-slate-100 hover:border-slate-200",
                      currentProject?.id === project.id && (
                        theme === 'modern'
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-emerald-200 bg-emerald-50"
                      )
                    )}
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {editingId === project.id ? (
                          <input
                            autoFocus
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleRenameProject(project.id, editingName)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameProject(project.id, editingName);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                              "w-full px-2 py-1 rounded-lg text-sm font-bold outline-none",
                              theme === 'modern'
                                ? "bg-white/10 text-white border border-emerald-500/50"
                                : "bg-white text-slate-900 border border-emerald-500"
                            )}
                          />
                        ) : (
                          <h3 className={cn(
                            "font-bold truncate",
                            theme === 'modern' ? "text-white" : "text-slate-900"
                          )}>
                            {project.name}
                          </h3>
                        )}
                        
                        <div className={cn(
                          "flex items-center gap-4 mt-2 text-[10px] uppercase tracking-widest",
                          theme === 'modern' ? "text-white/30" : "text-slate-400"
                        )}>
                          <span>{project.nodeCount} concepts</span>
                          <span>{project.edgeCount} links</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(project.updatedAt)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Current project indicator */}
                      {currentProject?.id === project.id && (
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                          theme === 'modern'
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-emerald-100 text-emerald-700"
                        )}>
                          Current
                        </span>
                      )}
                      
                      {/* Actions Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === project.id ? null : project.id);
                          }}
                          className={cn(
                            "p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all",
                            theme === 'modern'
                              ? "hover:bg-white/10 text-white/40 hover:text-white"
                              : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          )}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        <AnimatePresence>
                          {menuOpenId === project.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={cn(
                                "absolute right-0 top-full mt-1 z-10 py-1 rounded-xl border shadow-xl min-w-[140px]",
                                theme === 'modern'
                                  ? "bg-[#0a0a14] border-white/10"
                                  : "bg-white border-slate-200"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => {
                                  setEditingId(project.id);
                                  setEditingName(project.name);
                                  setMenuOpenId(null);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                                  theme === 'modern'
                                    ? "text-white/60 hover:text-white hover:bg-white/5"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                )}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              <button
                                onClick={() => handleExportProject(project.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                                  theme === 'modern'
                                    ? "text-white/60 hover:text-white hover:bg-white/5"
                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                                )}
                              >
                                <Download className="w-3.5 h-3.5" />
                                Export
                              </button>
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                                  theme === 'modern'
                                    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                    : "text-red-600 hover:text-red-700 hover:bg-red-50"
                                )}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "p-4 border-t text-center",
            theme === 'modern' ? "border-white/5" : "border-slate-100"
          )}>
            <p className={cn(
              "text-[10px] uppercase tracking-widest",
              theme === 'modern' ? "text-white/20" : "text-slate-400"
            )}>
              Projects are saved locally in your browser
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectManager;
