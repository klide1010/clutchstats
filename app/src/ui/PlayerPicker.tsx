import type { Player } from '@bkstats/shared';

interface Props {
  players: Player[];
  selected: string[];
  max: number;
  onChange: (ids: string[]) => void;
}

export function PlayerPicker({ players, selected, max, onChange }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };
  return (
    <div class="chips">
      {players.map((p) => (
        <button key={p.id} class={`chip chip-lg${selected.includes(p.id) ? ' active' : ''}`} onClick={() => toggle(p.id)}>
          #{p.number} {p.lastName}
        </button>
      ))}
    </div>
  );
}
