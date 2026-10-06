import { signal, type Signal } from '@preact/signals';

export interface GameClock {
  running: Signal<boolean>;
  remainingSec: Signal<number>;
  start(): void;
  stop(): void;
  set(sec: number): void;
  reset(periodLengthSec: number): void;
  /** Ricalcola il tempo residuo; chiamato dal timer interno, esposto per i test. */
  tick(): void;
  dispose(): void;
}

export function createClock(periodLengthSec: number, now: () => number = () => performance.now()): GameClock {
  const running = signal(false);
  const remainingSec = signal(periodLengthSec);
  let remainingMs = periodLengthSec * 1000;
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const currentMs = () => (running.value ? Math.max(0, remainingMs - (now() - startedAt)) : remainingMs);

  const tick = () => {
    const ms = currentMs();
    remainingSec.value = Math.floor(ms / 1000);
    if (ms <= 0 && running.value) stop();
  };

  const stop = () => {
    if (!running.value) return;
    remainingMs = currentMs();
    running.value = false;
    if (timer) { clearInterval(timer); timer = null; }
    remainingSec.value = Math.floor(remainingMs / 1000);
  };

  const start = () => {
    if (running.value || remainingMs <= 0) return;
    startedAt = now();
    running.value = true;
    timer = setInterval(tick, 250);
  };

  const set = (sec: number) => {
    const wasRunning = running.value;
    stop();
    remainingMs = Math.max(0, sec) * 1000;
    remainingSec.value = Math.floor(remainingMs / 1000);
    if (wasRunning && remainingMs > 0) start();
  };

  const reset = (len: number) => {
    stop();
    remainingMs = len * 1000;
    remainingSec.value = len;
  };

  return { running, remainingSec, start, stop, set, reset, tick, dispose: stop };
}
