import { it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/preact';
import { resetDb } from '../src/db';
import { ensureTeam } from '../src/state/team';
import { createGame, games, setResult } from '../src/state/games';
import { opponentsRepo } from '../src/db';
import { Calendar, calendarTab } from '../src/pages/Calendar';

beforeEach(async () => { await resetDb(); games.value = []; calendarTab.value = 'todo'; await ensureTeam(); });
afterEach(cleanup);

async function seed() {
  await opponentsRepo.put({ id: 'o1', name: 'Basket Verdi', shortName: 'VER', roster: [] });
  await opponentsRepo.put({ id: 'o2', name: 'Polisportiva Blu', shortName: 'BLU', roster: [] });
  const a = await createGame({ opponentId: 'o1', date: '2026-10-01T18:00:00.000Z', home: true, useClock: false });
  await createGame({ opponentId: 'o2', date: '2026-12-01T18:00:00.000Z', home: false, useClock: false, friendly: true });
  await setResult(a.id, 61, 58);
}

it('tab "Da giocare" e "Giocate" al posto di un elenco unico', async () => {
  await seed();
  render(<Calendar />);
  await screen.findByRole('tab', { name: 'Da giocare (1)' });
  expect(await screen.findByText(/Polisportiva Blu/)).toBeTruthy();
  expect(screen.getByText('Amichevole')).toBeTruthy();
  expect(screen.queryByText(/Basket Verdi/)).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Giocate (1)' }));
  expect(screen.getByText(/Basket Verdi/)).toBeTruthy();
  expect(screen.queryByText(/Polisportiva Blu/)).toBeNull();
  await screen.findByText('61–58');
});

it('la matita segna il solo risultato e l\'amichevole', async () => {
  await seed();
  render(<Calendar />);
  await screen.findByText(/Polisportiva Blu/);
  fireEvent.click(screen.getByRole('button', { name: 'Modifica' }));
  fireEvent.input(screen.getByLabelText('Noi'), { target: { value: '70' } });
  fireEvent.input(screen.getByLabelText('Loro'), { target: { value: '65' } });
  fireEvent.click(screen.getByLabelText(/Amichevole/));
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(games.value.find((g) => g.opponentId === 'o2')).toMatchObject({ status: 'CLOSED', scoreUs: 70, scoreThem: 65, friendly: false }));
});
