import type { EventType, Side } from '@bkstats/shared';
import { useRef } from 'preact/hooks';
import { Icon, type IconName } from './Icon';

interface Action { type: EventType | 'FREE_THROW'; label: string; icon: IconName; usOnly?: boolean }

const ACTIONS: Action[] = [
  { type: 'REBOUND_OFF', label: 'Rimb O', icon: 'arrowUpCircle' },
  { type: 'REBOUND_DEF', label: 'Rimb D', icon: 'arrowDownCircle' },
  { type: 'TURNOVER', label: 'Persa', icon: 'xCircle' },
  { type: 'STEAL', label: 'Recup', icon: 'zap' },
  { type: 'BLOCK', label: 'Stoppata', icon: 'shield' },
  { type: 'BLOCK_RECEIVED', label: 'Stopp. subita', icon: 'shieldOff', usOnly: true },
  { type: 'FOUL', label: 'Fallo', icon: 'alert' },
  { type: 'FOUL_DRAWN', label: 'Fallo subito', icon: 'alertCircle', usOnly: true },
  { type: 'SCREEN', label: 'Blocco', icon: 'square', usOnly: true },
  { type: 'TIMEOUT', label: 'Timeout', icon: 'pause' },
  { type: 'FREE_THROW', label: 'Tiro libero', icon: 'target' },
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
          <Icon name={a.icon} size={18} />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}
