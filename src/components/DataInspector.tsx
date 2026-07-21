import React, { useState, useEffect, useMemo } from 'react';
import { FCMNode, FCMEdge } from '../types';
import { Copy, Check, FileJson, Edit3, Eye, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface DataInspectorProps {
  nodes: FCMNode[];
  edges: FCMEdge[];
  onImportData?: (nodes: FCMNode[], edges: FCMEdge[]) => void;
  theme?: 'modern' | 'academic';
}

const DataInspector: React.FC<DataInspectorProps> = ({ 
  nodes, 
  edges, 
  onImportData,
  theme = 'modern' 
}) => {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [editContent, setEditContent] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
  const data = useMemo(() => ({
    metadata: {
      engine: "Fuzzy Cognitive Mapper v1.0",
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length
    },
    concepts: nodes.map(n => ({
      id: n.id,
      label: n.label,
      initialActivation: n.initialActivation,
      activation: n.activation
    })),
    causalLinks: edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      weight: e.weight
    }))
  }), [nodes, edges]);

  const jsonString = useMemo(() => JSON.stringify(data, null, 2), [data]);

  // Update edit content when switching to edit mode or when data changes
  useEffect(() => {
    if (mode === 'edit') {
      setEditContent(jsonString);
      setParseError(null);
    }
  }, [mode, jsonString]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mode === 'edit' ? editContent : jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateAndParse = (content: string) => {
    const parsed = JSON.parse(content);
    
    // Validate structure
    if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
      throw new Error('Missing or invalid "concepts" array');
    }
    if (!parsed.causalLinks || !Array.isArray(parsed.causalLinks)) {
      throw new Error('Missing or invalid "causalLinks" array');
    }

    // Validate concepts
    const nodeIds = new Set<string>();
    const newNodes: FCMNode[] = parsed.concepts.map((c: any, i: number) => {
      if (!c.id) throw new Error(`Concept at index ${i} missing "id"`);
      if (!c.label) throw new Error(`Concept "${c.id}" missing "label"`);
      if (nodeIds.has(c.id)) throw new Error(`Duplicate concept id: "${c.id}"`);
      nodeIds.add(c.id);
      
      return {
        id: c.id,
        label: c.label,
        initialActivation: typeof c.initialActivation === 'number' ? c.initialActivation : 0.5,
        activation: typeof c.activation === 'number' ? c.activation : c.initialActivation || 0.5,
      };
    });

    // Validate edges
    const edgeIds = new Set<string>();
    const newEdges: FCMEdge[] = parsed.causalLinks.map((e: any, i: number) => {
      if (!e.source) throw new Error(`Causal link at index ${i} missing "source"`);
      if (!e.target) throw new Error(`Causal link at index ${i} missing "target"`);
      if (!nodeIds.has(e.source)) throw new Error(`Causal link references unknown source: "${e.source}"`);
      if (!nodeIds.has(e.target)) throw new Error(`Causal link references unknown target: "${e.target}"`);
      
      const id = e.id || `e${e.source}-${e.target}`;
      if (edgeIds.has(id)) throw new Error(`Duplicate edge id: "${id}"`);
      edgeIds.add(id);

      const weight = typeof e.weight === 'number' ? Math.max(-1, Math.min(1, e.weight)) : 0;

      return {
        id,
        source: e.source,
        target: e.target,
        weight,
      };
    });

    return { nodes: newNodes, edges: newEdges };
  };

  const handleApplyChanges = () => {
    try {
      const { nodes: newNodes, edges: newEdges } = validateAndParse(editContent);
      setParseError(null);
      
      if (onImportData) {
        onImportData(newNodes, newEdges);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 2000);
        setMode('view');
      }
    } catch (err: any) {
      setParseError(err.message || 'Invalid JSON format');
    }
  };

  const handleEditChange = (value: string) => {
    setEditContent(value);
    setParseError(null);
    
    // Live validation
    try {
      JSON.parse(value);
    } catch {
      // Don't show parse errors while typing, only on apply
    }
  };

  return (
    <div className={cn(
      "absolute inset-0 p-10 overflow-hidden flex flex-col transition-all duration-500",
      theme === 'modern' ? "bg-[#0a0a14]" : "bg-[#f5f0e8]"
    )}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-500",
            theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
          )}>
            <FileJson className={cn("w-5 h-5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          </div>
          <div>
            <h2 className={cn(
              "text-lg font-bold uppercase tracking-tight transition-colors duration-500",
              theme === 'modern' ? "text-white" : "text-slate-900"
            )}>Model Definition</h2>
            <p className={cn(
              "text-xs font-bold uppercase tracking-wide transition-colors duration-500",
              theme === 'modern' ? "text-white/55" : "text-slate-500"
            )}>
              {mode === 'view' ? 'Live JSON View' : 'Edit Mode - Modify & Import'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className={cn(
            "flex p-1 rounded-xl border transition-colors duration-500",
            theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
          )}>
            <button
              onClick={() => setMode('view')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all",
                mode === 'view'
                  ? (theme === 'modern' ? "bg-white/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                  : (theme === 'modern' ? "text-white/60 hover:text-white/60" : "text-slate-500 hover:text-slate-600")
              )}
            >
              <Eye className="w-3 h-3" />
              View
            </button>
            <button
              onClick={() => setMode('edit')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all",
                mode === 'edit'
                  ? (theme === 'modern' ? "bg-white/10 text-emerald-400" : "bg-emerald-50 text-emerald-600")
                  : (theme === 'modern' ? "text-white/60 hover:text-white/60" : "text-slate-500 hover:text-slate-600")
              )}
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-bold uppercase tracking-wide transition-all",
              theme === 'modern' ? "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white" : "bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm"
            )}
          >
            {copied ? <Check className={cn("w-3.5 h-3.5", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>

          {mode === 'edit' && onImportData && (
            <button
              onClick={handleApplyChanges}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all",
                theme === 'modern' 
                  ? "bg-emerald-500 text-[#0a0a14] hover:bg-emerald-400" 
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              <Upload className="w-3.5 h-3.5" />
              Apply Changes
            </button>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {parseError && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl mb-4 border",
          theme === 'modern' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-red-50 border-red-200 text-red-600"
        )}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">{parseError}</span>
        </div>
      )}

      {importSuccess && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-xl mb-4 border",
          theme === 'modern' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
        )}>
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium">Model imported successfully!</span>
        </div>
      )}

      {/* Content Area */}
      <div className={cn(
        "flex-1 min-h-0 rounded-3xl border overflow-hidden relative transition-all duration-500",
        theme === 'modern' ? "bg-black/40 border-white/5" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className={cn(
          "absolute top-0 left-0 w-full h-full bg-gradient-to-b pointer-events-none opacity-20",
          theme === 'modern' ? "from-emerald-500/5 to-transparent" : "from-emerald-600/5 to-transparent"
        )} />
        
        {mode === 'view' ? (
          <div className="h-full overflow-auto custom-scrollbar p-8">
            <pre className={cn(
              "text-xs leading-relaxed selection:bg-emerald-500/20 transition-colors duration-500",
              theme === 'modern' ? "text-emerald-400/80" : "text-emerald-700"
            )}>
              {jsonString.split('\n').map((line, i) => (
                <div key={i} className={cn(
                  "flex gap-6 transition-colors px-2 rounded",
                  theme === 'modern' ? "hover:bg-white/5" : "hover:bg-slate-100"
                )}>
                  <span className={cn(
                    "w-8 text-right select-none transition-colors duration-500",
                    theme === 'modern' ? "text-white/10" : "text-slate-500"
                  )}>{i + 1}</span>
                  <span>{line}</span>
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <textarea
            value={editContent}
            onChange={(e) => handleEditChange(e.target.value)}
            className={cn(
              "w-full h-full p-8 text-xs leading-relaxed resize-none outline-none font-mono",
              theme === 'modern' 
                ? "bg-transparent text-emerald-400/80 placeholder-white/20" 
                : "bg-transparent text-emerald-700 placeholder-slate-400"
            )}
            placeholder="Paste or edit JSON here..."
            spellCheck={false}
          />
        )}
      </div>

      {/* Help Text */}
      <div className={cn(
        "mt-4 p-4 rounded-xl border transition-colors duration-500",
        theme === 'modern' ? "bg-white/5 border-white/10" : "bg-white border-slate-200"
      )}>
        <p className={cn(
          "text-xs leading-relaxed",
          theme === 'modern' ? "text-white/60" : "text-slate-500"
        )}>
          {mode === 'view' ? (
            <>This JSON updates automatically as you modify the network. Switch to <strong>Edit</strong> mode to import a model from JSON.</>
          ) : (
            <>Edit the JSON structure above, then click <strong>Apply Changes</strong> to update the network. Required fields: <code className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500">concepts</code> (id, label) and <code className="px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500">causalLinks</code> (source, target, weight).</>
          )}
        </p>
      </div>
    </div>
  );
};

export default DataInspector;
