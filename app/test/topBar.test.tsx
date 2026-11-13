import { it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/preact';
import { resetDb } from '../src/db';
import { ensureTeam, savePlayer } from '../src/state/team';
import { findOrCreateOpponent, opponents } from '../src/state/opponents';
import { createGame, games } from '../src/state/games';
import { openLiveGame, type LiveGame } from '../src/state/liveGame';
import { TopBar } from '../src/ui/TopBar';

let lg: LiveGame;
beforeEach(async () => {
  await resetDb(); opponents.value = []; games.value = [];
  await ensureTeam();
  const ids: string[] = [];
  for (let i = 0; i < 5; i++) { ids.push(`p${i}`); await savePlayer({ id: `p${i}`, firstName: 'N', lastName: `C${i}`, number: 4 + i, role: 'ALA', active: true }); }
  const opp = await findOrCreateOpponent('Verdi');
  const g = await createGame({ opponentId: opp.id, date: '2026-10-18T18:30:00.000Z', home: true, useClock: false });
  lg = await openLiveGame(g.id);
  await lg.setStarters(ids); await lg.startPeriod();
});
afterEach(cleanup);

it('shows timeouts taken by each side', async () => {
  await lg.addEvent({ type: 'TIMEOUT', side: 'US' });
  await lg.addEvent({ type: 'TIMEOUT', side: 'THEM' });
  await lg.addEvent({ type: 'TIMEOUT', side: 'THEM' });
  render(<TopBar lg={lg} onSubs={() => undefined} onMenu={() => undefined} />);
  expect(screen.getByTitle('Timeout noi').textContent).toContain('1');
  expect(screen.getByTitle('Timeout loro').textContent).toContain('2');
});

it('falli di squadra: bonus (rosso) dal 4° fallo del periodo, i tecnici dell\'allenatore non contano', async () => {
  for (let i = 0; i < 3; i++) await lg.addEvent({ type: 'FOUL', side: 'US', playerId: `p${i}`, foulKind: 'PERSONAL' });
  await lg.addEvent({ type: 'FOUL', side: 'US', foulKind: 'COACH_TECHNICAL' });
  const { container, unmount } = render(<TopBar lg={lg} onSubs={() => undefined} onMenu={() => undefined} />);
  const us = () => container.querySelector('.score:not(.them) .fouls')!;
  expect(us().textContent).toBe('F3');
  expect(us().classList.contains('bonus')).toBe(false);
  unmount();
  await lg.addEvent({ type: 'FOUL', side: 'US', playerId: 'p3', foulKind: 'DISRUPTIVE' });
  const r = render(<TopBar lg={lg} onSubs={() => undefined} onMenu={() => undefined} />);
  const f = r.container.querySelector('.score:not(.them) .fouls')!;
  expect(f.textContent).toBe('F4');
  expect(f.classList.contains('bonus')).toBe(true);
});
