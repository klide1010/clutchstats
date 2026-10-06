import { route, navigate } from '../router';

const ITEMS: { hash: string; label: string; names: string[] }[] = [
  { hash: '#/', label: 'Home', names: ['home'] },
  { hash: '#/calendar', label: 'Calendario', names: ['calendar', 'stats'] },
  { hash: '#/roster', label: 'Roster', names: ['roster'] },
  { hash: '#/season', label: 'Stagione', names: ['season'] },
  { hash: '#/settings', label: 'Altro', names: ['settings', 'opponents'] },
];

export function Nav() {
  const name = route.value.name;
  return (
    <nav class="nav">
      {ITEMS.map((it) => (
        <button key={it.hash} class={`nav-item${it.names.includes(name) ? ' active' : ''}`} onClick={() => navigate(it.hash)}>
          {it.label}
        </button>
      ))}
    </nav>
  );
}
