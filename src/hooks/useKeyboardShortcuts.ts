import { useEffect } from 'react';

interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  deleteSelected: () => void;
}

const isTextInputFocused = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

/**
 * Global editor shortcuts: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Y (redo),
 * Ctrl/Cmd+C/V (copy/paste), Delete/Backspace (delete selection).
 * All shortcuts are suppressed while a text field is focused so native
 * text editing keeps working.
 */
export function useKeyboardShortcuts({ undo, redo, copy, paste, deleteSelected }: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isTextInputFocused()) return;

      if (isCtrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (isCtrl && e.key === 'c') {
        copy();
      } else if (isCtrl && e.key === 'v') {
        paste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copy, paste, deleteSelected]);
}
