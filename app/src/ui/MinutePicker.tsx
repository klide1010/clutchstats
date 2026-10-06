import { useState } from 'preact/hooks';

interface Props {
  maxMin: number;
  defaultMin: number;
  onConfirm: (minute: number) => void;
  onCancel: () => void;
}

/** Sceglie il minuto del periodo (0 = inizio) quando il cronometro è spento. */
export function MinutePicker({ maxMin, defaultMin, onConfirm, onCancel }: Props) {
  const [minute, setMinute] = useState(Math.min(maxMin, Math.max(0, defaultMin)));
  return (
    <div class="stack">
      <label>
        Minuto del periodo
        <input type="range" min={0} max={maxMin} step={1} value={minute} aria-label="Minuto del periodo" onInput={(e) => setMinute(Number((e.target as HTMLInputElement).value))} />
      </label>
      <div class="row" style="justify-content:center">
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setMinute(Math.max(0, minute - 1))}>−</button>
        <strong style="text-align:center;font-size:1.6rem;flex:0 0 4em">{minute}'</strong>
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setMinute(Math.min(maxMin, minute + 1))}>+</button>
      </div>
      <div class="row">
        <button class="btn" onClick={onCancel}>Annulla</button>
        <button class="btn btn-primary" onClick={() => onConfirm(minute)}>Conferma</button>
      </div>
    </div>
  );
}
