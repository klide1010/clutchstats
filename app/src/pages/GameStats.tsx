import { useEffect, useState } from 'preact/hooks';
import { computeBoxScore, periodLabel, type BoxScore, type Game, type GameEvent, type Opponent, type Player } from '@bkstats/shared';
import { eventsRepo, gamesRepo, opponentsRepo, playersRepo } from '../db';
import { BoxScoreTable } from '../ui/BoxScoreTable';
import { ShotChart } from '../ui/ShotChart';
import { boxScoreToCsv, downloadText, gameToJson } from '../model/export';
import { eventLabel } from '../state/liveGame';
import { fmtClock } from '../ui/TopBar';
import { fmtDate } from '../ui/IcsImport';
import { navigate } from '../router';
import { updateGame } from '../state/games';
import { toast } from '../ui/Toast';
import { SyncButton } from '../ui/SyncButton';

interface Loaded { game: Game; events: GameEvent[]; players: Player[]; opponent: Opponent; bs: BoxScore }

export function GameStats({ id }: { id: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [tab, setTab] = useState<'box' | 'shots' | 'history'>('box');
  const [pct, setPct] = useState(false);

  const load = async () => {
    const game = await gamesRepo.get(id);
    if (!game) return;
    const [events, players, opponent] = await Promise.all([eventsRepo.byGame(id), playersRepo.byTeam(game.teamId), opponentsRepo.get(game.opponentId)]);
    const opp = opponent ?? { id: game.opponentId, name: 'Avversario', shortName: 'AVV', roster: [], updatedAt: 0, deleted: false };
    const called = game.roster && game.roster.length ? players.filter((p) => game.roster!.includes(p.id)) : players;
    setData({ game, events, players: called, opponent: opp, bs: computeBoxScore(game, events, called) });
  };
  useEffect(() => { void load(); }, [id]);

  if (!data) return <main class="page"><p class="muted">Caricamento…</p></main>;
  const { game, events, players, opponent, bs } = data;
  const slug = `${game.date.slice(0, 10)}_${opponent.shortName}`;

  const reopen = async () => {
    if (!confirm('Riaprire la partita?')) return;
    await updateGame(game.id, { status: 'LIVE' });
    navigate(`#/game/${game.id}`);
  };

  return (
    <main class="page stack">
      <div class="row">
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => navigate('#/calendar')}>‹</button>
        <h1 style="margin:0;font-size:1.1rem">{game.home ? 'vs' : '@'} {opponent.name}<br /><span class="muted" style="font-size:0.85rem;font-weight:400">{fmtDate(game.date)}{game.venue ? ` · ${game.venue}` : ''}</span></h1>
      </div>
      <div class="card">
        <div class="final-score"><span>NOI</span><b>{bs.score.us}</b><span class="muted">–</span><b>{bs.score.them}</b><span>{opponent.shortName}</span></div>
        <div class="row muted" style="font-size:0.85rem;justify-content:center;flex-wrap:wrap">
          {bs.scoreByPeriod.map((p) => <span key={p.period} style="flex:0 0 auto">{periodLabel(p.period, game.periodsRegulation)} {p.us}-{p.them}</span>)}
        </div>
        {game.status !== 'CLOSED' && <p class="muted" style="text-align:center;margin:6px 0 0">Partita {game.status === 'LIVE' ? 'in corso' : 'programmata'}</p>}
      </div>
      <div class="seg">
        <button class={`seg-btn${tab === 'box' ? ' active' : ''}`} onClick={() => setTab('box')}>Box score</button>
        <button class={`seg-btn${tab === 'shots' ? ' active' : ''}`} onClick={() => setTab('shots')}>Tiri</button>
        <button class={`seg-btn${tab === 'history' ? ' active' : ''}`} onClick={() => setTab('history')}>Cronologia</button>
      </div>
      {tab === 'box' && (
        <>
          <label class="row" style="color:var(--fg)"><input type="checkbox" style="width:auto;flex:0" checked={pct} onChange={(e) => setPct((e.target as HTMLInputElement).checked)} /> Mostra percentuali</label>
          <BoxScoreTable bs={bs} players={players} showPct={pct} />
          {Object.keys(bs.opponent.foulsByJersey).length > 0 && (
            <p class="muted">Falli avversari: {Object.entries(bs.opponent.foulsByJersey).map(([n, f]) => `#${n}: ${f}`).join(', ')}</p>
          )}
          {Object.keys(bs.opponent.pointsByJersey).length > 0 && (
            <p class="muted">Punti avversari: {Object.entries(bs.opponent.pointsByJersey).map(([n, p]) => `#${n}: ${p}`).join(', ')}</p>
          )}
        </>
      )}
      {tab === 'shots' && <ShotChart game={game} events={events} players={players} />}
      {tab === 'history' && (
        <ul class="list history">
          {events.filter((e) => !e.deleted).slice().reverse().map((e) => (
            <li key={e.id}>
              <span class="muted" style="flex:0 0 3.6em">{periodLabel(e.period, game.periodsRegulation)}{e.clockSec !== undefined ? ` ${fmtClock(e.clockSec)}` : ''}</span>
              <span style="flex:1">{eventLabel(e, players)}</span>
            </li>
          ))}
        </ul>
      )}
      <div class="row">
        <button class="btn" onClick={() => { downloadText(`bkstats_${slug}.csv`, 'text/csv;charset=utf-8', boxScoreToCsv(bs, players)); toast('CSV esportato'); }}>Esporta CSV</button>
        <button class="btn" onClick={() => { downloadText(`bkstats_${slug}.json`, 'application/json', gameToJson(game, events, players, opponent, bs)); toast('JSON esportato'); }}>Esporta JSON</button>
      </div>
      {game.status === 'CLOSED' && <SyncButton label="Sincronizza ora" />}
      {game.status === 'CLOSED' ? <button class="btn btn-block" onClick={reopen}>Riapri partita</button>
        : <button class="btn btn-block btn-primary" onClick={() => navigate(`#/game/${game.id}`)}>{game.status === 'LIVE' ? 'Torna alla partita' : 'Apri partita'}</button>}
    </main>
  );
}
