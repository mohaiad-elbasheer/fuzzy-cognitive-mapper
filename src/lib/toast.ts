/**
 * Minimal toast notification store. Module-level pub/sub so any code
 * (hooks, services, components) can raise a notification without context
 * plumbing; the <Toaster /> component renders whatever is in the store.
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let items: ToastItem[] = [];
let listeners: Listener[] = [];
let nextId = 1;

const emit = () => {
  for (const listener of listeners) listener([...items]);
};

const push = (kind: ToastKind, message: string, durationMs: number) => {
  const id = nextId++;
  items = [...items, { id, kind, message }];
  emit();
  setTimeout(() => dismiss(id), durationMs);
  return id;
};

export const dismiss = (id: number) => {
  const before = items.length;
  items = items.filter(t => t.id !== id);
  if (items.length !== before) emit();
};

export const subscribe = (listener: Listener): (() => void) => {
  listeners.push(listener);
  listener([...items]);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

export const toast = {
  success: (message: string) => push('success', message, 3500),
  info: (message: string) => push('info', message, 3500),
  // Errors stay longer: the user needs time to read what went wrong
  error: (message: string) => push('error', message, 7000),
};
