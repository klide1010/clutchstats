import type { BoxScore, Player, StatLine } from '@bkstats/shared';
import { fmtMinutes, fmtPct } from '../model/export';

interface Props { bs: BoxScore; players: Player[]; showPct?: boolean }

function Cells({ l, pct }: { l: StatLine; pct: boolean }) {
  const shot = (m: number, a: number) => (pct ? fmtPct(m, a) : `${m}/${a}`);
  return (
    <>
      <td><b>{l.pts}</b></td><td>{shot(l.fg2m, l.fg2a)}</td><td>{shot(l.fg3m, l.fg3a)}</td><td>{shot(l.ftm, l.fta)}</td>
      <td>{l.oreb}</td><td>{l.dreb}</td><td>{l.reb}</td><td>{l.ast}</td><td>{l.tov}</td><td>{l.stl}</td>
      <td>{l.blk}</td><td>{l.blkR}</td><td>{l.pf}</td><td>{l.pfd}</td><td>{l.screens}</td>
    </>
  );
}

export function BoxScoreTable({ bs, players, showPct = false }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  return (
    <div class="table-wrap">
      <table class="stats">
        <thead>
          <tr><th class="sticky">Giocatore</th><th>Min</th><th>PT</th><th>T2</th><th>T3</th><th>TL</th><th>RO</th><th>RD</th><th>RT</th><th>AS</th><th>PP</th><th>PR</th><th>ST</th><th>SS</th><th>FF</th><th>FS</th><th>BL</th><th>+/-</th><th>Val</th></tr>
        </thead>
        <tbody>
          {bs.players.map((l) => {
            const p = byId.get(l.playerId);
            return (
              <tr key={l.playerId}>
                <td class="sticky"><b>{p ? `#${p.number}` : ''}</b> {p?.lastName ?? l.playerId}</td>
                <td>{fmtMinutes(l.seconds)}</td>
                <Cells l={l} pct={showPct} />
                <td>{l.plusMinus > 0 ? `+${l.plusMinus}` : l.plusMinus}</td><td><b>{l.rating}</b></td>
              </tr>
            );
          })}
          <tr class="total"><td class="sticky">Squadra</td><td></td><Cells l={bs.team} pct={showPct} /><td></td><td></td></tr>
          <tr class="total"><td class="sticky">Avversari</td><td></td><Cells l={bs.opponent} pct={showPct} /><td></td><td></td></tr>
        </tbody>
      </table>
    </div>
  );
}
