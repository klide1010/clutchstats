import { it, expect } from 'vitest';
import { legaRating } from '../src/rating';
import { emptyStatLine } from '../src/boxscore';

it('Lega rating example', () => {
  const l = { ...emptyStatLine(), pts: 20, fg2m: 5, fg2a: 8, fg3m: 2, fg3a: 5, ftm: 4, fta: 6, reb: 7, ast: 3, stl: 1, blk: 1, pfd: 4, tov: 3, blkR: 1, pf: 2 };
  // positives 20+7+3+1+1+4 = 36 ; negatives 2+3+3+3+1+2 = 14
  expect(legaRating(l)).toBe(22);
});
