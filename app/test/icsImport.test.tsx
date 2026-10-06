import { it, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup, waitFor } from '@testing-library/preact';
import { resetDb } from '../src/db';
import { ensureTeam, myTeam, saveTeam } from '../src/state/team';
import { IcsImport } from '../src/ui/IcsImport';

beforeEach(async () => { await resetDb(); myTeam.value = null; await ensureTeam(); });
afterEach(cleanup);

it('asks for my team name before importing when the team still has the default name', async () => {
  render(<IcsImport onDone={() => undefined} />);
  const input = screen.getByLabelText('Come si chiama la tua squadra?') as HTMLInputElement;
  expect(input.value).toBe('');
  fireEvent.input(input, { target: { value: 'Polisportiva Rossi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Avanti' }));
  await waitFor(() => expect(myTeam.value?.name).toBe('Polisportiva Rossi'));
  expect(myTeam.value?.shortName).toBe('POL');
  expect(screen.getByText('Scegli file')).toBeTruthy();
});

it('skips the question when the team already has a name', async () => {
  await saveTeam({ name: 'Polisportiva Rossi', shortName: 'ROS' });
  render(<IcsImport onDone={() => undefined} />);
  expect(screen.queryByLabelText('Come si chiama la tua squadra?')).toBeNull();
  expect(screen.getByText('Scegli file')).toBeTruthy();
});
