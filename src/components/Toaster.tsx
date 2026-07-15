import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscribe, dismiss, ToastItem } from '../lib/toast';
import { cn } from '../lib/utils';

interface ToasterProps {
  theme?: 'modern' | 'academic';
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
} as const;

const Toaster: React.FC<ToasterProps> = ({ theme = 'modern' }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setToasts), []);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className={cn(
                "pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-sm",
                theme === 'modern' ? "bg-[#12121f]/95 text-white border-white/10" : "bg-white/95 text-slate-800 border-slate-200"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 mt-0.5 shrink-0",
                  t.kind === 'success' && "text-emerald-500",
                  t.kind === 'error' && "text-red-500",
                  t.kind === 'info' && "text-blue-400"
                )}
              />
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className={cn(
                  "p-0.5 rounded shrink-0 transition-colors",
                  theme === 'modern' ? "text-white/40 hover:text-white" : "text-slate-400 hover:text-slate-700"
                )}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default Toaster;
