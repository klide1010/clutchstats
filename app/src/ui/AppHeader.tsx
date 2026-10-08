import { route, navigate } from '../router';
import { Icon } from './Icon';

/** Testata comune: marchio a sinistra, impostazioni a destra, riga di separazione sotto. */
export function AppHeader() {
  const onSettings = route.value.name === 'settings' || route.value.name === 'opponents';
  return (
    <header class="app-header">
      <button class="brand brand-btn" onClick={() => navigate('#/')} aria-label="Home">
        <span class="brand-mark"><img src="/clutchstats-mark.png" alt="" width="34" height="34" /></span>
        <span class="brand-name">Clutch<span>Stats</span></span>
      </button>
      <button class={`btn btn-sm btn-icon icon-only header-settings${onSettings ? ' active' : ''}`} aria-label="Impostazioni" onClick={() => navigate('#/settings')}>
        <Icon name="settings" size={18} />
      </button>
    </header>
  );
}
