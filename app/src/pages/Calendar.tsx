import { useEffect, useState } from 'preact/hooks';
import { computeBoxScore, type Game } from '@bkstats/shared';
import { eventsRepo, playersRepo } from '../db';
import { games, loadGames, createGame, removeGame } from '../state/games';
import { loadOpponents, opponents, findOrCreateOpponent } from '../state/opponents';
import { navigate } from '../router';
import { IcsImport, fmtDate } from '../ui/IcsImport';
import { toast } from '../ui/Toast';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';
import { groupGames, venueLabel, type Score } from '../model/gameView';

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

function GameRow({ g, name, score, onOpen }: { g: Game; name: string; score?: Score; onOpen: () => void }) {
  const result = score ? (score.us > score.them ? 'won' : score.us < score.them ? 'lost' : 'tie') : null;
  return (
    <li>
      <span class={`game-dot ${g.status.toLowerCase()}`} aria-hidden="true" />
      <span style="flex:1;min-width:0" onClick={onOpen}>
        <b>{g.home ? 'vs' : '@'} {name}</b><br />
        <span class="muted">{fmtDate(g.date)}{g.venue ? ` · ${venueLabel(g.venue)}` : ''}{g.useClock ? ' · cronometro' : ''}</span>
      </span>
      {score && (
        <span class="game-score" onClick={onOpen}>
          <b>{score.us}–{score.them}</b>
          <span class={`result-badge ${result}`}>{result === 'won' ? 'V' : result === 'lost' ? 'P' : 'N'}</span>
        </span>
      )}
      {g.status === 'SCHEDULED' && <button class="btn btn-sm btn-icon icon-only btn-ghost danger" aria-label="Elimina" onClick={() => { if (confirm('Eliminare la partita?')) void removeGame(g.id); }}><Icon name="trash" size={16} /></button>}
    </li>
  );
}

export function Calendar() {
  const [mode, setMode] = useState<'list' | 'new' | 'ics'>('list');
  const [scores, setScores] = useState<Record<string, Score>>({});
  useEffect(() => { void loadGames(); void loadOpponents(); }, []);

  // Risultato delle partite chiuse, ricalcolato dagli eventi quando cambia l'elenco.
  useEffect(() => {
    (async () => {
      const closed = games.value.filter((g) => g.status === 'CLOSED');
      const s: Record<string, Score> = {};
      for (const g of closed) {
        const [events, players] = await Promise.all([eventsRepo.byGame(g.id), playersRepo.byTeam(g.teamId)]);
        s[g.id] = computeBoxScore(g, events, players).score;
      }
      setScores(s);
    })();
  }, [games.value]);

  const opponentName = (id: string) => opponents.value.find((o) => o.id === id)?.name ?? 'Avversario';
  const open = (g: Game) => navigate(g.status === 'CLOSED' ? `#/stats/${g.id}` : `#/game/${g.id}`);
  const { live, upcoming, played } = groupGames(games.value);
  const section = (title: string, list: Game[]) => list.length > 0 && (
    <>
      <h2 class="list-section">{title}</h2>
      <ul class="list">
        {list.map((g) => <GameRow key={g.id} g={g} name={opponentName(g.opponentId)} score={scores[g.id]} onOpen={() => open(g)} />)}
      </ul>
    </>
  );

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
      {section('In corso', live)}
      {section('Prossime', upcoming)}
      {section('Giocate', played)}
      {games.value.length === 0 && <p class="muted">Nessuna partita. Creane una o importa un calendario.</p>}
    </main>
  );
}
