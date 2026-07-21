import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { SimulationConfig } from '../../lib/experiments';
import { ExperimentTheme } from './shared';

interface NewRunDialogProps {
  open: boolean;
  nodeCount: number;
  edgeCount: number;
  clampedCount: number;
  config: SimulationConfig;
  onClose: () => void;
  onCreate: (name: string) => void;
  theme: ExperimentTheme;
}

const NewRunDialog: React.FC<NewRunDialogProps> = ({
  open,
  nodeCount,
  edgeCount,
  clampedCount,
  config,
  onClose,
  onCreate,
  theme,
}) => {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="New simulation run"
          onClick={onClose}
          onKeyDown={e => e.key === 'Escape' && onClose()}
        >
          <div className={cn(
            "absolute inset-0",
            theme === 'modern' ? "bg-black/80" : "bg-black/50"
          )} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className={cn(
              "relative w-full max-w-md p-6 rounded-2xl border shadow-xl",
              theme === 'modern' ? "bg-[#0f0f1a] border-white/10" : "bg-white border-slate-200"
            )}
          >
            <h3 className={cn(
              "text-lg font-black mb-4",
              theme === 'modern' ? "text-white" : "text-slate-900"
            )}>
              New Simulation Run
            </h3>

            <div className="space-y-4">
              <div>
                <label className={cn(
                  "block text-xs font-bold uppercase tracking-wider mb-2",
                  theme === 'modern' ? "text-white/60" : "text-slate-500"
                )}>
                  Run Name
                </label>
                <input
                  autoFocus
                  aria-label="Run name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g., Baseline, High Stress Scenario..."
                  className={cn(
                    "w-full px-4 py-2 rounded-lg outline-none transition-all",
                    theme === 'modern'
                      ? "bg-white/10 text-white border border-white/10 focus:border-emerald-500/50 placeholder:text-white/60"
                      : "bg-slate-50 text-slate-900 border border-slate-200 focus:border-emerald-500 placeholder:text-slate-500"
                  )}
                />
              </div>

              <div className={cn(
                "p-3 rounded-lg text-sm space-y-1",
                theme === 'modern' ? "bg-white/5 text-white/60" : "bg-slate-50 text-slate-500"
              )}>
                <p>Runs with your current settings from the inspector:</p>
                <p className="font-medium">
                  {nodeCount} concepts · {edgeCount} connections
                  {clampedCount > 0 && <> · {clampedCount} clamped</>}
                </p>
                <p className="font-mono text-xs">
                  {config.activationFunction} · {config.inferenceRule ?? 'modified-kosko'} · λ {config.lambda} · ≤{config.maxIterations} iterations · ε {config.convergenceThreshold.toExponential(0)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={onClose}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  theme === 'modern'
                    ? "text-white/60 hover:text-white hover:bg-white/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                  name.trim()
                    ? (theme === 'modern'
                        ? "bg-emerald-500 text-white hover:bg-emerald-400"
                        : "bg-emerald-600 text-white hover:bg-emerald-700")
                    : "opacity-50 cursor-not-allowed bg-slate-500 text-white"
                )}
              >
                <Play className="w-4 h-4" />
                Run Simulation
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewRunDialog;
