import { it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor, cleanup } from '@testing-library/preact';

afterEach(cleanup);
import { resetDb } from '../src/db';
import { ensureTeam, savePlayer } from '../src/state/team';
import { findOrCreateOpponent, opponents } from '../src/state/opponents';
import { createGame, games } from '../src/state/games';
import { openLiveGame, type LiveGame } from '../src/state/liveGame';
import { SubsPanel } from '../src/ui/SubsPanel';
import { EventHistory } from '../src/ui/EventHistory';

let lg: LiveGame;
let ids: string[];
const last = () => lg.events.value[lg.events.value.length - 1];

beforeEach(async () => {
  await resetDb();
  opponents.value = []; games.value = [];
  await ensureTeam();
  ids = [];
  for (let i = 0; i < 7; i++) { ids.push(`p${i}`); await savePlayer({ id: `p${i}`, firstName: 'N', lastName: `C${i}`, number: 4 + i, role: 'ALA', active: true }); }
  const opp = await findOrCreateOpponent('Verdi');
  const g = await createGame({ opponentId: opp.id, date: '2026-10-18T18:30:00.000Z', home: true, useClock: false });
  lg = await openLiveGame(g.id);
  await lg.setStarters(ids.slice(0, 5));
  await lg.startPeriod();
});

it('substitution without clock asks for the minute and stamps clockSec', async () => {
  render(<SubsPanel lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /#4 C0/ }));
  fireEvent.click(screen.getByRole('button', { name: /#9 C5/ }));
  const slider = screen.getByLabelText('Minuto del periodo') as HTMLInputElement;
  fireEvent.input(slider, { target: { value: '6' } });
  fireEvent.click(screen.getByRole('button', { name: 'Conferma' }));
  await waitFor(() => expect(last().type).toBe('SUBSTITUTION'));
  expect(last()).toMatchObject({ subOutPlayerId: 'p0', subInPlayerId: 'p5', clockSec: 240 });
  expect(lg.onCourt.value).toContain('p5');
  expect(lg.onCourt.value).not.toContain('p0');
});

it('EventHistory lists events newest first and deletes one', async () => {
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: 'p1' });
  await lg.addEvent({ type: 'TURNOVER', side: 'US', playerId: 'p2' });
  render(<EventHistory lg={lg} />);
  const items = screen.getAllByRole('listitem');
  expect(items[0].textContent).toContain('Palla persa');
  expect(items[1].textContent).toContain('Palla recuperata');
  fireEvent.click(screen.getAllByRole('button', { name: 'Elimina' })[0]);
  await waitFor(() => expect(lg.boxScore.value.team.tov).toBe(0));
  expect(lg.boxScore.value.team.stl).toBe(1);
});

it('GameMenu asks who starts the next period and starts it with that five', async () => {
  const { GameMenu } = await import('../src/ui/GameMenu');
  await lg.endPeriod();
  render(<GameMenu lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: 'Inizia periodo' }));
  expect(screen.getByText('Chi inizia il periodo')).toBeTruthy();
  const start = screen.getAllByRole('button', { name: /Inizia periodo/ }).pop()!;
  fireEvent.click(screen.getByRole('button', { name: /^4\s*C0/ }));
  expect((start as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /^9\s*C5/ }));
  fireEvent.click(start);
  await waitFor(() => expect(lg.game.value.currentPeriod).toBe(2));
  expect(lg.periodOpen.value).toBe(true);
  expect(lg.onCourt.value).toContain('p5');
  expect(lg.onCourt.value).not.toContain('p0');
});
