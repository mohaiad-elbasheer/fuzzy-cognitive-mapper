import { useEffect } from 'react';

interface ShortcutHandlers {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  deleteSelected: () => void;
  /** Ctrl/Cmd+S */
  save?: () => void;
  /** Ctrl/Cmd+O */
  openFile?: () => void;
  /** Ctrl/Cmd+Alt+N (plain Ctrl+N is reserved by browsers) */
  newProject?: () => void;
}

const isTextInputFocused = () => {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
};

/**
 * Global editor shortcuts. Graph-editing shortcuts (undo/copy/delete...) are
 * suppressed while a text field is focused so native text editing keeps
 * working; project shortcuts (save/open/new) work everywhere.
 */
export function useKeyboardShortcuts({
  undo,
  redo,
  copy,
  paste,
  deleteSelected,
  save,
  openFile,
  newProject,
}: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Project-level shortcuts work regardless of focus
      if (isCtrl && key === 's' && save) {
        e.preventDefault();
        save();
        return;
      }
      if (isCtrl && key === 'o' && openFile) {
        e.preventDefault();
        openFile();
        return;
      }
      if (isCtrl && e.altKey && key === 'n' && newProject) {
        e.preventDefault();
        newProject();
        return;
      }

      // Let native text-editing shortcuts work inside inputs and textareas
      if (isTextInputFocused()) return;

      if (isCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (isCtrl && key === 'c') {
        copy();
      } else if (isCtrl && key === 'v') {
        paste();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copy, paste, deleteSelected, save, openFile, newProject]);
}
