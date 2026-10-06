import { it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, cleanup } from '@testing-library/preact';

afterEach(cleanup);
import type { Player } from '@bkstats/shared';
import { Court } from '../src/ui/Court';
import { ShotPopup } from '../src/ui/ShotPopup';

const five: Player[] = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, teamId: 't', firstName: 'N', lastName: `C${i}`, number: 4 + i, role: 'ALA', active: true, updatedAt: 1, deleted: false }));

it('Court reports normalized tap coordinates', () => {
  const spy = vi.fn();
  const { container } = render(<Court onTap={spy} />);
  const svg = container.querySelector('svg')!;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 280, right: 300, bottom: 280, x: 0, y: 0, toJSON() {} }) as DOMRect;
  fireEvent.click(svg, { clientX: 150, clientY: 28 });
  expect(spy).toHaveBeenCalledTimes(1);
  const [x, y] = spy.mock.calls[0];
  expect(x).toBeCloseTo(0.5, 2);
  expect(y).toBeCloseTo(0.1, 2);
});

it('Court draws shot markers when given shots', () => {
  const shots = [
    { id: 'a', gameId: 'g', seq: 1, period: 1, side: 'US' as const, type: 'SHOT_2' as const, made: true, x: 0.5, y: 0.2, createdAt: 1, updatedAt: 1, deleted: false },
    { id: 'b', gameId: 'g', seq: 2, period: 1, side: 'US' as const, type: 'SHOT_3' as const, made: false, x: 0.5, y: 0.7, createdAt: 1, updatedAt: 1, deleted: false },
  ];
  const { container } = render(<Court onTap={() => undefined} shots={shots} />);
  expect(container.querySelectorAll('.shot-made')).toHaveLength(1);
  expect(container.querySelectorAll('.shot-missed')).toHaveLength(1);
});

it('ShotPopup for US without a selected player requires choosing one before confirming', () => {
  const onConfirm = vi.fn();
  render(<ShotPopup x={0.5} y={0.6} side="US" onCourt={five} initialValue={3} selectedPlayerId={null} onConfirm={onConfirm} onCancel={() => undefined} />);
  expect(screen.getAllByRole('button', { name: /^#\d+/ })).toHaveLength(5);
  const made = screen.getByRole('button', { name: 'Canestro' }) as HTMLButtonElement;
  expect(made.disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: /^#5/ }));
  expect(made.disabled).toBe(false);
  fireEvent.click(made);
  // after "Canestro" on US side the assist chooser appears
  fireEvent.click(screen.getByRole('button', { name: 'Nessuno' }));
  expect(onConfirm).toHaveBeenCalledWith({ made: true, value: 3, playerId: 'p1', assistPlayerId: undefined, jerseyNumber: undefined });
});

it('ShotPopup for THEM confirms a miss directly with the optional jersey', () => {
  const onConfirm = vi.fn();
  render(<ShotPopup x={0.5} y={0.6} side="THEM" onCourt={five} initialValue={3} selectedPlayerId={null} jerseyNumbers={[7, 12]} onConfirm={onConfirm} onCancel={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: '#12' }));
  fireEvent.click(screen.getByRole('button', { name: 'Errore' }));
  expect(onConfirm).toHaveBeenCalledWith({ made: false, value: 3, playerId: undefined, assistPlayerId: undefined, jerseyNumber: 12 });
});

it('FreeThrowPopup does not advance when the save fails', async () => {
  const { FreeThrowPopup } = await import('../src/ui/FreeThrowPopup');
  const onShot = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const onClose = vi.fn();
  const { container } = render(<FreeThrowPopup side="US" onCourt={five} selectedPlayerId="p0" onShot={onShot} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Segnato' }));
  await new Promise((r) => setTimeout(r, 0));
  expect(container.querySelectorAll('.ft-dot.made')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Segnato' }));
  await new Promise((r) => setTimeout(r, 0));
  expect(container.querySelectorAll('.ft-dot.made')).toHaveLength(1);
  expect(onClose).not.toHaveBeenCalled();
});

it('three point arc is the short arc below the basket', () => {
  const { container } = render(<Court onTap={() => undefined} />);
  const d = container.querySelector('path.court-line')!.getAttribute('d')!;
  expect(d).toContain('A 67.5 67.5 0 0 0 141 29.9');
});

it('Court keeps its proportions (no stretching)', () => {
  const { container } = render(<Court onTap={() => undefined} />);
  const svg = container.querySelector('svg')!;
  expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
});

it('ShotPopup shows the computed value and offers no 2/3 choice', () => {
  const onConfirm = vi.fn();
  render(<ShotPopup x={0.5} y={0.6} side="US" onCourt={five} initialValue={3} selectedPlayerId="p0" onConfirm={onConfirm} onCancel={() => undefined} />);
  expect(screen.queryByRole('button', { name: '2' })).toBeNull();
  expect(screen.queryByRole('button', { name: '3' })).toBeNull();
  expect(screen.getByText('Tiro da 3')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Errore' }));
  expect(onConfirm).toHaveBeenCalledWith({ made: false, value: 3, playerId: 'p0', assistPlayerId: undefined, jerseyNumber: undefined });
});

it('draws made shots as green circles, misses as X marks and free throws at the line', () => {
  const base = { gameId: 'g', period: 1, side: 'US' as const, createdAt: 1, updatedAt: 1, deleted: false };
  const shots = [
    { ...base, id: 'a', seq: 1, type: 'SHOT_2' as const, made: true, x: 0.5, y: 0.2 },
    { ...base, id: 'b', seq: 2, type: 'SHOT_3' as const, made: false, x: 0.5, y: 0.7 },
    { ...base, id: 'c', seq: 3, type: 'FREE_THROW' as const, made: true },
    { ...base, id: 'd', seq: 4, type: 'FREE_THROW' as const, made: false },
  ];
  const { container } = render(<Court onTap={() => undefined} shots={shots} />);
  const made = container.querySelectorAll('.shot-made');
  const missed = container.querySelectorAll('.shot-missed');
  expect(made).toHaveLength(2);
  expect(missed).toHaveLength(2);
  expect(made[0].tagName.toLowerCase()).toBe('circle');
  expect(missed[0].tagName.toLowerCase()).toBe('path');
  const fts = container.querySelectorAll('.shot-ft');
  expect(fts).toHaveLength(2);
  for (const ft of fts) expect(Number(ft.getAttribute('data-cy'))).toBeCloseTo(58, 0);
});

it('Icon renders an inline svg with the icon class', async () => {
  const { Icon } = await import('../src/ui/Icon');
  const { container } = render(<Icon name="home" />);
  const svg = container.querySelector('svg.icon')!;
  expect(svg).toBeTruthy();
  expect(svg.getAttribute('aria-hidden')).toBe('true');
});
