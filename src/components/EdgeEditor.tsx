import React from 'react';
import { X, Sliders } from 'lucide-react';
import { LinguisticTerm, LINGUISTIC_TERMS } from '../types';
import { cn } from '../lib/utils';

interface EdgeEditorProps {
  edge: any;
  onUpdate: (weight: number) => void;
  onClose: () => void;
  linguisticTerms?: LinguisticTerm[];
  theme?: 'modern' | 'academic';
}

const EdgeEditor: React.FC<EdgeEditorProps> = ({ 
  edge, 
  onUpdate, 
  onClose, 
  linguisticTerms = LINGUISTIC_TERMS,
  theme = 'modern' 
}) => {
  const weight = edge.data?.weight || 0;

  return (
    <div className={cn(
      "w-72 backdrop-blur-xl rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 transition-all duration-500",
      theme === 'modern' ? "bg-[#0a0a14]/95 border-white/10 font-mono" : "bg-white border-slate-200 font-serif"
    )}>
      <div className={cn(
        "p-4 flex items-center justify-between border-b transition-colors duration-500",
        theme === 'modern' ? "bg-white/5 text-white border-white/5" : "bg-slate-50 text-slate-900 border-slate-100"
      )}>
        <div className="flex items-center gap-2">
          <Sliders className={cn("w-4 h-4", theme === 'modern' ? "text-emerald-400" : "text-emerald-600")} />
          <span className="text-[10px] font-black uppercase tracking-widest">Causal Relationship</span>
        </div>
        <button 
          onClick={onClose} 
          className={cn(
            "p-1 rounded-lg transition-colors",
            theme === 'modern' ? "hover:bg-white/10 text-white/40 hover:text-white" : "hover:bg-slate-200 text-slate-400 hover:text-slate-900"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className={cn(
            "text-[10px] font-bold uppercase tracking-widest block transition-colors duration-500",
            theme === 'modern' ? "text-white/30" : "text-slate-400"
          )}>
            Linguistic Term
          </label>
          <select
            value={weight}
            onChange={(e) => onUpdate(parseFloat(e.target.value))}
            className={cn(
              "w-full border rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all duration-500",
              theme === 'modern' 
                ? "bg-white/5 border-white/10 text-white/80 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
                : "bg-slate-50 border-slate-200 text-slate-700 focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-600"
            )}
          >
            {linguisticTerms.map((term) => (
              <option key={term.value} value={term.value} className={theme === 'modern' ? "bg-[#0a0a14]" : "bg-white"}>
                {term.label} ({term.value > 0 ? '+' : ''}{term.value})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-colors duration-500",
              theme === 'modern' ? "text-white/30" : "text-slate-400"
            )}>
              Precise Weight
            </label>
            <span className={cn(
              "text-lg font-bold transition-colors duration-500",
              theme === 'modern' ? "font-mono" : "font-serif",
              weight > 0 ? "text-emerald-500" : weight < 0 ? "text-red-500" : (theme === 'modern' ? "text-white/20" : "text-slate-300")
            )}>
              {weight > 0 ? '+' : ''}{weight.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={weight}
            onChange={(e) => onUpdate(parseFloat(e.target.value))}
            className={cn(
              "w-full h-1.5 rounded-full appearance-none cursor-pointer accent-emerald-500 transition-all duration-500",
              theme === 'modern' ? "bg-white/10" : "bg-slate-200"
            )}
          />
          <div className={cn(
            "flex justify-between text-[9px] font-bold uppercase tracking-tighter transition-colors duration-500",
            theme === 'modern' ? "text-white/20" : "text-slate-400"
          )}>
            <span>Negative</span>
            <span>Neutral</span>
            <span>Positive</span>
          </div>
        </div>

        <div className={cn(
          "p-3 rounded-xl border transition-all duration-500",
          theme === 'modern' ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-100 shadow-inner"
        )}>
          <p className={cn(
            "text-[10px] leading-relaxed italic font-medium transition-colors duration-500",
            theme === 'modern' ? "text-white/40" : "text-slate-500"
          )}>
            {weight > 0 
              ? `Increasing the source concept will cause an increase in the target.` 
              : weight < 0 
              ? `Increasing the source concept will cause a decrease in the target.`
              : `No causal relationship defined between these concepts.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EdgeEditor;
