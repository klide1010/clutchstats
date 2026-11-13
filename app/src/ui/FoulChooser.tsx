import type { FoulKind, Side } from '@bkstats/shared';

/** Falli da giocatore secondo le regole FIBA 2026 (dal 1° ottobre 2026, recepite da FIP e CSI): sigla da referto e conseguenze. */
const PLAYER_FOULS: { kind: FoulKind; label: string; note: string }[] = [
  { kind: 'PERSONAL', label: 'Personale', note: 'P' },
  { kind: 'OFFENSIVE', label: 'In attacco', note: 'P · palla agli avversari' },
  { kind: 'DISRUPTIVE', label: 'Disruptive', note: 'DI · tiri liberi + rimessa' },
  { kind: 'FLAGRANT', label: 'Flagrante', note: "FL · tiri liberi + rimessa · conta per l'espulsione" },
  { kind: 'TECHNICAL', label: 'Tecnico cat. 1', note: "T · 1 libero · conta per l'espulsione" },
  { kind: 'TECHNICAL_2', label: 'Tecnico cat. 2', note: 'T · 1 libero' },
  { kind: 'DISQUALIFYING', label: 'Da espulsione', note: 'D · espulso subito' },
];

const COACH_FOULS: { kind: FoulKind; label: string; note: string }[] = [
  { kind: 'COACH_TECHNICAL', label: 'Tecnico allenatore', note: 'C · espulso al 2°' },
  { kind: 'BENCH_TECHNICAL', label: 'Tecnico panchina', note: 'B · allenatore espulso al 3° tra B e C' },
];

interface Props {
  side: Side;
  /** Fallo di un giocatore: poi si sceglie chi (come il tocco breve su Fallo). */
  onPlayerFoul: (kind: FoulKind) => void;
  /** Tecnico di allenatore o panchina: si registra subito, senza giocatore. */
  onCoachFoul: (kind: FoulKind) => void;
  onClose: () => void;
}

/** Si apre tenendo premuto "Fallo". Contano per i 5 falli tutti i falli da giocatore; espulsione con 2 tra tecnici cat. 1 e flagranti. */
export function FoulChooser({ side, onPlayerFoul, onCoachFoul, onClose }: Props) {
  const item = (f: { kind: FoulKind; label: string; note: string }, onPick: (k: FoulKind) => void) => (
    <button key={f.kind} class="btn btn-block foul-choice" onClick={() => onPick(f.kind)}>
      <span class="foul-choice-label">{f.label}</span><span class="foul-choice-note">{f.note}</span>
    </button>
  );
  return (
    <div class="popup-backdrop" onClick={onClose}>
      <div class="popup foul-chooser" onClick={(e) => e.stopPropagation()}>
        <span class="muted">Tipo di fallo · {side === 'US' ? 'Noi' : 'Loro'}</span>
        {PLAYER_FOULS.map((f) => item(f, onPlayerFoul))}
        <span class="muted">Allenatore e panchina (non contano nei falli di squadra)</span>
        {COACH_FOULS.map((f) => item(f, onCoachFoul))}
      </div>
    </div>
  );
}
