import { route } from './router';
import { isLoggedIn } from './state/session';
import { myTeam } from './state/team';
import { theme } from './state/theme';
import { deriveTeamPalette, BRAND_NAVY } from './model/color';
import { effect } from '@preact/signals';

// Il colore della squadra governa i pulsanti primari, corretto per contrasto sul tema attivo.
effect(() => {
  if (typeof document === 'undefined') return;
  const p = deriveTeamPalette(myTeam.value?.color ?? BRAND_NAVY, theme.value);
  const st = document.documentElement.style;
  st.setProperty('--primary', p.primary);
  st.setProperty('--on-primary', p.onPrimary);
  st.setProperty('--primary-soft', p.soft);
  st.setProperty('--primary-border', p.border);
});
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Roster } from './pages/Roster';
import { Opponents } from './pages/Opponents';
import { Calendar } from './pages/Calendar';
import { Game } from './pages/Game';
import { GameStats } from './pages/GameStats';
import { Season } from './pages/Season';
import { Settings } from './pages/Settings';
import { Nav } from './ui/Nav';
import { ToastHost } from './ui/Toast';

function Page() {
  switch (route.value.name) {
    case 'roster':
      return <Roster />;
    case 'opponents':
      return <Opponents />;
    case 'calendar':
      return <Calendar />;
    case 'game':
      return <Game id={route.value.params.id} />;
    case 'stats':
      return <GameStats id={route.value.params.id} />;
    case 'season':
      return <Season />;
    case 'settings':
      return <Settings />;
    case 'home':
    default:
      return <Home />;
  }
}

export function App() {
  if (!isLoggedIn.value) {
    return (
      <>
        <Login />
        <ToastHost />
      </>
    );
  }
  const showNav = route.value.name !== 'game';
  return (
    <>
      <Page />
      {showNav && <Nav />}
      <ToastHost />
    </>
  );
}
