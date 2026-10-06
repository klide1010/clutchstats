import { it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
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
  fireEvent.click(screen.getByRole('button', { name: '2' }));
  fireEvent.click(made);
  // after "Canestro" on US side the assist chooser appears
  fireEvent.click(screen.getByRole('button', { name: 'Nessuno' }));
  expect(onConfirm).toHaveBeenCalledWith({ made: true, value: 2, playerId: 'p1', assistPlayerId: undefined, jerseyNumber: undefined });
});

it('ShotPopup for THEM confirms a miss directly with the optional jersey', () => {
  const onConfirm = vi.fn();
  render(<ShotPopup x={0.5} y={0.6} side="THEM" onCourt={five} initialValue={3} selectedPlayerId={null} jerseyNumbers={[7, 12]} onConfirm={onConfirm} onCancel={() => undefined} />);
  fireEvent.click(screen.getByRole('button', { name: '#12' }));
  fireEvent.click(screen.getByRole('button', { name: 'Errore' }));
  expect(onConfirm).toHaveBeenCalledWith({ made: false, value: 3, playerId: undefined, assistPlayerId: undefined, jerseyNumber: 12 });
});
