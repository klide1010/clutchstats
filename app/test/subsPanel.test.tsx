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
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: 'p1' }); // periodo iniziato: il cambio chiede il minuto
  render(<SubsPanel lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /#4 C0/ }));
  fireEvent.click(screen.getByRole('button', { name: /#9 C5/ }));
  // Si legge il tabellone, che conta alla rovescia: 6' sul tabellone = mancano 6 minuti.
  const slider = screen.getByLabelText('Minuti sul tabellone') as HTMLInputElement;
  fireEvent.input(slider, { target: { value: '6' } });
  expect(screen.getByText(/4' giocati/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Conferma' }));
  await waitFor(() => expect(last().type).toBe('SUBSTITUTION'));
  expect(last()).toMatchObject({ subOutPlayerId: 'p0', subInPlayerId: 'p5', clockSec: 360 });
  expect(lg.onCourt.value).toContain('p5');
  expect(lg.onCourt.value).not.toContain('p0');
});

it('il minuto proposto è 10 al primo cambio del periodo, poi quello del cambio precedente', async () => {
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: 'p1' }); // periodo iniziato: il cambio chiede il minuto
  const { unmount } = render(<SubsPanel lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /#4 C0/ }));
  fireEvent.click(screen.getByRole('button', { name: /#9 C5/ }));
  expect((screen.getByLabelText('Minuti sul tabellone') as HTMLInputElement).value).toBe('10');
  unmount();
  await lg.substitute('p1', 'p6', 7 * 60);
  render(<SubsPanel lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /#4 C0/ }));
  fireEvent.click(screen.getByRole('button', { name: /#9 C5/ }));
  expect((screen.getByLabelText('Minuti sul tabellone') as HTMLInputElement).value).toBe('7');
});

it('avvisa se il tempo è più alto del cambio precedente (il tabellone scende)', async () => {
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: 'p1' }); // periodo iniziato: il cambio chiede il minuto
  await lg.substitute('p1', 'p6', 1 * 60);
  render(<SubsPanel lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: /#4 C0/ }));
  fireEvent.click(screen.getByRole('button', { name: /#9 C5/ }));
  expect(screen.queryByText(/cambio precedente/)).toBeNull();
  fireEvent.input(screen.getByLabelText('Minuti sul tabellone'), { target: { value: '5' } });
  expect(screen.getByText(/cambio precedente era a 1'/)).toBeTruthy();
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

it('GameMenu: il quintetto del nuovo periodo parte vuoto, "Rimetti i 5" ripropone chi ha chiuso', async () => {
  const { GameMenu } = await import('../src/ui/GameMenu');
  await lg.endPeriod();
  render(<GameMenu lg={lg} onClose={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: 'Inizia periodo' }));
  expect(screen.getByText('Chi inizia il periodo')).toBeTruthy();
  const start = screen.getAllByRole('button', { name: /Inizia periodo/ }).pop()! as HTMLButtonElement;
  expect(start.disabled).toBe(true);
  expect(screen.getByText('/5 in campo').previousSibling!.textContent).toBe('0');
  fireEvent.click(screen.getByRole('button', { name: /Rimetti i 5/ }));
  expect(start.disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /^4\s*C0/ }));
  expect(start.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /^9\s*C5/ }));
  fireEvent.click(start);
  await waitFor(() => expect(lg.game.value.currentPeriod).toBe(2));
  expect(lg.periodOpen.value).toBe(true);
  expect(lg.onCourt.value).toContain('p5');
  expect(lg.onCourt.value).not.toContain('p0');
});

it('prima della prima azione del periodo i cambi correggono il quintetto: niente minuto, tempo = inizio periodo', async () => {
  expect(lg.lineupPhase.value).toBe(true);
  render(<SubsPanel lg={lg} onClose={() => undefined} />);
  expect(screen.getByText(/correggono il quintetto/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /#4 C0/ }));
  fireEvent.click(screen.getByRole('button', { name: /#9 C5/ }));
  await waitFor(() => expect(last().type).toBe('SUBSTITUTION'));
  expect(screen.queryByLabelText('Minuti sul tabellone')).toBeNull();
  expect(last()).toMatchObject({ subOutPlayerId: 'p0', subInPlayerId: 'p5', clockSec: 600 });
  expect(lg.lineupPhase.value).toBe(true);
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: 'p1' });
  expect(lg.lineupPhase.value).toBe(false);
});

it('un cambio di quintetto non toglie minuti: chi entra gioca il periodo intero', async () => {
  await lg.substitute('p0', 'p5');
  await lg.addEvent({ type: 'STEAL', side: 'US', playerId: 'p5' });
  await lg.endPeriod();
  const secs = Object.fromEntries(lg.boxScore.value.players.map((l) => [l.playerId, l.seconds]));
  expect(secs.p5).toBe(600);
  expect(secs.p0).toBe(0);
});
