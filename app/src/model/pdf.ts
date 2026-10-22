import { COURT, periodLabel, type BoxScore, type Game, type GameEvent, type Opponent, type Player, type StatLine } from '@bkstats/shared';
import { shotPosition } from '../ui/Court';
import { fmtMinutes } from './export';

// Generatore PDF minimo, senza librerie: testo Helvetica (WinAnsi), rettangoli, linee e tracciati.
// Basta per un referto di una pagina e gira anche su Chrome 65.

type Rgb = [number, number, number];
interface TextOpts { size?: number; bold?: boolean; color?: Rgb; align?: 'left' | 'center' | 'right' }

const A4_W = 595;
const A4_H = 842;

// Larghezze Helvetica (AFM, millesimi di em) per i caratteri 32–126.
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667,
  611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833,
  556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const WIN_ANSI: Record<string, number> = { '€': 0x80, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };

function encode(s: string): string {
  let out = '';
  for (const ch of s) {
    const mapped = WIN_ANSI[ch];
    const c = mapped ?? ch.charCodeAt(0);
    const b = mapped !== undefined || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) ? c : 63; // '?'
    const t = String.fromCharCode(b);
    out += t === '\\' || t === '(' || t === ')' ? '\\' + t : t;
  }
  return out;
}

export function textWidth(s: string, size: number, bold = false): number {
  let w = 0;
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    w += c >= 32 && c <= 126 ? HELV[c - 32] : 556;
  }
  return (w / 1000) * size * (bold ? 1.06 : 1);
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const rgb = (c: Rgb, op: 'rg' | 'RG') => `${n(c[0] / 255)} ${n(c[1] / 255)} ${n(c[2] / 255)} ${op}`;

/** Pagine A4 verticali, coordinate con origine in alto a sinistra (y verso il basso). */
export class PdfDoc {
  private pages: string[][] = [];
  private cur: string[] = [];

  constructor() { this.pages.push(this.cur); }

  readonly width = A4_W;
  readonly height = A4_H;

  addPage(): void { this.cur = []; this.pages.push(this.cur); }

  text(x: number, y: number, s: string, o: TextOpts = {}): void {
    const size = o.size ?? 9;
    const w = textWidth(s, size, o.bold);
    const tx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    this.cur.push(`BT ${rgb(o.color ?? [20, 24, 32], 'rg')} /${o.bold ? 'F2' : 'F1'} ${n(size)} Tf ${n(tx)} ${n(A4_H - y)} Td (${encode(s)}) Tj ET`);
  }

  rect(x: number, y: number, w: number, h: number, fill?: Rgb, stroke?: Rgb, lw = 0.5): void {
    const ops = [`${n(x)} ${n(A4_H - y - h)} ${n(w)} ${n(h)} re`];
    if (fill) ops.unshift(rgb(fill, 'rg'));
    if (stroke) ops.unshift(`${rgb(stroke, 'RG')} ${n(lw)} w`);
    ops.push(fill && stroke ? 'B' : fill ? 'f' : 'S');
    this.cur.push(ops.join(' '));
  }

  /** Spezzata aperta (o chiusa e riempita se `fill`). */
  poly(points: [number, number][], stroke: Rgb, lw = 0.8, fill?: Rgb): void {
    if (points.length < 2) return;
    const path = points.map(([x, y], i) => `${n(x)} ${n(A4_H - y)} ${i ? 'l' : 'm'}`).join(' ');
    this.cur.push(`${rgb(stroke, 'RG')} ${n(lw)} w ${fill ? rgb(fill, 'rg') + ' ' : ''}${path} ${fill ? 'b' : 'S'}`);
  }

  line(x1: number, y1: number, x2: number, y2: number, stroke: Rgb, lw = 0.8): void {
    this.poly([[x1, y1], [x2, y2]], stroke, lw);
  }

  /** Arco come spezzata, angoli in radianti (0 = destra, senso orario sullo schermo). */
  arc(cx: number, cy: number, r: number, from: number, to: number, stroke: Rgb, lw = 0.8): void {
    const steps = Math.max(8, Math.ceil(Math.abs(to - from) * r / 2));
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const a = from + ((to - from) * i) / steps;
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    this.poly(pts, stroke, lw);
  }

