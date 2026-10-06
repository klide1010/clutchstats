export interface IcsEvent {
  uid: string;
  start: Date;
  summary: string;
  location?: string;
}

export interface IcsParseResult {
  events: IcsEvent[];
  errors: { line: number; reason: string }[];
}

export interface GameProposal {
  icsUid: string;
  date: string;
  opponentName: string;
  home: boolean;
  venue?: string;
  summary: string;
}

/** Unfolding RFC 5545: una riga che inizia con spazio o tab continua la precedente. Restituisce [testo, numeroRigaOriginale]. */
function unfold(text: string): [string, number][] {
  const raw = text.split(/\r\n|\n|\r/);
  const out: [string, number][] = [];
  raw.forEach((line, i) => {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1][0] += line.slice(1);
    } else {
      out.push([line, i + 1]);
    }
  });
  return out;
}

function unescapeText(s: string): string {
  return s.replace(/\\([\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

function parseProperty(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const idx = line.indexOf(':');
  if (idx < 0) return null;
  const head = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};
  for (const p of paramParts) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** Offset in ms del fuso `timeZone` all'istante `utcMs`. */
function zoneOffsetMs(timeZone: string, utcMs: number): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(utcMs))) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - utcMs;
}

function zonedToUtc(timeZone: string, y: number, mo: number, d: number, h: number, mi: number, s: number): Date | null {
  try {
    const wall = Date.UTC(y, mo - 1, d, h, mi, s);
    let utc = wall - zoneOffsetMs(timeZone, wall);
    utc = wall - zoneOffsetMs(timeZone, utc);
    return new Date(utc);
  } catch {
    return null;
  }
}

export function parseIcsDate(value: string, params: Record<string, string>): Date | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (params.VALUE === 'DATE' || m[4] === undefined) return new Date(y, mo - 1, d, 0, 0, 0);
  const h = +m[4], mi = +m[5], s = m[6] ? +m[6] : 0;
  if (m[7] === 'Z') return new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (params.TZID) {
    const z = zonedToUtc(params.TZID, y, mo, d, h, mi, s);
    if (z) return z;
  }
  return new Date(y, mo - 1, d, h, mi, s);
}

export function parseIcs(text: string): IcsParseResult {
  const events: IcsEvent[] = [];
  const errors: { line: number; reason: string }[] = [];
  let cur: { line: number; uid?: string; start?: Date | null; summary?: string; location?: string } | null = null;

  for (const [line, lineNo] of unfold(text)) {
    const prop = parseProperty(line);
    if (!prop) continue;
    if (prop.name === 'BEGIN' && prop.value.toUpperCase() === 'VEVENT') {
      cur = { line: lineNo };
      continue;
    }
    if (prop.name === 'END' && prop.value.toUpperCase() === 'VEVENT') {
      if (cur) {
        if (!cur.uid) errors.push({ line: cur.line, reason: 'UID mancante' });
        else if (cur.start === undefined) errors.push({ line: cur.line, reason: 'DTSTART mancante' });
        else if (cur.start === null) errors.push({ line: cur.line, reason: 'DTSTART non valido' });
        else events.push({ uid: cur.uid, start: cur.start, summary: cur.summary ?? '', location: cur.location });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    switch (prop.name) {
      case 'UID': cur.uid = prop.value.trim(); break;
      case 'DTSTART': cur.start = parseIcsDate(prop.value.trim(), prop.params); break;
      case 'SUMMARY': cur.summary = unescapeText(prop.value).trim(); break;
      case 'LOCATION': cur.location = unescapeText(prop.value).trim() || undefined; break;
    }
  }
  return { events, errors };
}

function norm(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Il nome della squadra (o una sua parte significativa) compare nel testo? */
function mentions(text: string, team: string): boolean {
  const t = norm(text);
  const n = norm(team);
  if (n.length >= 4 && t.includes(n)) return true;
  return n.split(/\s+/).some((w) => w.length >= 4 && t.includes(w));
}

const SEPARATORS: { re: RegExp; at: boolean }[] = [
  { re: /\s+@\s+/i, at: true },
  { re: /\s+-\s+|\s+–\s+|\s+—\s+/, at: false },
  { re: /\s+vs\.?\s+/i, at: false },
  { re: /\s+v\s+/i, at: false },
];

export function proposeGames(events: IcsEvent[], myTeamName: string): GameProposal[] {
  return events.map((e) => {
    let opponentName = e.summary.trim();
    let home = true;
    for (const sep of SEPARATORS) {
      const parts = e.summary.split(sep.re);
      if (parts.length === 2) {
        const [a, b] = parts.map((p) => p.trim());
        const aMine = mentions(a, myTeamName);
        const bMine = mentions(b, myTeamName);
        if (aMine && !bMine) { opponentName = b; home = !sep.at; }
        else if (bMine && !aMine) { opponentName = a; home = sep.at; }
        else { opponentName = b; home = !sep.at; }
        break;
      }
    }
    return { icsUid: e.uid, date: e.start.toISOString(), opponentName, home, venue: e.location, summary: e.summary };
  });
}
