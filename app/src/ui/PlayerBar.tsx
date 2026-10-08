import type { Player } from '@bkstats/shared';
import { FoulDots } from './FoulDots';

interface Props {
  players: Player[];
  selectedId: string | null;
  fouls: Record<string, number>;
  onTap: (id: string) => void;
}

export function PlayerBar({ players, selectedId, fouls, onTap }: Props) {
  return (
    <div class="player-bar">
      {players.map((p) => (
        <button key={p.id} class={`player-btn${selectedId === p.id ? ' active' : ''}${(fouls[p.id] ?? 0) >= 4 ? ' foul-trouble' : ''}`} onClick={() => onTap(p.id)}>
          <span class="player-num">{p.number}</span>
          <span class="player-name">{p.lastName}</span>
          <span class="player-fouls"><FoulDots count={fouls[p.id] ?? 0} /></span>
        </button>
      ))}
    </div>
  );
}
