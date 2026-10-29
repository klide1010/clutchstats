import { useState } from 'preact/hooks';

interface Props {
  maxMin: number;
  /** Minuti sul tabellone proposti all'apertura. */
  defaultMin: number;
  /** Tabellone all'ultimo cambio del periodo: un tempo più alto è quasi sempre un errore (si conta alla rovescia). */
  prevMin?: number;
  /** Minuti che mancano alla fine del periodo, come li mostra il tabellone. */
  onConfirm: (minutesLeft: number) => void;
  onCancel: () => void;
}

/**
 * Chiede il tempo del cambio quando il cronometro è spento. Si legge il tabellone, che conta alla rovescia
 * (10' = inizio periodo, 0' = fine): chiedere i minuti giocati portava a inserire comunque quelli del tabellone
 * e a ribaltare i tempi dei cambi.
 */
export function MinutePicker({ maxMin, defaultMin, prevMin, onConfirm, onCancel }: Props) {
  const [minute, setMinute] = useState(Math.min(maxMin, Math.max(0, defaultMin)));
  return (
    <div class="stack">
      <label>
        Minuti sul tabellone
        <input type="range" min={0} max={maxMin} step={1} value={minute} aria-label="Minuti sul tabellone" onInput={(e) => setMinute(Number((e.target as HTMLInputElement).value))} />
      </label>
      <div class="row" style="justify-content:center">
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setMinute(Math.max(0, minute - 1))}>−</button>
        <strong style="text-align:center;font-size:1.6rem;flex:0 0 4em">{minute}'</strong>
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setMinute(Math.min(maxMin, minute + 1))}>+</button>
      </div>
      <p class="muted" style="margin:0;text-align:center;font-size:0.85rem">
        {minute === maxMin ? 'inizio periodo' : minute === 0 ? 'fine periodo' : `mancano ${minute}', cioè ${maxMin - minute}' giocati`}
      </p>
      {prevMin !== undefined && minute > prevMin && (
        <p class="error" style="margin:0;text-align:center;font-size:0.85rem">Il cambio precedente era a {prevMin}': il tabellone scende, controlla il tempo.</p>
      )}
      <div class="row">
        <button class="btn" onClick={onCancel}>Annulla</button>
        <button class="btn btn-primary" onClick={() => onConfirm(minute)}>Conferma</button>
      </div>
    </div>
  );
}
