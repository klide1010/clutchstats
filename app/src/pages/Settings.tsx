import { useEffect, useState } from 'preact/hooks';
import { meta, resetDb } from '../db';
import { ensureTeam, myTeam, saveTeam } from '../state/team';
import { setToken } from '../state/session';
import { navigate } from '../router';
import { toast } from '../ui/Toast';
import { Icon } from '../ui/Icon';
import { theme, setTheme } from '../state/theme';

export function Settings() {
  const [periodMin, setPeriodMin] = useState(10);
  useEffect(() => {
    void ensureTeam();
    meta.get<number>('defaultPeriodLengthMin').then((v) => { if (v) setPeriodMin(v); });
  }, []);
  const team = myTeam.value;

  const savePeriod = async (v: number) => {
    if (!Number.isFinite(v) || v < 1 || v > 20) return;
    setPeriodMin(v);
    await meta.set('defaultPeriodLengthMin', v);
    toast('Salvato');
  };

  const wipe = async () => {
    if (!confirm('Cancellare tutti i dati locali? I dati già sincronizzati restano sul server.')) return;
    await resetDb();
    location.hash = '#/';
    location.reload();
  };

  return (
    <main class="page stack">
      <h1>Impostazioni</h1>
      <div class="card stack">
        <strong class="card-title"><Icon name="palette" size={18} /> Aspetto</strong>
        <div class="seg">
          <button class={`seg-btn btn-icon${theme.value === 'dark' ? ' active' : ''}`} onClick={() => void setTheme('dark')}><Icon name="moon" size={16} /> Scuro</button>
          <button class={`seg-btn btn-icon${theme.value === 'light' ? ' active' : ''}`} onClick={() => void setTheme('light')}><Icon name="sun" size={16} /> Chiaro</button>
        </div>
      </div>
      {team && (
        <div class="card stack">
          <strong class="card-title"><Icon name="users" size={18} /> Squadra</strong>
          <label>Nome<input value={team.name} onChange={(e) => saveTeam({ name: (e.target as HTMLInputElement).value })} /></label>
          <div class="row">
            <label>Sigla<input value={team.shortName} maxLength={4} onChange={(e) => saveTeam({ shortName: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>
            <label>Colore<input type="color" value={team.color} onChange={(e) => saveTeam({ color: (e.target as HTMLInputElement).value })} /></label>
          </div>
        </div>
      )}
      <div class="card stack">
        <strong class="card-title"><Icon name="calendar" size={18} /> Partite</strong>
        <label>Durata periodo di default (minuti)<input type="number" inputMode="numeric" min={1} max={20} value={periodMin} onChange={(e) => savePeriod(Number((e.target as HTMLInputElement).value))} /></label>
        <button class="btn btn-block" onClick={() => navigate('#/opponents')}>Squadre avversarie</button>
      </div>
      <div class="card stack">
        <strong class="card-title"><Icon name="key" size={18} /> Account</strong>
        <button class="btn btn-block btn-icon" onClick={() => { void setToken(null); }}><Icon name="logout" size={18} /> Esci</button>
        <button class="btn btn-block btn-icon btn-danger" onClick={wipe}><Icon name="trash" size={18} /> Cancella dati locali</button>
      </div>
      <p class="muted" style="text-align:center">ClutchStats · {__APP_VERSION__}</p>
    </main>
  );
}
