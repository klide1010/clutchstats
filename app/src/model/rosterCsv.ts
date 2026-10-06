import { newId, parseRole, type Player, type Role } from '@bkstats/shared';

export interface RosterRow {
  number: number;
  lastName: string;
  firstName: string;
  role: Role;
}

export interface RosterCsvResult {
  rows: RosterRow[];
  errors: { line: number; reason: string }[];
}

export { parseRole };

export function parseRosterCsv(text: string): RosterCsvResult {
  const rows: RosterRow[] = [];
  const errors: { line: number; reason: string }[] = [];
  const lines = text.split(/\r\n|\n|\r/);
  const firstNonEmpty = lines.find((l) => l.trim() !== '') ?? '';
  const sep = firstNonEmpty.includes(';') ? ';' : ',';

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    if (raw.trim() === '') return;
    const cells = raw.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const [numStr, lastName = '', firstName = '', roleStr = ''] = cells;
    if (i === lines.indexOf(firstNonEmpty) && !/^\d+$/.test(numStr)) return; // intestazione
    if (!/^\d+$/.test(numStr)) { errors.push({ line: lineNo, reason: `Numero non valido: ${numStr}` }); return; }
    const role = parseRole(roleStr);
    if (!role) { errors.push({ line: lineNo, reason: `Ruolo non riconosciuto: ${roleStr}` }); return; }
    rows.push({ number: Number(numStr), lastName, firstName, role });
  });
  return { rows, errors };
}

/** Upsert per numero di maglia: mantiene l'id dei giocatori esistenti, crea i nuovi. */
export function mergeRoster(existing: Player[], rows: RosterRow[], teamId: string): Player[] {
  const byNumber = new Map(existing.map((p) => [p.number, p]));
  return rows.map((r) => {
    const prev = byNumber.get(r.number);
    const base: Player = prev ?? { id: newId(), teamId, firstName: '', lastName: '', number: r.number, role: r.role, active: true, updatedAt: 0, deleted: false };
    return { ...base, firstName: r.firstName, lastName: r.lastName, role: r.role, number: r.number, active: true, deleted: false };
  });
}
