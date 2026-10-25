import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { computeBoxScore, periodLabel, type BoxScore, type Game, type GameEvent, type Opponent, type Player } from '@bkstats/shared';
import { eventsRepo, gamesRepo, opponentsRepo, playersRepo } from '../db';
import { BoxScoreTable } from '../ui/BoxScoreTable';
import { ShotChart } from '../ui/ShotChart';
import { boxScoreToCsv, downloadText, gameToJson } from '../model/export';
import { gameReportPdf } from '../model/pdf';
import { countSpecialFouls } from '../model/fouls';
import { ensureTeam } from '../state/team';
import { eventLabel } from '../state/liveGame';
import { fmtClock } from '../ui/TopBar';
import { fmtDate } from '../ui/IcsImport';
import { navigate } from '../router';
import { updateGame } from '../state/games';
import { toast } from '../ui/Toast';
import { SyncButton } from '../ui/SyncButton';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';
import { historyByPeriod, opponentByJersey, venueLabel } from '../model/gameView';

interface Loaded { game: Game; events: GameEvent[]; players: Player[]; opponent: Opponent; bs: BoxScore; teamName: string }

export function GameStats({ id }: { id: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [tab, setTab] = useState<'box' | 'shots' | 'history'>('box');

  const load = async () => {
    const game = await gamesRepo.get(id);
    if (!game) return;
    const [events, players, opponent, team] = await Promise.all([eventsRepo.byGame(id), playersRepo.byTeam(game.teamId), opponentsRepo.get(game.opponentId), ensureTeam()]);
    const opp = opponent ?? { id: game.opponentId, name: 'Avversario', shortName: 'AVV', roster: [], updatedAt: 0, deleted: false };
    const called = game.roster && game.roster.length ? players.filter((p) => game.roster!.includes(p.id)) : players;
    setData({ game, events, players: called, opponent: opp, bs: computeBoxScore(game, events, called), teamName: team.name });
  };
  useEffect(() => { void load(); }, [id]);

  if (!data) return <main class="page"><p class="muted">Caricamento…</p></main>;
  const { game, events, players, opponent, bs, teamName } = data;
  const slug = `${game.date.slice(0, 10)}_${opponent.shortName}`;
  const oppRows = opponentByJersey(bs.opponent.pointsByJersey, bs.opponent.foulsByJersey);

  const reopen = async () => {
    if (!confirm('Riaprire la partita?')) return;
    await updateGame(game.id, { status: 'LIVE' });
    navigate(`#/game/${game.id}`);
  };

  return (
    <main class="page stack">
      <PageTitle icon="chart" onBack={() => navigate('#/calendar')} subtitle={`${fmtDate(game.date)}${game.venue ? ` · ${venueLabel(game.venue)}` : ''}`}>{game.home ? 'vs' : '@'} {opponent.name}</PageTitle>
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
          <BoxScoreTable bs={bs} players={players} special={countSpecialFouls(events)} />
          {oppRows.length > 0 && (
            <>
              <h2 class="list-section">Avversari per numero</h2>
              <div class="table-wrap" style="align-self:flex-start">
                <table class="stats compact">
                  <thead><tr><th class="sticky">#</th>{oppRows.map((r) => <th key={r.number}>{r.number}</th>)}</tr></thead>
                  <tbody>
                    <tr><td class="sticky">PT</td>{oppRows.map((r) => <td key={r.number}>{r.pts}</td>)}</tr>
                    <tr><td class="sticky">FF</td>{oppRows.map((r) => <td key={r.number}>{r.fouls}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      {tab === 'shots' && <ShotChart game={game} events={events} players={players} />}
      {tab === 'history' && (
        <ul class="list history">
          {historyByPeriod(events).map((p) => (
            <Fragment key={p.period}>
              <li class="history-period"><span>{periodLabel(p.period, game.periodsRegulation)}</span><span>{p.us} – {p.them}</span></li>
              {p.rows.map(({ e, score }) => (
                <li key={e.id}>
                  {e.clockSec !== undefined && <span class="muted" style="flex:0 0 3em">{fmtClock(e.clockSec)}</span>}
                  <span style="flex:1">{eventLabel(e, players)}</span>
                  {score && <span class="run-score">{e.side === 'US' ? <b class="accent-text">{score.us}</b> : score.us}–{e.side === 'THEM' ? <b class="accent-text">{score.them}</b> : score.them}</span>}
                </li>
              ))}
            </Fragment>
          ))}
        </ul>
      )}
      <div class="row">
        <button class="btn btn-icon" onClick={() => { downloadText(`bkstats_${slug}.pdf`, 'application/pdf', gameReportPdf({ teamName, game, events, players, opponent, bs, dateLabel: fmtDate(game.date) })); toast('PDF scaricato'); }}><Icon name="download" size={18} /> PDF</button>
        <button class="btn btn-icon" onClick={() => { downloadText(`bkstats_${slug}.csv`, 'text/csv;charset=utf-8', boxScoreToCsv(bs, players)); toast('CSV esportato'); }}><Icon name="download" size={18} /> CSV</button>
        <button class="btn btn-icon" onClick={() => { downloadText(`bkstats_${slug}.json`, 'application/json', gameToJson(game, events, players, opponent, bs)); toast('JSON esportato'); }}><Icon name="download" size={18} /> JSON</button>
      </div>
      {game.status === 'CLOSED' && <SyncButton label="Sincronizza ora" />}
      {game.status === 'CLOSED' ? <button class="btn btn-block" onClick={reopen}>Riapri partita</button>
        : <button class="btn btn-block btn-primary" onClick={() => navigate(`#/game/${game.id}`)}>{game.status === 'LIVE' ? 'Torna alla partita' : 'Apri partita'}</button>}
    </main>
  );
}
