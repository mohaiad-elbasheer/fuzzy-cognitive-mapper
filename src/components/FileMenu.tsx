import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown,
  FilePlus,
  FolderOpen,
  Upload,
  Save,
  Download,
  Clock,
  FileJson,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { storageService, Project, ProjectMeta } from '../lib/storage';

interface FileMenuProps {
  currentProject: Project | null;
  onNewProject: () => void;
  onOpenProject: (project: Project) => void;
  onSaveProject: () => Promise<Project | null>;
  onExportProject: () => void;
  onImportFile: (file: File) => Promise<void>;
  theme?: 'modern' | 'academic';
}

const FileMenu: React.FC<FileMenuProps> = ({
  currentProject,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportProject,
  onImportFile,
  theme = 'modern',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [recentProjects, setRecentProjects] = useState<ProjectMeta[]>([]);
  const [showRecent, setShowRecent] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadRecent = async () => {
      const result = await storageService.listProjects();
      if (result.success && result.data) {
        setRecentProjects(result.data.slice(0, 5));
      }
    };
    if (isOpen) {
      loadRecent();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowRecent(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenProject = async (id: string) => {
    const result = await storageService.getProject(id);
    if (result.success && result.data) {
      await storageService.setCurrentProjectId(id);
      onOpenProject(result.data);
    }
    setIsOpen(false);
    setShowRecent(false);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImportFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setIsOpen(false);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project?')) {
      await storageService.deleteProject(id);
      const result = await storageService.listProjects();
      if (result.success && result.data) {
        setRecentProjects(result.data.slice(0, 5));
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const menuItemClass = cn(
    "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg",
    theme === 'modern'
      ? "text-white/70 hover:text-white hover:bg-white/10"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  );

  const shortcutClass = cn(
    "ml-auto text-[10px] font-mono",
    theme === 'modern' ? "text-white/30" : "text-slate-400"
  );

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
          isOpen 
            ? (theme === 'modern' ? "bg-white/10 text-white" : "bg-slate-200 text-slate-900")
            : (theme === 'modern' ? "text-white/60 hover:text-white hover:bg-white/5" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100")
        )}
      >
        File
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.fcm.json"
        onChange={handleFileSelect}
        className="hidden"
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute left-0 top-full mt-1 z-50 min-w-[220px] p-1.5 rounded-xl border shadow-xl",
              theme === 'modern' 
                ? "bg-[#0f0f1a] border-white/10" 
                : "bg-white border-slate-200"
            )}
          >
            {/* New Project */}
            <button
              onClick={() => { onNewProject(); setIsOpen(false); }}
              className={menuItemClass}
            >
              <FilePlus className="w-4 h-4" />
              New Project
              <span className={shortcutClass}>Ctrl+N</span>
            </button>

            <div className={cn("my-1 h-px", theme === 'modern' ? "bg-white/5" : "bg-slate-100")} />

            {/* Open Recent - Submenu */}
            <div 
              className="relative"
              onMouseEnter={() => setShowRecent(true)}
              onMouseLeave={() => setShowRecent(false)}
            >
              <button className={cn(menuItemClass, "justify-between")}>
                <span className="flex items-center gap-3">
                  <Clock className="w-4 h-4" />
                  Open Recent
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <AnimatePresence>
                {showRecent && (
                  <motion.div
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -4 }}
                    className={cn(
                      "absolute left-full top-0 ml-1 min-w-[240px] p-1.5 rounded-xl border shadow-xl",
                      theme === 'modern' 
                        ? "bg-[#0f0f1a] border-white/10" 
                        : "bg-white border-slate-200"
                    )}
                  >
                    {recentProjects.length === 0 ? (
                      <div className={cn(
                        "px-3 py-4 text-center text-sm",
                        theme === 'modern' ? "text-white/30" : "text-slate-400"
                      )}>
                        No recent projects
                      </div>
                    ) : (
                      recentProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => handleOpenProject(project.id)}
                          className={cn(
                            menuItemClass,
                            "group",
                            currentProject?.id === project.id && (
                              theme === 'modern' ? "bg-emerald-500/10" : "bg-emerald-50"
                            )
                          )}
                        >
                          <FileJson className="w-4 h-4 shrink-0" />
                          <div className="flex-1 min-w-0 text-left">
                            <div className="truncate">{project.name}</div>
                            <div className={cn(
                              "text-[10px]",
                              theme === 'modern' ? "text-white/30" : "text-slate-400"
                            )}>
                              {project.nodeCount} concepts · {formatDate(project.updatedAt)}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            className={cn(
                              "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                              theme === 'modern'
                                ? "hover:bg-red-500/20 text-red-400"
                                : "hover:bg-red-50 text-red-500"
                            )}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </button>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Open File */}
            <button
              onClick={handleImportClick}
              className={menuItemClass}
            >
              <Upload className="w-4 h-4" />
              Open File...
              <span className={shortcutClass}>Ctrl+O</span>
            </button>

            <div className={cn("my-1 h-px", theme === 'modern' ? "bg-white/5" : "bg-slate-100")} />

            {/* Save */}
            <button
              onClick={() => { onSaveProject(); setIsOpen(false); }}
              className={menuItemClass}
            >
              <Save className="w-4 h-4" />
              Save
              <span className={shortcutClass}>Ctrl+S</span>
            </button>

            {/* Export/Download */}
            <button
              onClick={() => { onExportProject(); setIsOpen(false); }}
              className={menuItemClass}
            >
              <Download className="w-4 h-4" />
              Export as JSON...
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileMenu;
