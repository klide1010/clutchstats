import { useState } from 'preact/hooks';
import { ApiError, login } from '../api/client';
import { trySync } from '../api/sync';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: Event) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      void trySync(); // riprende la sync dopo il login, senza bloccare
    } catch (err) {
      if (err instanceof ApiError) setError(err.status === 401 ? 'Password errata' : err.status === 429 ? 'Troppi tentativi, riprova tra qualche minuto' : `Errore server ${err.status}`);
      else setError('Rete assente');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main class="page login">
      <h1>BKStats</h1>
      <form onSubmit={submit} class="stack">
        <label>
          Password
          <input type="password" value={password} onInput={(e) => setPassword((e.target as HTMLInputElement).value)} autoFocus />
        </label>
        {error && <p class="error">{error}</p>}
        <button class="btn btn-primary" type="submit" disabled={busy || !password}>Entra</button>
      </form>
    </main>
  );
}
