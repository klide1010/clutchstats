import { it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/preact';
import { playersRepo, resetDb } from '../src/db';
import { ensureTeam, savePlayer } from '../src/state/team';
import { Roster } from '../src/pages/Roster';

afterEach(cleanup);
beforeEach(async () => {
  await resetDb();
  await ensureTeam();
  await savePlayer({ id: 'p1', firstName: 'Federico', lastName: 'Catalano', number: 88, role: 'ALA', active: true });
});

it('nel Roster si imposta e si toglie il soprannome, che compare nella lista', async () => {
  render(<Roster />);
  fireEvent.click(await screen.findByText(/Catalano/));
  fireEvent.input(screen.getByLabelText('Soprannome'), { target: { value: ' Fede ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(async () => expect((await playersRepo.get('p1'))!.nickname).toBe('Fede'));
  expect(await screen.findByText(/«Fede»/)).toBeTruthy();
  fireEvent.click(screen.getByText(/Catalano/));
  fireEvent.input(screen.getByLabelText('Soprannome'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salva' }));
  await waitFor(async () => expect((await playersRepo.get('p1'))!.nickname).toBeUndefined());
});
