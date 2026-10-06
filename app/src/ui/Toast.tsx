import { signal } from '@preact/signals';

export interface ToastState { message: string; kind: 'ok' | 'error' }

export const toastState = signal<ToastState | null>(null);
const current = toastState;
let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(message: string, kind: 'ok' | 'error' = 'ok', ms?: number): void {
  if (timer) { clearTimeout(timer); timer = null; }
  current.value = { message, kind };
  const duration = ms ?? (kind === 'ok' ? 600 : 0);
  if (duration > 0) timer = setTimeout(() => { current.value = null; }, duration);
}

export function ToastHost() {
  const t = current.value;
  if (!t) return null;
  return (
    <div class={`toast toast-${t.kind}`} role="status" onClick={() => (current.value = null)}>
      {t.message}
    </div>
  );
}
