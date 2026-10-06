import { route } from './router';
import { isLoggedIn } from './state/session';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Roster } from './pages/Roster';
import { Opponents } from './pages/Opponents';
import { Calendar } from './pages/Calendar';
import { Game } from './pages/Game';
import { GameStats } from './pages/GameStats';
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
