import { ROLE_LABELS, type Player } from '@bkstats/shared';
import { Icon } from './Icon';

interface Props {
  players: Player[];
  selected: string[];
  max: number;
  onChange: (ids: string[]) => void;
  /** Giocatori non selezionabili (es. 5 falli). */
  disabled?: string[];
}

/** Griglia di schede giocatore con spunta: numero grande, cognome, ruolo. */
export function PlayerPicker({ players, selected, max, onChange, disabled = [] }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };
  return (
    <div class="pick-grid">
      {players.map((p) => {
        const on = selected.includes(p.id);
        const off = disabled.includes(p.id);
        return (
          <button key={p.id} class={`pick-card${on ? ' on' : ''}${p.active ? '' : ' inactive'}`} disabled={off} aria-pressed={on} onClick={() => toggle(p.id)}>
            <span class="pick-num">{p.number}</span>
            <span class="pick-text"><span class="pick-name">{p.lastName}</span><span class="pick-role">{p.firstName ? `${p.firstName} · ` : ''}{ROLE_LABELS[p.role]}</span></span>
            <span class="pick-check"><Icon name="check" size={16} /></span>
          </button>
        );
      })}
    </div>
  );
}
