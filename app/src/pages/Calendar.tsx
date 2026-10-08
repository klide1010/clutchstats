import { useEffect, useState } from 'preact/hooks';
import type { Game } from '@bkstats/shared';
import { games, loadGames, createGame, removeGame } from '../state/games';
import { loadOpponents, opponents, findOrCreateOpponent } from '../state/opponents';
import { navigate } from '../router';
import { IcsImport, fmtDate } from '../ui/IcsImport';
import { toast } from '../ui/Toast';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';

function NewGameForm({ onDone }: { onDone: () => void }) {
  const [opponentChoice, setOpponentChoice] = useState<string>(opponents.value[0]?.id ?? 'NEW');
  const [newName, setNewName] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState('18:30');
  const [home, setHome] = useState(true);
  const [useClock, setUseClock] = useState(false);
  const [venue, setVenue] = useState('');
  const [competition, setCompetition] = useState('');

  const valid = (opponentChoice !== 'NEW' || newName.trim() !== '') && date !== '';

  const save = async () => {
    const opponentId = opponentChoice === 'NEW' ? (await findOrCreateOpponent(newName)).id : opponentChoice;
    const iso = new Date(`${date}T${time || '00:00'}:00`).toISOString();
    await createGame({ opponentId, date: iso, home, useClock, venue: venue.trim() || undefined, competition: competition.trim() || undefined });
    toast('Partita creata');
    onDone();
  };

  return (
    <div class="card stack">
      <strong class="card-title"><Icon name="plus" size={18} /> Nuova partita</strong>
      <label>Avversario
        <select value={opponentChoice} onChange={(e) => setOpponentChoice((e.target as HTMLSelectElement).value)}>
          {opponents.value.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          <option value="NEW">Nuovo avversario…</option>
        </select>
      </label>
      {opponentChoice === 'NEW' && <label>Nome avversario<input value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} /></label>}
      <div class="row">
        <label>Data<input type="date" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value)} /></label>
        <label>Ora<input type="time" value={time} onInput={(e) => setTime((e.target as HTMLInputElement).value)} /></label>
      </div>
      <div class="row">
        <button class={`btn${home ? ' btn-primary' : ''}`} onClick={() => setHome(true)}>Casa</button>
        <button class={`btn${!home ? ' btn-primary' : ''}`} onClick={() => setHome(false)}>Trasferta</button>
      </div>
      <label>Competizione<input value={competition} onInput={(e) => setCompetition((e.target as HTMLInputElement).value)} /></label>
      <label>Palestra<input value={venue} onInput={(e) => setVenue((e.target as HTMLInputElement).value)} /></label>
      <label class="row" style="color:var(--fg)"><input type="checkbox" style="width:auto;flex:0" checked={useClock} onChange={(e) => setUseClock((e.target as HTMLInputElement).checked)} /> Usa cronometro</label>
      <div class="row">
        <button class="btn" onClick={onDone}>Annulla</button>
        <button class="btn btn-primary" disabled={!valid} onClick={save}>Crea</button>
      </div>
    </div>
  );
}

function statusLabel(g: Game): string {
  if (g.status === 'LIVE') return 'In corso';
  if (g.status === 'CLOSED') return 'Chiusa';
  return 'Programmata';
}

export function Calendar() {
  const [mode, setMode] = useState<'list' | 'new' | 'ics'>('list');
  useEffect(() => { void loadGames(); void loadOpponents(); }, []);

  const opponentName = (id: string) => opponents.value.find((o) => o.id === id)?.name ?? 'Avversario';
  const open = (g: Game) => navigate(g.status === 'CLOSED' ? `#/stats/${g.id}` : `#/game/${g.id}`);

  return (
    <main class="page stack">
      <PageTitle icon="calendar">Calendario</PageTitle>
      {mode === 'list' && (
        <div class="row">
          <button class="btn btn-icon" onClick={() => setMode('new')}><Icon name="plus" size={18} /> Nuova partita</button>
          <button class="btn btn-icon" onClick={() => setMode('ics')}><Icon name="upload" size={18} /> Importa .ics</button>
        </div>
      )}
      {mode === 'new' && <NewGameForm onDone={() => setMode('list')} />}
      {mode === 'ics' && <IcsImport onDone={() => setMode('list')} />}
      <ul class="list">
        {games.value.map((g) => (
          <li key={g.id}>
            <span class={`game-dot ${g.status.toLowerCase()}`} aria-hidden="true" />
            <span style="flex:1" onClick={() => open(g)}>
              <b>{fmtDate(g.date)}</b> · {g.home ? 'vs' : '@'} {opponentName(g.opponentId)}<br />
              <span class="muted">{statusLabel(g)}{g.venue ? ` · ${g.venue}` : ''}{g.useClock ? ' · cronometro' : ''}</span>
            </span>
            {g.status === 'SCHEDULED' && <button class="btn btn-sm btn-icon icon-only btn-ghost danger" aria-label="Elimina" onClick={() => { if (confirm('Eliminare la partita?')) void removeGame(g.id); }}><Icon name="trash" size={16} /></button>}
          </li>
        ))}
        {games.value.length === 0 && <li class="muted">Nessuna partita. Creane una o importa un calendario.</li>}
      </ul>
    </main>
  );
}
