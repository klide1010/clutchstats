import { it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import type { Player } from '@bkstats/shared';
import { resetDb } from '../src/db';
import { displayName, initNameMode, nameMode, setNameMode } from '../src/state/names';
import { PlayerBar } from '../src/ui/PlayerBar';
import { PlayerPicker } from '../src/ui/PlayerPicker';

afterEach(cleanup);
beforeEach(async () => { await resetDb(); nameMode.value = 'LAST'; });

const fede: Player = { id: 'p1', teamId: 't', firstName: 'Federico', lastName: 'Catalano', nickname: 'Fede', number: 88, role: 'ALA', active: true, updatedAt: 0, deleted: false };
const rossi: Player = { id: 'p2', teamId: 't', firstName: 'Mario', lastName: 'Rossi', number: 4, role: 'PLAY', active: true, updatedAt: 0, deleted: false };

it('displayName: cognome di default, soprannome se scelto, cognome se il soprannome manca o è vuoto', () => {
  expect(displayName(fede)).toBe('Catalano');
  nameMode.value = 'NICK';
  expect(displayName(fede)).toBe('Fede');
  expect(displayName(rossi)).toBe('Rossi');
  expect(displayName({ ...rossi, nickname: '  ' })).toBe('Rossi');
});

it('la scelta resta salvata sul dispositivo', async () => {
  await setNameMode('NICK');
  nameMode.value = 'LAST';
  await initNameMode();
  expect(nameMode.value).toBe('NICK');
});

it('in partita barra giocatori e scelta del quintetto usano il soprannome; nel quintetto il cognome resta sotto', () => {
  nameMode.value = 'NICK';
  const bar = render(<PlayerBar players={[fede, rossi]} selectedId={null} fouls={{}} onTap={() => undefined} />);
  expect(bar.container.textContent).toContain('Fede');
  expect(bar.container.textContent).toContain('Rossi');
  expect(bar.container.textContent).not.toContain('Catalano');
  cleanup();
  const pick = render(<PlayerPicker players={[fede]} selected={[]} max={5} onChange={() => undefined} />);
  expect(pick.container.querySelector('.pick-name')!.textContent).toBe('Fede');
  expect(pick.container.querySelector('.pick-role')!.textContent).toContain('Catalano');
});

it('NameModeToggle cambia e salva la scelta', async () => {
  const { NameModeToggle } = await import('../src/ui/NameModeToggle');
  const { fireEvent, screen, waitFor } = await import('@testing-library/preact');
  render(<NameModeToggle />);
  fireEvent.click(screen.getByRole('button', { name: 'Soprannomi' }));
  expect(nameMode.value).toBe('NICK');
  nameMode.value = 'LAST';
  await waitFor(async () => { await initNameMode(); expect(nameMode.value).toBe('NICK'); });
});
