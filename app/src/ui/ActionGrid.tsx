import type { EventType, Side } from '@bkstats/shared';
import { useRef } from 'preact/hooks';

interface Action { type: EventType | 'FREE_THROW'; label: string; usOnly?: boolean }

const ACTIONS: Action[] = [
  { type: 'REBOUND_OFF', label: 'Rimb O' },
  { type: 'REBOUND_DEF', label: 'Rimb D' },
  { type: 'TURNOVER', label: 'Persa' },
  { type: 'STEAL', label: 'Recup' },
  { type: 'BLOCK', label: 'Stoppata' },
  { type: 'BLOCK_RECEIVED', label: 'Stopp. subita', usOnly: true },
  { type: 'FOUL', label: 'Fallo' },
  { type: 'FOUL_DRAWN', label: 'Fallo subito', usOnly: true },
  { type: 'SCREEN', label: 'Blocco', usOnly: true },
  { type: 'TIMEOUT', label: 'Timeout' },
  { type: 'FREE_THROW', label: 'Tiro libero' },
];

interface Props {
  side: Side;
  pending: EventType | null;
  onAction: (type: EventType) => void;
  onFreeThrow: () => void;
  onFoulLongPress: () => void;
}

export function ActionGrid({ side, pending, onAction, onFreeThrow, onFoulLongPress }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);

  const down = (a: Action) => {
    if (a.type !== 'FOUL') return;
    longFired.current = false;
    timer.current = setTimeout(() => { longFired.current = true; onFoulLongPress(); }, 500);
  };
  const up = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  const click = (a: Action) => {
    if (longFired.current) { longFired.current = false; return; }
    if (a.type === 'FREE_THROW') onFreeThrow();
    else onAction(a.type);
  };

  return (
    <div class="action-grid">
      {ACTIONS.filter((a) => side === 'US' || !a.usOnly).map((a) => (
        <button
          key={a.type}
          class={`btn action-btn${pending === a.type ? ' active' : ''}`}
          onPointerDown={() => down(a)}
          onPointerUp={up}
          onPointerLeave={up}
          onPointerCancel={up}
          onClick={() => click(a)}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
