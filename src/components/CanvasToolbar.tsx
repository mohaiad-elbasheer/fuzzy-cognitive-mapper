import React, { useState, useRef, useEffect } from 'react';
import { Plus, Link as LinkIcon, LayoutGrid, Maximize2, Search, X } from 'lucide-react';
import { FCMNode } from '../types';
import { cn } from '../lib/utils';

interface CanvasToolbarProps {
  nodes: FCMNode[];
  connectMode: boolean;
  onAddConcept: () => void;
  onToggleConnectMode: () => void;
  onAutoLayout: () => void;
  onFitView: () => void;
  onFocusNode: (nodeId: string) => void;
  theme?: 'modern' | 'academic';
}

/**
 * Vertical modeling toolbar on the left edge of the canvas:
 * add concept, connect mode, auto-layout, fit view, and concept search.
 */
const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  nodes,
  connectMode,
  onAddConcept,
  onToggleConnectMode,
  onAutoLayout,
  onFitView,
  onFocusNode,
  theme = 'modern',
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [searchOpen]);

  const matches = query.trim()
    ? nodes.filter(n => n.label.toLowerCase().includes(query.trim().toLowerCase()))
    : nodes;

  const buttonClass = (active = false) => cn(
    "w-11 h-11 rounded-xl border flex items-center justify-center transition-colors",
    active
      ? (theme === 'modern' ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-emerald-100 border-emerald-300 text-emerald-700")
      : (theme === 'modern'
          ? "bg-[#0a0a14]/90 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
          : "bg-white/90 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900")
  );

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
      <button onClick={onAddConcept} aria-label="Add Concept" title="Add concept" className={buttonClass()}>
        <Plus className="w-5 h-5" />
      </button>

      <button
        onClick={onToggleConnectMode}
        aria-label="Connect concepts"
        aria-pressed={connectMode}
        title={connectMode ? "Exit connect mode (Esc)" : "Connect concepts: click a source, then a target"}
        className={buttonClass(connectMode)}
      >
        <LinkIcon className="w-5 h-5" />
      </button>

      <button onClick={onAutoLayout} aria-label="Auto-layout" title="Auto-layout the map" className={buttonClass()}>
        <LayoutGrid className="w-5 h-5" />
      </button>

      <button onClick={onFitView} aria-label="Fit to content" title="Fit map to view" className={buttonClass()}>
        <Maximize2 className="w-5 h-5" />
      </button>

      <div className="relative" ref={searchRef}>
        <button
          onClick={() => setSearchOpen(o => !o)}
          aria-label="Search concepts"
          aria-expanded={searchOpen}
          title="Search concepts"
          className={buttonClass(searchOpen)}
        >
          <Search className="w-5 h-5" />
        </button>

        {searchOpen && (
          <div className={cn(
            "absolute left-full top-0 ml-2 w-64 rounded-xl border shadow-2xl p-2 z-40",
            theme === 'modern' ? "bg-[#0f0f1a] border-white/10" : "bg-white border-slate-200"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearchOpen(false);
                  if (e.key === 'Enter' && matches.length > 0) {
                    onFocusNode(matches[0].id);
                    setSearchOpen(false);
                  }
                }}
                placeholder="Find a concept…"
                aria-label="Search concepts"
                className={cn(
                  "flex-1 px-3 py-2 text-sm rounded-lg outline-none border",
                  theme === 'modern'
                    ? "bg-white/5 border-white/10 text-white focus:border-emerald-500 placeholder:text-white/30"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:border-emerald-600 placeholder:text-slate-400"
                )}
              />
              <button
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className={cn("p-1.5 rounded", theme === 'modern' ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-700")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {matches.length === 0 ? (
                <p className={cn("px-3 py-3 text-sm", theme === 'modern' ? "text-white/30" : "text-slate-400")}>
                  No matching concept
                </p>
              ) : (
                matches.map(n => (
                  <button
                    key={n.id}
                    onClick={() => {
                      onFocusNode(n.id);
                      setSearchOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors truncate",
                      theme === 'modern' ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    {n.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasToolbar;
