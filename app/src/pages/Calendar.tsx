import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { computeBoxScore, isResultOnly, manualScore, type Game } from '@bkstats/shared';
import { eventsRepo, playersRepo } from '../db';
import { games, loadGames, createGame, removeGame, setResult, clearResult, updateGame } from '../state/games';
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
  const [friendly, setFriendly] = useState(false);

  const valid = (opponentChoice !== 'NEW' || newName.trim() !== '') && date !== '';

  const save = async () => {
    const opponentId = opponentChoice === 'NEW' ? (await findOrCreateOpponent(newName)).id : opponentChoice;
    const iso = new Date(`${date}T${time || '00:00'}:00`).toISOString();
    await createGame({ opponentId, date: iso, home, useClock, venue: venue.trim() || undefined, competition: competition.trim() || undefined, friendly });
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
      <label class="row" style="color:var(--fg)"><input type="checkbox" style="width:auto;flex:0" checked={friendly} onChange={(e) => setFriendly((e.target as HTMLInputElement).checked)} /> Amichevole (non conta in stagione)</label>
      <label class="row" style="color:var(--fg)"><input type="checkbox" style="width:auto;flex:0" checked={useClock} onChange={(e) => setUseClock((e.target as HTMLInputElement).checked)} /> Usa cronometro</label>
      <div class="row">
        <button class="btn" onClick={onDone}>Annulla</button>
        <button class="btn btn-primary" disabled={!valid} onClick={save}>Crea</button>
      </div>
    </div>
  );
}

const scoreValue = (v: string): number | null => (/^\d{1,3}$/.test(v.trim()) ? Number(v.trim()) : null);

/**
 * Matita del calendario: amichevole sì/no e, per le partite senza statistiche, il solo risultato.
 * Lasciando vuoti i punteggi la partita resta (o torna) da giocare.
 */
export function GameEditForm({ g, onDone }: { g: Game; onDone: () => void }) {
  const canScore = g.status === 'SCHEDULED' || isResultOnly(g);
  const m = manualScore(g);
  const [us, setUs] = useState(m ? String(m.us) : '');
  const [them, setThem] = useState(m ? String(m.them) : '');
  const [friendly, setFriendly] = useState(!!g.friendly);
  const empty = us.trim() === '' && them.trim() === '';
  const valid = !canScore || empty || (scoreValue(us) !== null && scoreValue(them) !== null);

  const save = async () => {
    if (friendly !== !!g.friendly) await updateGame(g.id, { friendly });
    if (canScore) {
      if (!empty) await setResult(g.id, scoreValue(us)!, scoreValue(them)!);
      else if (m) await clearResult(g.id);
    }
    toast('Partita aggiornata');
    onDone();
  };

  return (
    <div class="game-edit stack">
      {canScore && (
        <div class="row score-inputs">
          <label>Noi<input type="number" inputMode="numeric" min={0} value={us} onInput={(e) => setUs((e.target as HTMLInputElement).value)} /></label>
          <label>Loro<input type="number" inputMode="numeric" min={0} value={them} onInput={(e) => setThem((e.target as HTMLInputElement).value)} /></label>
        </div>
      )}
      {canScore && <span class="muted" style="font-size:0.8rem">Solo risultato: niente statistiche. Lascia vuoto per tenerla da giocare.</span>}
      <label class="row" style="color:var(--fg)"><input type="checkbox" style="width:auto;flex:0" checked={friendly} onChange={(e) => setFriendly((e.target as HTMLInputElement).checked)} /> Amichevole (non conta in stagione)</label>
      <div class="row">
        <button class="btn" onClick={onDone}>Annulla</button>
        <button class="btn btn-primary" disabled={!valid} onClick={save}>Salva</button>
      </div>
    </div>
  );
}

interface RowProps { g: Game; name: string; score?: Score; editing: boolean; onOpen: () => void; onEdit: () => void; onDone: () => void }

