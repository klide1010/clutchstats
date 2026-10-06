import { useEffect, useState } from 'preact/hooks';
import { meta, resetDb } from '../db';
import { ensureTeam, myTeam, saveTeam } from '../state/team';
import { setToken } from '../state/session';
import { navigate } from '../router';
import { toast } from '../ui/Toast';

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
      {team && (
        <div class="card stack">
          <strong>Squadra</strong>
          <label>Nome<input value={team.name} onChange={(e) => saveTeam({ name: (e.target as HTMLInputElement).value })} /></label>
          <div class="row">
            <label>Sigla<input value={team.shortName} maxLength={4} onChange={(e) => saveTeam({ shortName: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>
            <label>Colore<input type="color" value={team.color} onChange={(e) => saveTeam({ color: (e.target as HTMLInputElement).value })} /></label>
          </div>
        </div>
      )}
      <div class="card stack">
        <strong>Partite</strong>
        <label>Durata periodo di default (minuti)<input type="number" inputMode="numeric" min={1} max={20} value={periodMin} onChange={(e) => savePeriod(Number((e.target as HTMLInputElement).value))} /></label>
        <button class="btn btn-block" onClick={() => navigate('#/opponents')}>Squadre avversarie</button>
      </div>
      <div class="card stack">
        <strong>Account</strong>
        <button class="btn btn-block" onClick={() => { void setToken(null); }}>Esci</button>
        <button class="btn btn-block" style="border-color:var(--err)" onClick={wipe}>Cancella dati locali</button>
      </div>
      <p class="muted" style="text-align:center">BKStats · {__APP_VERSION__}</p>
    </main>
  );
}
