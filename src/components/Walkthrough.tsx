import React, { useState } from 'react';
import { Plus, Link as LinkIcon, Play, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface WalkthroughProps {
  open: boolean;
  onClose: () => void;
  theme?: 'modern' | 'academic';
}

const STEPS = [
  {
    icon: Plus,
    title: 'Define concepts',
    body: 'Use the + button in the left toolbar to add a concept for each factor in your system. Double-click a concept to rename it; select it to set its initial activation in the right panel.',
  },
  {
    icon: LinkIcon,
    title: 'Connect causes to effects',
    body: 'Turn on connect mode (the link button), then click a source concept followed by a target. Select any connection to adjust its causal weight from −1 (inhibits) to +1 (promotes).',
  },
  {
    icon: Play,
    title: 'Run a scenario',
    body: 'Press Run simulation in the right panel. The results drawer shows how every concept converges over time — clamp a concept with the lock toggle to ask "what if this stays fixed?".',
  },
];

/** Three-step first-use tour. */
const Walkthrough: React.FC<WalkthroughProps> = ({ open, onClose, theme = 'modern' }) => {
  const [step, setStep] = useState(0);

  const finish = () => {
    localStorage.setItem('fcm_walkthrough_done', '1');
    setStep(0);
    onClose();
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Getting started tour"
        >
          <div className="absolute inset-0 bg-black/60" onClick={finish} />
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className={cn(
              "relative w-full max-w-md p-6 rounded-2xl border shadow-2xl",
              theme === 'modern' ? "bg-[#12121f] border-white/10" : "bg-white border-slate-200"
            )}
          >
            <button
              onClick={finish}
              aria-label="Close tour"
              className={cn(
                "absolute top-4 right-4 p-1.5 rounded-lg transition-colors",
                theme === 'modern' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              )}
            >
              <X className="w-4 h-4" />
            </button>

            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
              theme === 'modern' ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-600"
            )}>
              <Icon className="w-6 h-6" />
            </div>

            <p className={cn("text-xs font-semibold uppercase tracking-wider mb-1", theme === 'modern' ? "text-white/60" : "text-slate-500")}>
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className={cn("text-lg font-bold mb-2", theme === 'modern' ? "text-white" : "text-slate-900")}>
              {current.title}
            </h2>
            <p className={cn("text-sm leading-relaxed mb-6", theme === 'modern' ? "text-white/60" : "text-slate-600")}>
              {current.body}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5" aria-hidden="true">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i === step
                        ? "bg-emerald-500"
                        : (theme === 'modern' ? "bg-white/15" : "bg-slate-200")
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      theme === 'modern' ? "text-white/60 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={finish}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    Start modeling
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Walkthrough;
