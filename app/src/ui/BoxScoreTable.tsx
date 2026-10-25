import type { BoxScore, Player, StatLine } from '@bkstats/shared';
import { fmtMinutes } from '../model/export';
import { SPECIAL_COLS, type KindCounts, type SpecialFouls } from '../model/fouls';
import { didNotPlay } from '../model/gameView';

interface Props { bs: BoxScore; players: Player[]; special?: SpecialFouls }

/** Tiri segnati/tentati con la percentuale sotto (riga vuota senza tentativi, per tenere le righe alte uguali). */
export function Shot({ m, a }: { m: number; a: number }) {
  return <td>{m}/{a}<span class="pct">{a > 0 ? `${Math.round((m / a) * 100)}%` : ''}</span></td>;
}

function Cells({ l, extra }: { l: StatLine; extra: (string | number)[] }) {
  return (
    <>
      <td><b>{l.pts}</b></td><Shot m={l.fg2m} a={l.fg2a} /><Shot m={l.fg3m} a={l.fg3a} /><Shot m={l.ftm} a={l.fta} />
      <td>{l.oreb}</td><td>{l.dreb}</td><td>{l.reb}</td><td>{l.ast}</td><td>{l.tov}</td><td>{l.stl}</td>
      <td>{l.blk}</td><td>{l.blkR}</td><td>{l.pf}</td>{extra.map((v, i) => <td key={i}>{v}</td>)}<td>{l.pfd}</td><td>{l.screens}</td>
    </>
  );
}

export function BoxScoreTable({ bs, players, special }: Props) {
  const byId = new Map(players.map((p) => [p.id, p]));
  const cols = special ? SPECIAL_COLS.filter((c) => special.kinds.includes(c.kind)) : [];
  const extra = (k?: KindCounts) => cols.map((c) => (k ? k[c.kind] : 0));
  // Chi non è entrato in fondo, nello stesso ordine di maglia.
  const lines = bs.players.filter((l) => !didNotPlay(l)).concat(bs.players.filter(didNotPlay));
  return (
    <>
      <div class="table-wrap">
        <table class="stats">
          <thead>
            <tr><th class="sticky">Giocatore</th><th>Min</th><th>PT</th><th>T2</th><th>T3</th><th>TL</th><th>RO</th><th>RD</th><th>RT</th><th>AS</th><th>PP</th><th>PR</th><th>ST</th><th>SS</th><th>FF</th>{cols.map((c) => <th key={c.abbr}>{c.abbr}</th>)}<th>FS</th><th>BL</th><th>+/-</th><th>Val</th></tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const p = byId.get(l.playerId);
              const dnp = didNotPlay(l);
              return (
                <tr key={l.playerId} class={dnp ? 'dnp' : undefined}>
                  <td class="sticky"><span class="name-cell"><b>{p ? `#${p.number}` : ''}</b> {p?.lastName ?? l.playerId}</span></td>
                  <td>{dnp ? 'N.E.' : fmtMinutes(l.seconds)}</td>
                  <Cells l={l} extra={extra(special?.byPlayer[l.playerId])} />
                  <td>{l.plusMinus > 0 ? `+${l.plusMinus}` : l.plusMinus}</td><td><b>{l.rating}</b></td>
                </tr>
              );
            })}
            <tr class="total"><td class="sticky">Squadra</td><td></td><Cells l={bs.team} extra={extra(special?.team)} /><td></td><td></td></tr>
            <tr class="total"><td class="sticky">Avversari</td><td></td><Cells l={bs.opponent} extra={extra(special?.opponent)} /><td></td><td></td></tr>
          </tbody>
        </table>
      </div>
      {cols.length > 0 && <p class="muted" style="margin:0;font-size:0.8rem">{cols.map((c) => `${c.abbr} ${c.label}`).join(' · ')} (già contati in FF)</p>}
    </>
  );
}