  circle(cx: number, cy: number, r: number, stroke: Rgb, lw = 0.8, fill?: Rgb): void {
    const k = 0.5523 * r;
    const Y = (y: number) => n(A4_H - y);
    const p = [
      `${n(cx + r)} ${Y(cy)} m`,
      `${n(cx + r)} ${Y(cy + k)} ${n(cx + k)} ${Y(cy + r)} ${n(cx)} ${Y(cy + r)} c`,
      `${n(cx - k)} ${Y(cy + r)} ${n(cx - r)} ${Y(cy + k)} ${n(cx - r)} ${Y(cy)} c`,
      `${n(cx - r)} ${Y(cy - k)} ${n(cx - k)} ${Y(cy - r)} ${n(cx)} ${Y(cy - r)} c`,
      `${n(cx + k)} ${Y(cy - r)} ${n(cx + r)} ${Y(cy - k)} ${n(cx + r)} ${Y(cy)} c`,
    ].join(' ');
    this.cur.push(`${rgb(stroke, 'RG')} ${n(lw)} w ${fill ? rgb(fill, 'rg') + ' ' : ''}${p} ${fill ? 'b' : 'S'}`);
  }

  /** Il file PDF come byte (tutti i caratteri sono già a un byte). */
  toBytes(): Uint8Array<ArrayBuffer> {
    const objs: string[] = [];
    const kids = this.pages.map((_, i) => `${5 + i * 2} 0 R`).join(' ');
    objs.push('<< /Type /Catalog /Pages 2 0 R >>');
    objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`);
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    for (let i = 0; i < this.pages.length; i++) {
      const content = this.pages[i].join('\n');
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
      objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    }
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets: number[] = [];
    objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}

// ---- Referto della partita ----

const INK: Rgb = [20, 24, 32];
const MUTED: Rgb = [110, 120, 136];
const NAVY: Rgb = [30, 45, 80];
const LINE: Rgb = [205, 211, 222];
const HEAD: Rgb = [233, 236, 242];
const ZEBRA: Rgb = [246, 247, 250];
const OK: Rgb = [30, 150, 90];
const ERR: Rgb = [215, 70, 55];
const COURT_LINE: Rgb = [90, 120, 190];
const RIM: Rgb = [235, 140, 60];

const COLS = ['Giocatore', 'Min', 'PT', 'T2', 'T3', 'TL', 'RO', 'RD', 'RT', 'AS', 'PP', 'PR', 'ST', 'SS', 'FF', 'FS', 'BL', '+/-', 'Val'];

function cells(l: StatLine): string[] {
  return [
    String(l.pts), `${l.fg2m}/${l.fg2a}`, `${l.fg3m}/${l.fg3a}`, `${l.ftm}/${l.fta}`,
    String(l.oreb), String(l.dreb), String(l.reb), String(l.ast), String(l.tov), String(l.stl),
    String(l.blk), String(l.blkR), String(l.pf), String(l.pfd), String(l.screens),
  ];
}

function fit(s: string, max: number, size: number, bold = false): string {
  if (textWidth(s, size, bold) <= max) return s;
  let t = s;
  while (t.length > 1 && textWidth(t + '…', size, bold) > max) t = t.slice(0, -1);
  return t + '…';
}

function wrap(s: string, max: number, size: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(t, size) > max) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

function distanceM(e: GameEvent): number {
  const xm = (e.x ?? 0.5) * COURT.widthM - COURT.basketX;
  const ym = (e.y ?? 0) * COURT.depthM - COURT.basketY;
  return Math.sqrt(xm * xm + ym * ym);
}

function zonesLine(shots: GameEvent[]): string {
  const z = (pred: (e: GameEvent) => boolean) => {
    const s = shots.filter(pred);
    const m = s.filter((e) => e.made).length;
    return `${m}/${s.length}${s.length ? ` (${Math.round((m / s.length) * 100)}%)` : ''}`;
  };
  return `Sotto canestro ${z((e) => e.type !== 'FREE_THROW' && distanceM(e) < 2)} · Da 2 ${z((e) => e.type === 'SHOT_2' && distanceM(e) >= 2)} · Da 3 ${z((e) => e.type === 'SHOT_3')} · Liberi ${z((e) => e.type === 'FREE_THROW')}`;
}

/** Mezzo campo come in `Court.tsx` (viewBox 150 × 140 dm) scalato in un riquadro largo `w`. */
function drawCourt(doc: PdfDoc, x0: number, y0: number, w: number, shots: GameEvent[]): number {
  const s = w / 150;
  const h = 140 * s;
  const P = (x: number, y: number): [number, number] => [x0 + x * s, y0 + y * s];
  doc.rect(x0, y0, w, h, [250, 251, 253], LINE);
  doc.rect(x0 + 50.5 * s, y0, 49 * s, 58 * s, undefined, COURT_LINE, 0.8);
  doc.circle(...P(75, 58), 18 * s, COURT_LINE);
  // linea da 3: dritti negli angoli e arco di raggio 67,5 dal canestro (75; 15,75)
  const a0 = Math.atan2(29.9 - 15.75, 9 - 75);
  const a1 = Math.atan2(29.9 - 15.75, 141 - 75);
  doc.line(...P(9, 0), ...P(9, 29.9), COURT_LINE);
  doc.line(...P(141, 0), ...P(141, 29.9), COURT_LINE);
  doc.arc(...P(75, 15.75), 67.5 * s, a0, a1, COURT_LINE);
  doc.arc(...P(75, 15.75), 12.5 * s, Math.PI, 0, COURT_LINE);
  doc.line(...P(66, 12), ...P(84, 12), INK, 1.2);
  doc.circle(...P(75, 15.75), 2.25 * s, RIM, 1);
  doc.arc(...P(75, 140), 18 * s, Math.PI, 2 * Math.PI, COURT_LINE);
  for (const e of shots) {
    const pos = shotPosition(e);
    if (!pos) continue;
    const [cx, cy] = P(pos[0], pos[1]);
    const r = (e.type === 'FREE_THROW' ? 2.2 : 3) * s;
    if (e.made) doc.circle(cx, cy, r, OK, 1, OK);
    else { doc.line(cx - r, cy - r, cx + r, cy + r, ERR, 1.2); doc.line(cx + r, cy - r, cx - r, cy + r, ERR, 1.2); }
  }
  return h;
}

export interface GameReportInput {
  teamName: string;
  game: Game;
  events: GameEvent[];
  players: Player[];
  opponent: Opponent;
  bs: BoxScore;
  /** Data della partita già formattata per la lettura. */
  dateLabel: string;
}

export function gameReportPdf({ teamName, game, events, players, opponent, bs, dateLabel }: GameReportInput): Uint8Array<ArrayBuffer> {
  const doc = new PdfDoc();
  const M = 32;
  const W = doc.width - 2 * M;
  let y = M;
  const need = (h: number) => { if (y + h > doc.height - M) { doc.addPage(); y = M; } };

  // Intestazione
  const title = game.home ? `${teamName} vs ${opponent.name}` : `${opponent.name} vs ${teamName}`;
  doc.text(M, y + 14, fit(title, W, 16, true), { size: 16, bold: true, color: NAVY });
  y += 22;
  const venue = game.venue ? game.venue.replace(/^Campo:\s*\d+\s*-\s*/i, '') : '';
  doc.text(M, y + 9, [dateLabel, venue, game.competition ?? ''].filter(Boolean).join(' · '), { size: 9, color: MUTED });
  y += 16;

  // Punteggio
  doc.rect(M, y, W, 44, HEAD);
  const left = game.home ? { label: teamName, pts: bs.score.us } : { label: opponent.name, pts: bs.score.them };
  const right = game.home ? { label: opponent.name, pts: bs.score.them } : { label: teamName, pts: bs.score.us };
  const mid = M + W / 2;
  doc.text(mid - 46, y + 29, fit(left.label, W / 2 - 80, 11, true), { size: 11, bold: true, align: 'right' });
  doc.text(mid - 12, y + 31, String(left.pts), { size: 22, bold: true, align: 'right', color: NAVY });
  doc.text(mid, y + 29, '–', { size: 16, align: 'center', color: MUTED });
  doc.text(mid + 12, y + 31, String(right.pts), { size: 22, bold: true, color: NAVY });
  doc.text(mid + 46, y + 29, fit(right.label, W / 2 - 80, 11, true), { size: 11, bold: true });
  y += 52;
  const parziali = bs.scoreByPeriod.map((p) => `${periodLabel(p.period, game.periodsRegulation)} ${game.home ? `${p.us}-${p.them}` : `${p.them}-${p.us}`}`).join('   ');
  if (parziali) { doc.text(mid, y + 9, parziali, { size: 9, align: 'center', color: MUTED }); y += 14; }
  if (game.status !== 'CLOSED') { doc.text(mid, y + 9, game.status === 'LIVE' ? 'Partita in corso: dati parziali' : 'Partita non ancora giocata', { size: 8, align: 'center', color: ERR }); y += 14; }
  y += 6;

  // Box score
  doc.text(M, y + 10, 'Box score', { size: 11, bold: true, color: NAVY });
  y += 16;
  const nameW = 104;
  const colW = (W - nameW) / (COLS.length - 1);
  const rowH = 13;
  const colX = (i: number) => (i === 0 ? M + 4 : M + nameW + colW * (i - 1) + colW / 2);
  const row = (vals: string[], o: { fill?: Rgb; bold?: boolean } = {}) => {
    need(rowH);
    if (o.fill) doc.rect(M, y, W, rowH, o.fill);
    vals.forEach((v, i) => {
      if (i === 0) doc.text(colX(0), y + 9.2, fit(v, nameW - 8, 7.5, o.bold), { size: 7.5, bold: o.bold });
      else doc.text(colX(i), y + 9.2, v, { size: 7.5, bold: o.bold || i === 2 || i === COLS.length - 1, align: 'center' });
    });
    y += rowH;
  };
  row(COLS, { fill: HEAD, bold: true });
  const byId = new Map(players.map((p) => [p.id, p]));
  bs.players.forEach((l, i) => {
    const p = byId.get(l.playerId);
    const name = p ? `#${p.number} ${p.lastName}${p.firstName ? ' ' + p.firstName.charAt(0) + '.' : ''}` : l.playerId;
    row([name, fmtMinutes(l.seconds), ...cells(l), l.plusMinus > 0 ? `+${l.plusMinus}` : String(l.plusMinus), String(l.rating)], { fill: i % 2 ? ZEBRA : undefined });
  });
  doc.line(M, y, M + W, y, LINE);
  row(['Squadra', '', ...cells(bs.team), '', ''], { bold: true });
  row([opponent.name, '', ...cells(bs.opponent), '', ''], { bold: true, fill: ZEBRA });
  y += 4;
  const legend = 'PT punti · T2/T3/TL segnati/tentati · RO/RD/RT rimbalzi off./dif./totali · AS assist · PP palle perse · PR palle recuperate · ST stoppate · SS stoppate subite · FF falli fatti · FS falli subiti · BL blocchi · Val valutazione';
  for (const l of wrap(legend, W, 6.5)) { need(8); doc.text(M, y + 7, l, { size: 6.5, color: MUTED }); y += 8; }
  y += 6;
  const fouls = Object.entries(bs.opponent.foulsByJersey);
  const pts = Object.entries(bs.opponent.pointsByJersey);
  if (pts.length) { need(12); doc.text(M, y + 8, fit(`Punti ${opponent.name}: ${pts.map(([k, v]) => `#${k} ${v}`).join(', ')}`, W, 7.5), { size: 7.5, color: MUTED }); y += 12; }
  if (fouls.length) { need(12); doc.text(M, y + 8, fit(`Falli ${opponent.name}: ${fouls.map(([k, v]) => `#${k} ${v}`).join(', ')}`, W, 7.5), { size: 7.5, color: MUTED }); y += 12; }
  y += 8;

  // Mappa tiri: noi e loro affiancati
  const live = events.filter((e) => !e.deleted && (e.type === 'FREE_THROW' || ((e.type === 'SHOT_2' || e.type === 'SHOT_3') && e.x !== undefined && e.y !== undefined)));
  const gap = 18;
  const cw = (W - gap) / 2;
  need(16 + (140 / 150) * cw + 30);
  doc.text(M, y + 10, 'Mappa tiri', { size: 11, bold: true, color: NAVY });
  y += 16;
  const sides: { label: string; shots: GameEvent[] }[] = [
    { label: teamName, shots: live.filter((e) => e.side === 'US') },
    { label: opponent.name, shots: live.filter((e) => e.side === 'THEM') },
  ];
  let ch = 0;
  sides.forEach((sd, i) => {
    const x0 = M + i * (cw + gap);
    doc.text(x0, y + 8, fit(sd.label, cw, 9, true), { size: 9, bold: true });
    ch = drawCourt(doc, x0, y + 12, cw, sd.shots);
    doc.text(x0, y + 12 + ch + 10, fit(zonesLine(sd.shots), cw, 6.5), { size: 6.5, color: MUTED });
  });
  y += 12 + ch + 18;
  doc.circle(M + 3, y + 3, 2.5, OK, 1, OK);
  doc.text(M + 9, y + 5.5, 'canestro', { size: 7, color: MUTED });
  doc.line(M + 48, y + 0.5, M + 53, y + 5.5, ERR, 1.2); doc.line(M + 53, y + 0.5, M + 48, y + 5.5, ERR, 1.2);
  doc.text(M + 58, y + 5.5, 'errore · i liberi sono sulla lunetta', { size: 7, color: MUTED });

  doc.text(doc.width - M, doc.height - 18, 'ClutchStats', { size: 7, color: MUTED, align: 'right' });
  return doc.toBytes();
}
