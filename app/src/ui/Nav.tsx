import { route, navigate } from '../router';
import { Icon, type IconName } from './Icon';

const ITEMS: { hash: string; label: string; icon: IconName; names: string[] }[] = [
  { hash: '#/', label: 'Home', icon: 'home', names: ['home'] },
  { hash: '#/calendar', label: 'Calendario', icon: 'calendar', names: ['calendar', 'stats'] },
  { hash: '#/roster', label: 'Roster', icon: 'users', names: ['roster'] },
  { hash: '#/season', label: 'Stagione', icon: 'trophy', names: ['season'] },
];

export function Nav() {
  const name = route.value.name;
  return (
    <nav class="nav">
      {ITEMS.map((it) => (
        <button key={it.hash} class={`nav-item${it.names.includes(name) ? ' active' : ''}`} onClick={() => navigate(it.hash)}>
          <Icon name={it.icon} size={22} />
          <span>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
