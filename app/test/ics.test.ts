import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseIcs, proposeGames } from '../src/model/ics';

const google = readFileSync(resolve(process.cwd(), 'test/fixtures/google.ics'), 'utf8');
const outlook = readFileSync(resolve(process.cwd(), 'test/fixtures/outlook.ics'), 'utf8');

it('parses google export with folding and escapes', () => {
  const { events, errors } = parseIcs(google);
  expect(errors).toEqual([]);
  expect(events).toHaveLength(2);
  expect(events[0].uid).toBe('abc123@google.com');
  expect(events[0].summary).toBe('Polisportiva Rossi - Basket Verdi');
  expect(events[0].location).toBe('PalaRossi, Via Roma 1');
  expect(events[0].start.toISOString()).toBe('2026-10-18T18:30:00.000Z');
});

it('TZID Europe/Rome 20:30 on 25 Oct 2026 (CET, after DST end) is 19:30Z', () => {
  expect(parseIcs(google).events[1].start.toISOString()).toBe('2026-10-25T19:30:00.000Z');
});

it('date-only event is local midnight and missing UID is reported', () => {
  const { events, errors } = parseIcs(outlook);
  expect(events).toHaveLength(1);
  expect(events[0].start.getHours()).toBe(0);
  expect(events[0].start.getDate()).toBe(1);
  expect(errors).toHaveLength(1);
  expect(errors[0].line).toBe(9);
});

it('proposes home/away from summary', () => {
  const props = proposeGames(parseIcs(google).events, 'Polisportiva Rossi');
  expect(props[0]).toMatchObject({ icsUid: 'abc123@google.com', opponentName: 'Basket Verdi', home: true, venue: 'PalaRossi, Via Roma 1', date: '2026-10-18T18:30:00.000Z' });
  expect(props[1]).toMatchObject({ opponentName: 'Basket Verdi', home: false });
});

it('@ separator means the first team is away', () => {
  const [p] = proposeGames([{ uid: 'u', start: new Date(0), summary: 'Polisportiva Rossi @ Basket Verdi' }], 'Polisportiva Rossi');
  expect(p).toMatchObject({ opponentName: 'Basket Verdi', home: false });
});

it('summary without my team keeps the whole text as opponent, home by default', () => {
  const [p] = proposeGames([{ uid: 'u', start: new Date(0), summary: 'Amichevole Basket Blu' }], 'Polisportiva Rossi');
  expect(p).toMatchObject({ opponentName: 'Amichevole Basket Blu', home: true });
});
