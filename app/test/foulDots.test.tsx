import { it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { FoulDots, foulLevel } from '../src/ui/FoulDots';

afterEach(cleanup);

it('renders five squares, filled up to the foul count', () => {
  const { container } = render(<FoulDots count={3} />);
  const dots = container.querySelectorAll('.foul-dot');
  expect(dots).toHaveLength(5);
  expect(container.querySelectorAll('.foul-dot.on')).toHaveLength(3);
  expect(container.querySelector('.foul-dots')!.getAttribute('aria-label')).toBe('3 falli');
});

it('colors go from green to red as fouls grow', () => {
  expect(foulLevel(0)).toBe('none');
  expect(foulLevel(1)).toBe('ok');
  expect(foulLevel(2)).toBe('ok');
  expect(foulLevel(3)).toBe('warn');
  expect(foulLevel(4)).toBe('hot');
  expect(foulLevel(5)).toBe('out');
  expect(foulLevel(7)).toBe('out');
  const { container } = render(<FoulDots count={5} />);
  expect(container.querySelector('.foul-dots.level-out')).toBeTruthy();
});
