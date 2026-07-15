import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Download,
  CheckSquare,
  Square,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit3,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SimulationRun } from '../../lib/experiments';
import { ExperimentTheme } from './shared';

interface RunsSidebarProps {
  runs: SimulationRun[];
  selectedRunIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onExportCSV: () => void;
  onNewRun: () => void;
  onRenameRun: (id: string, name: string) => void;
  theme: ExperimentTheme;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const RunsSidebar: React.FC<RunsSidebarProps> = ({
  runs,
  selectedRunIds,
  onToggleSelect,
  onSelectAll,
  onDeleteSelected,
  onExportCSV,
  onNewRun,
  onRenameRun,
  theme,
}) => {
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const commitRename = (id: string) => {
    onRenameRun(id, editingName);
    setEditingRunId(null);
  };

  return (
    <div className={cn(
      "w-72 border-r flex flex-col shrink-0",
      theme === 'modern' ? "bg-[#0a0a14] border-white/5" : "bg-white border-slate-200"
    )}>
      {/* Header */}
      <div className={cn(
        "p-4 border-b",
        theme === 'modern' ? "border-white/5" : "border-slate-100"
      )}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={cn(
            "text-sm font-bold uppercase tracking-wider",
            theme === 'modern' ? "text-white/80" : "text-slate-700"
          )}>
            Simulation Runs
          </h3>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            theme === 'modern' ? "bg-white/10 text-white/50" : "bg-slate-100 text-slate-500"
          )}>
            {runs.length}
          </span>
        </div>

        <button
          onClick={onNewRun}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
            theme === 'modern'
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
          )}
        >
          <Plus className="w-4 h-4" />
          New Run
        </button>
      </div>

      {/* Run List */}
      <div className="flex-1 overflow-auto p-2 space-y-1">
        {runs.length === 0 ? (
          <div className={cn(
            "text-center py-8 px-4",
            theme === 'modern' ? "text-white/30" : "text-slate-400"
          )}>
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No simulation runs yet</p>
            <p className="text-xs mt-1">Click "New Run" to create one</p>
          </div>
        ) : (
          runs.map(run => (
            <div
              key={run.id}
              className={cn(
                "group p-3 rounded-lg border transition-all cursor-pointer",
                selectedRunIds.has(run.id)
                  ? (theme === 'modern'
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-emerald-50 border-emerald-200")
                  : (theme === 'modern'
                      ? "bg-white/5 border-white/5 hover:bg-white/10"
                      : "bg-slate-50 border-slate-100 hover:bg-slate-100")
              )}
              onClick={() => onToggleSelect(run.id)}
            >
              <div className="flex items-start gap-2">
                <div className="pt-0.5">
                  {selectedRunIds.has(run.id) ? (
                    <CheckSquare className={cn(
                      "w-4 h-4",
                      theme === 'modern' ? "text-emerald-400" : "text-emerald-600"
                    )} />
                  ) : (
                    <Square className={cn(
                      "w-4 h-4",
                      theme === 'modern' ? "text-white/20" : "text-slate-300"
                    )} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {editingRunId === run.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename(run.id);
                          if (e.key === 'Escape') setEditingRunId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className={cn(
                          "flex-1 px-1.5 py-0.5 text-sm rounded outline-none",
                          theme === 'modern'
                            ? "bg-white/10 text-white border border-emerald-500/50"
                            : "bg-white text-slate-900 border border-emerald-500"
                        )}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); commitRename(run.id); }}
                        className="p-0.5 text-emerald-500"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "text-sm font-semibold truncate",
                        theme === 'modern' ? "text-white/90" : "text-slate-800"
                      )}>
                        {run.name}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingRunId(run.id);
                          setEditingName(run.name);
                        }}
                        className={cn(
                          "p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                          theme === 'modern' ? "hover:bg-white/10 text-white/40" : "hover:bg-slate-200 text-slate-400"
                        )}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <div className={cn(
                    "flex items-center gap-2 mt-1 text-xs",
                    theme === 'modern' ? "text-white/40" : "text-slate-400"
                  )}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(run.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      {run.converged ? (
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      )}
                      {run.iterations} iter
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      {runs.length > 0 && (
        <div className={cn(
          "p-3 border-t flex items-center gap-2",
          theme === 'modern' ? "border-white/5" : "border-slate-100"
        )}>
          <button
            onClick={onSelectAll}
            className={cn(
              "p-2 rounded-lg text-xs transition-all",
              theme === 'modern'
                ? "text-white/40 hover:text-white hover:bg-white/10"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            )}
            title="Select All"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
          <button
            onClick={onDeleteSelected}
            disabled={selectedRunIds.size === 0}
            className={cn(
              "p-2 rounded-lg text-xs transition-all",
              selectedRunIds.size === 0 ? "opacity-30 cursor-not-allowed" : "",
              theme === 'modern'
                ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
                : "text-red-500 hover:text-red-600 hover:bg-red-50"
            )}
            title="Delete Selected"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onExportCSV}
            className={cn(
              "p-2 rounded-lg text-xs transition-all",
              theme === 'modern'
                ? "text-white/40 hover:text-white hover:bg-white/10"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            )}
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RunsSidebar;
