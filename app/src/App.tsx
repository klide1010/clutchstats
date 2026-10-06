import { route } from './router';
import { isLoggedIn } from './state/session';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Nav } from './ui/Nav';
import { ToastHost } from './ui/Toast';

function Page() {
  switch (route.value.name) {
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
