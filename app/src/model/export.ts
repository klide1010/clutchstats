import type { BoxScore, Game, GameEvent, Opponent, Player, StatLine } from '@bkstats/shared';

export const CSV_HEADER = 'N;Giocatore;Min;PT;T2;T3;TL;RO;RD;RT;AS;PP;PR;ST;SS;FF;FS;BL;+/-;Val';

export function fmtMinutes(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function fmtPct(made: number, att: number): string {
  return att === 0 ? '-' : `${Math.round((made / att) * 100)}%`;
}

function statCells(l: StatLine): string[] {
  return [
    String(l.pts), `${l.fg2m}/${l.fg2a}`, `${l.fg3m}/${l.fg3a}`, `${l.ftm}/${l.fta}`,
    String(l.oreb), String(l.dreb), String(l.reb), String(l.ast), String(l.tov), String(l.stl),
    String(l.blk), String(l.blkR), String(l.pf), String(l.pfd), String(l.screens),
  ];
}

export function boxScoreToCsv(bs: BoxScore, players: Player[]): string {
  const byId = new Map(players.map((p) => [p.id, p]));
  const rows: string[] = [CSV_HEADER];
  for (const l of bs.players) {
    const p = byId.get(l.playerId);
    rows.push([p ? String(p.number) : '', p ? `${p.lastName} ${p.firstName}`.trim() : l.playerId, fmtMinutes(l.seconds), ...statCells(l), String(l.plusMinus), String(l.rating)].join(';'));
  }
  rows.push(['Squadra', '', '', ...statCells(bs.team), '', ''].join(';'));
  rows.push(['Avversari', '', '', ...statCells(bs.opponent), '', ''].join(';'));
  return rows.join('\n');
}

export function gameToJson(game: Game, events: GameEvent[], players: Player[], opponent: Opponent, bs: BoxScore): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), game, opponent, players, events: events.filter((e) => !e.deleted), boxScore: bs }, null, 2);
}

export function downloadText(filename: string, mime: string, text: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
