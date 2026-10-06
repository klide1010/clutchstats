import { it, expect } from 'vitest';
import { parseRosterCsv, mergeRoster } from '../src/model/rosterCsv';
import type { Player } from '@bkstats/shared';

it('parses semicolon csv with header and italian roles', () => {
  const r = parseRosterCsv('numero;cognome;nome;ruolo\n7;Rossi;Mario;Ala grande\n4;Bianchi;Luca;PLAY');
  expect(r.errors).toEqual([]);
  expect(r.rows).toEqual([
    { number: 7, lastName: 'Rossi', firstName: 'Mario', role: 'ALA_GRANDE' },
    { number: 4, lastName: 'Bianchi', firstName: 'Luca', role: 'PLAY' },
  ]);
});

it('parses comma csv without header', () => {
  const r = parseRosterCsv('7,Rossi,Mario,centro\r\n');
  expect(r.rows).toEqual([{ number: 7, lastName: 'Rossi', firstName: 'Mario', role: 'CENTRO' }]);
});

it('reports unknown role with line number', () => {
  expect(parseRosterCsv('7;Rossi;Mario;Pivot').errors).toEqual([{ line: 1, reason: 'Ruolo non riconosciuto: Pivot' }]);
});

it('reports non numeric jersey number', () => {
  expect(parseRosterCsv('numero;cognome;nome;ruolo\nx;Rossi;Mario;Play').errors).toEqual([{ line: 2, reason: 'Numero non valido: x' }]);
});

it('mergeRoster keeps id for same number and adds new players', () => {
  const existing: Player[] = [{ id: 'x', teamId: 't1', firstName: 'Old', lastName: 'Name', number: 7, role: 'ALA', active: true, updatedAt: 1, deleted: false }];
  const merged = mergeRoster(existing, [
    { number: 7, lastName: 'Rossi', firstName: 'Mario', role: 'ALA_GRANDE' },
    { number: 9, lastName: 'Verdi', firstName: 'Gino', role: 'CENTRO' },
  ], 't1');
  expect(merged).toHaveLength(2);
  expect(merged[0]).toMatchObject({ id: 'x', lastName: 'Rossi', role: 'ALA_GRANDE', number: 7, active: true });
  expect(merged[1]).toMatchObject({ lastName: 'Verdi', number: 9, teamId: 't1', active: true });
  expect(merged[1].id).toMatch(/^[0-9a-f-]{36}$/);
});