function GameRow({ g, name, score, editing, onOpen, onEdit, onDone }: RowProps) {
  const result = score ? (score.us > score.them ? 'won' : score.us < score.them ? 'lost' : 'tie') : null;
  const resultOnly = isResultOnly(g);
  const canDelete = g.status === 'SCHEDULED' || resultOnly;
  return (
    <>
      <li>
        <span class={`game-dot ${g.status.toLowerCase()}`} aria-hidden="true" />
        <span style="flex:1;min-width:0" onClick={onOpen}>
          <b>{g.home ? 'vs' : '@'} {name}</b>{g.friendly && <span class="tag">Amichevole</span>}<br />
          <span class="muted">{fmtDate(g.date)}{g.venue ? ` · ${venueLabel(g.venue)}` : ''}{g.useClock ? ' · cronometro' : ''}{resultOnly ? ' · solo risultato' : ''}</span>
        </span>
        {score && (
          <span class="game-score" onClick={onOpen}>
            <b>{score.us}–{score.them}</b>
            <span class={`result-badge ${result}`}>{result === 'won' ? 'V' : result === 'lost' ? 'P' : 'N'}</span>
          </span>
        )}
        {g.status !== 'LIVE' && <button class="btn btn-sm btn-icon icon-only btn-ghost" aria-label="Modifica" onClick={onEdit}><Icon name="edit" size={16} /></button>}
        {canDelete && <button class="btn btn-sm btn-icon icon-only btn-ghost danger" aria-label="Elimina" onClick={() => { if (confirm('Eliminare la partita?')) void removeGame(g.id); }}><Icon name="trash" size={16} /></button>}
      </li>
      {editing && <li class="edit-row"><GameEditForm g={g} onDone={onDone} /></li>}
    </>
  );
}

/** Tab del calendario, ricordata finché l'app è aperta (tornando dalle statistiche resta quella). */
export const calendarTab = signal<'todo' | 'played'>('todo');

export function Calendar() {
  const [mode, setMode] = useState<'list' | 'new' | 'ics'>('list');
  const [scores, setScores] = useState<Record<string, Score>>({});
  const [editing, setEditing] = useState<string | null>(null);
  useEffect(() => { void loadGames(); void loadOpponents(); }, []);

  // Risultato delle partite chiuse, ricalcolato dagli eventi quando cambia l'elenco.
  useEffect(() => {
    (async () => {
      const closed = games.value.filter((g) => g.status === 'CLOSED');
      const s: Record<string, Score> = {};
      for (const g of closed) {
        const manual = manualScore(g);
        if (manual) { s[g.id] = manual; continue; }
        const [events, players] = await Promise.all([eventsRepo.byGame(g.id), playersRepo.byTeam(g.teamId)]);
        s[g.id] = computeBoxScore(g, events, players).score;
      }
      setScores(s);
    })();
  }, [games.value]);

  const opponentName = (id: string) => opponents.value.find((o) => o.id === id)?.name ?? 'Avversario';
  const open = (g: Game) => {
    if (isResultOnly(g)) setEditing(editing === g.id ? null : g.id);
    else navigate(g.status === 'CLOSED' ? `#/stats/${g.id}` : `#/game/${g.id}`);
  };
  const { live, upcoming, played } = groupGames(games.value);
  const tab = calendarTab.value;
  const section = (title: string | null, list: Game[]) => list.length > 0 && (
    <>
      {title && <h2 class="list-section">{title}</h2>}
      <ul class="list">
        {list.map((g) => (
          <GameRow key={g.id} g={g} name={opponentName(g.opponentId)} score={scores[g.id]} editing={editing === g.id}
            onOpen={() => open(g)} onEdit={() => setEditing(editing === g.id ? null : g.id)} onDone={() => setEditing(null)} />
        ))}
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
      {games.value.length > 0 && (
        <div class="seg" role="tablist">
          <button role="tab" aria-selected={tab === 'todo'} class={`seg-btn${tab === 'todo' ? ' active' : ''}`} onClick={() => { calendarTab.value = 'todo'; setEditing(null); }}>Da giocare ({live.length + upcoming.length})</button>
          <button role="tab" aria-selected={tab === 'played'} class={`seg-btn${tab === 'played' ? ' active' : ''}`} onClick={() => { calendarTab.value = 'played'; setEditing(null); }}>Giocate ({played.length})</button>
        </div>
      )}
      {tab === 'todo' && section(live.length ? 'In corso' : null, live)}
      {tab === 'todo' && section(live.length && upcoming.length ? 'Prossime' : null, upcoming)}
      {tab === 'todo' && games.value.length > 0 && live.length + upcoming.length === 0 && <p class="muted">Nessuna partita da giocare.</p>}
      {tab === 'played' && section(null, played)}
      {tab === 'played' && played.length === 0 && <p class="muted">Nessuna partita giocata.</p>}
      {games.value.length === 0 && <p class="muted">Nessuna partita. Creane una o importa un calendario.</p>}
    </main>
  );
}
