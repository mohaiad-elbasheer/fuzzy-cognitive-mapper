import React, { useState, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Plus, Trash2, Info, ArrowRight, Settings2, Languages, Hash, ChevronDown, Download, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { LinguisticTerm, LINGUISTIC_TERMS, FCMNode, FCMEdge } from '../types';
import { matrixToCSV, parseMatrixCSV } from '../lib/csv';

interface MatrixEditorProps {
  nodes: Node[];
  edges: Edge[];
  onUpdateWeight: (sourceId: string, targetId: string, weight: number) => void;
  onUpdateNode: (nodeId: string, updates: any) => void;
  onAddNode: () => void;
  onDeleteNode: (nodeId: string) => void;
  onImportData?: (nodes: FCMNode[], edges: FCMEdge[]) => void;
  linguisticTerms?: LinguisticTerm[];
  theme?: 'modern' | 'academic';
}

const MatrixEditor: React.FC<MatrixEditorProps> = ({
  nodes,
  edges,
  onUpdateWeight,
  onUpdateNode,
  onAddNode,
  onDeleteNode,
  onImportData,
  linguisticTerms = LINGUISTIC_TERMS,
  theme = 'modern',
}) => {
  const [inputMode, setInputMode] = useState<'numeric' | 'linguistic'>('numeric');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const fcmNodes: FCMNode[] = nodes.map(n => ({
      id: n.id,
      label: (n.data?.label as string) || 'Untitled',
      activation: (n.data?.activation as number) ?? 0.5,
      initialActivation: (n.data?.initialActivation as number) ?? 0.5,
    }));
    const fcmEdges: FCMEdge[] = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: (e.data?.weight as number) ?? 0,
    }));

    const csv = matrixToCSV(fcmNodes, fcmEdges);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fcm_matrix_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = async (file: File) => {
    try {
      const text = await file.text();
      const { nodes: importedNodes, edges: importedEdges } = parseMatrixCSV(text);
      setImportError(null);
      onImportData?.(importedNodes, importedEdges);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse CSV');
    }
  };

  const getWeight = (sourceId: string, targetId: string) => {
    const edge = edges.find((e) => e.source === sourceId && e.target === targetId);
    return edge?.data?.weight ?? 0;
  };

  return (
    <div className={cn(
      "absolute inset-0 flex flex-col overflow-hidden transition-all duration-500",
      theme === 'modern' ? "bg-[#0a0a14] font-mono" : "bg-[#f5f0e8] font-serif"
    )}>
      {/* Header */}
      <div className={cn(
        "p-8 border-b flex items-center justify-between transition-colors duration-500",
        theme === 'modern' ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-500",
            theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
          )}>
            <Settings2 className={cn("w-5 h-5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          </div>
          <div>
            <h2 className={cn(
              "text-lg font-black uppercase tracking-tighter transition-colors duration-500",
              theme === 'modern' ? "text-white" : "text-slate-900"
            )}>Causal Matrix</h2>
            <p className={cn(
              "text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-500",
              theme === 'modern' ? "text-white/30" : "text-slate-400"
            )}>Direct Topology Configuration</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex p-1 rounded-xl border mr-4 transition-colors duration-500",
            theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-100 border-slate-200"
          )}>
            <button 
              onClick={() => setInputMode('numeric')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                inputMode === 'numeric' 
                  ? (theme === 'modern' ? "bg-white/10 text-emerald-400 shadow-sm" : "bg-white text-emerald-600 shadow-sm border border-slate-200") 
                  : (theme === 'modern' ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
              )}
            >
              <Hash className="w-3.5 h-3.5" />
              Numeric
            </button>
            <button 
              onClick={() => setInputMode('linguistic')}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                inputMode === 'linguistic' 
                  ? (theme === 'modern' ? "bg-white/10 text-emerald-400 shadow-sm" : "bg-white text-emerald-600 shadow-sm border border-slate-200") 
                  : (theme === 'modern' ? "text-white/40 hover:text-white/60" : "text-slate-400 hover:text-slate-600")
              )}
            >
              <Languages className="w-3.5 h-3.5" />
              Linguistic
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImportCSV(file);
              e.target.value = '';
            }}
          />
          {onImportData && (
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import adjacency matrix from CSV (replaces the current map)"
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                theme === 'modern' ? "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              Import CSV
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={nodes.length === 0}
            title="Export adjacency matrix as CSV"
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border disabled:opacity-40",
              theme === 'modern' ? "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={onAddNode}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
              theme === 'modern' ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Concept
          </button>
        </div>
      </div>

      {importError && (
        <div className={cn(
          "px-8 py-3 text-xs font-bold border-b flex items-center justify-between",
          theme === 'modern' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-red-50 text-red-700 border-red-200"
        )}>
          <span>CSV import failed: {importError}</span>
          <button onClick={() => setImportError(null)} className="underline">dismiss</button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-8 custom-scrollbar">
        <div className="min-w-max min-h-max">
          {/* Matrix Table */}
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr>
                <th className={cn(
                  "sticky top-0 left-0 z-30 p-4 text-left border-b border-r min-w-[240px] transition-colors duration-500",
                  theme === 'modern' ? "bg-[#0a0a14] border-white/10" : "bg-white border-slate-200"
                )}>
                  <div className={cn(
                    "flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500",
                    theme === 'modern' ? "text-white/20" : "text-slate-400"
                  )}>
                    <span>Source \ Target</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </th>
                {nodes.map((node) => (
                  <th key={node.id} className={cn(
                    "sticky top-0 z-20 p-4 text-center border-b min-w-[120px] transition-colors duration-500",
                    theme === 'modern' ? "bg-[#0a0a14] border-white/10" : "bg-white border-slate-200"
                  )}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", theme === 'modern' ? "bg-emerald-500/50" : "bg-emerald-600/50")} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest truncate max-w-[100px] transition-colors duration-500",
                        theme === 'modern' ? "text-white/60" : "text-slate-600"
                      )}>
                        {node.data.label}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map((rowNode) => (
                <tr key={rowNode.id} className="group">
                  <td className={cn(
                    "sticky left-0 z-20 p-4 border-r transition-all duration-500",
                    theme === 'modern' ? "bg-[#0a0a14] border-white/10 group-hover:bg-white/5" : "bg-white border-slate-200 group-hover:bg-slate-50"
                  )}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <input
                          type="text"
                          value={rowNode.data.label}
                          onChange={(e) => onUpdateNode(rowNode.id, { label: e.target.value })}
                          className={cn(
                            "bg-transparent text-[11px] font-black uppercase tracking-wider outline-none transition-colors truncate",
                            theme === 'modern' ? "text-white focus:text-emerald-400" : "text-slate-900 focus:text-emerald-600"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[8px] uppercase font-black tracking-widest transition-colors duration-500",
                            theme === 'modern' ? "text-white/20" : "text-slate-400"
                          )}>Initial Act:</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={rowNode.data.initialActivation}
                            onChange={(e) => onUpdateNode(rowNode.id, { initialActivation: parseFloat(e.target.value) })}
                            className={cn(
                              "text-[9px] font-black w-12 px-1 rounded border outline-none transition-all duration-500",
                              theme === 'modern' ? "bg-white/5 text-emerald-400 border-white/5 focus:border-emerald-500/30" : "bg-slate-50 text-emerald-700 border-slate-200 focus:border-emerald-600/30"
                            )}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteNode(rowNode.id)}
                        className={cn(
                          "p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                          theme === 'modern' ? "text-white/10 hover:text-red-400 hover:bg-red-500/10" : "text-slate-300 hover:text-red-600 hover:bg-red-50"
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  {nodes.map((colNode) => {
                    const weight = getWeight(rowNode.id, colNode.id);
                    const isSelf = rowNode.id === colNode.id;
                    
                    return (
                      <td 
                        key={colNode.id} 
                        className={cn(
                          "p-2 border-b transition-all duration-500",
                          theme === 'modern' ? "border-white/5" : "border-slate-100",
                          isSelf 
                            ? (theme === 'modern' ? "bg-black/40" : "bg-slate-50/50") 
                            : (theme === 'modern' ? "hover:bg-white/5" : "hover:bg-slate-50")
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {inputMode === 'numeric' ? (
                            <input
                              type="number"
                              step="0.1"
                              min="-1"
                              max="1"
                              value={weight}
                              disabled={isSelf}
                              onChange={(e) => onUpdateWeight(rowNode.id, colNode.id, parseFloat(e.target.value))}
                              className={cn(
                                "w-full bg-transparent text-center text-[11px] font-black outline-none transition-all py-2 rounded-lg border border-transparent focus:border-emerald-500/30",
                                isSelf 
                                  ? (theme === 'modern' ? "text-white/5 cursor-not-allowed" : "text-slate-200 cursor-not-allowed") 
                                  : (weight > 0 
                                      ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-600") 
                                      : (weight < 0 ? (theme === 'modern' ? "text-red-400" : "text-red-600") : (theme === 'modern' ? "text-white/20" : "text-slate-300")))
                              )}
                            />
                          ) : (
                            <div className="relative w-full group/select">
                              <select
                                disabled={isSelf}
                                value={weight}
                                onChange={(e) => onUpdateWeight(rowNode.id, colNode.id, parseFloat(e.target.value))}
                                className={cn(
                                  "w-full bg-transparent text-center text-[9px] font-black outline-none transition-all py-2 rounded-lg border border-transparent appearance-none cursor-pointer",
                                  isSelf 
                                    ? (theme === 'modern' ? "text-white/5 cursor-not-allowed" : "text-slate-200 cursor-not-allowed") 
                                    : (weight > 0 
                                        ? (theme === 'modern' ? "text-emerald-400" : "text-emerald-600") 
                                        : (weight < 0 ? (theme === 'modern' ? "text-red-400" : "text-red-600") : (theme === 'modern' ? "text-white/20" : "text-slate-300")))
                                )}
                              >
                                {linguisticTerms.map((term) => (
                                  <option key={term.value} value={term.value} className={theme === 'modern' ? "bg-[#0a0a14] text-white" : "bg-white text-slate-900"}>
                                    {term.label}
                                  </option>
                                ))}
                              </select>
                              {!isSelf && (
                                <ChevronDown className={cn(
                                  "absolute right-1 top-1/2 -translate-y-1/2 w-2.5 h-2.5 pointer-events-none transition-colors",
                                  theme === 'modern' ? "text-white/10 group-hover/select:text-white/30" : "text-slate-300 group-hover/select:text-slate-500"
                                )} />
                              )}
                            </div>
                          )}
                          {!isSelf && weight !== 0 && (
                            <div 
                              className={cn(
                                "h-0.5 w-8 rounded-full transition-colors duration-500",
                                weight > 0 ? (theme === 'modern' ? "bg-emerald-500/30" : "bg-emerald-600/30") : (theme === 'modern' ? "bg-red-500/30" : "bg-red-600/30")
                              )} 
                              style={{ opacity: Math.abs(weight) }}
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className={cn(
        "p-6 border-t flex items-center justify-between transition-colors duration-500",
        theme === 'modern' ? "border-white/5 bg-black/20" : "border-slate-100 bg-slate-50/50"
      )}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-500",
              theme === 'modern' ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-200"
            )}>
              <Info className={cn("w-4 h-4", theme === 'modern' ? "text-emerald-500/50" : "text-emerald-600/50")} />
            </div>
            <p className={cn(
              "text-[9px] uppercase font-black tracking-[0.2em] leading-relaxed transition-colors duration-500",
              theme === 'modern' ? "text-white/30" : "text-slate-500"
            )}>
              Weights range from <span className={theme === 'modern' ? "text-emerald-400" : "text-emerald-600"}>-1.0 to +1.0</span>. <br/>
              Zero values remove the causal link.
            </p>
          </div>
          <div className={cn("h-8 w-px mx-2 transition-colors duration-500", theme === 'modern' ? "bg-white/5" : "bg-slate-200")} />
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", theme === 'modern' ? "bg-emerald-500" : "bg-emerald-600")} />
              <span className={cn(
                "text-[9px] uppercase font-black tracking-widest transition-colors duration-500",
                theme === 'modern' ? "text-white/40" : "text-slate-500"
              )}>Positive Influence</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", theme === 'modern' ? "bg-red-500" : "bg-red-600")} />
              <span className={cn(
                "text-[9px] uppercase font-black tracking-widest transition-colors duration-500",
                theme === 'modern' ? "text-white/40" : "text-slate-500"
              )}>Negative Influence</span>
            </div>
          </div>
        </div>

        <div className={cn(
          "flex items-center gap-4 px-4 py-2 rounded-xl border transition-colors duration-500",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"
        )}>
          <Languages className={cn("w-3.5 h-3.5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          <span className={cn(
            "text-[9px] uppercase font-black tracking-widest transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            Fuzzy Mapping: <span className={theme === 'modern' ? "text-white" : "text-slate-900"}>{linguisticTerms.length}-Point Linguistic Scale</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default MatrixEditor;
