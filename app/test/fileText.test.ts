import { it, expect } from 'vitest';
import { readFileText } from '../src/model/fileText';

it('reads a File as text without Blob.text()', async () => {
  const f = new File(['ciao;mondo'], 'x.csv', { type: 'text/csv' });
  expect(await readFileText(f)).toBe('ciao;mondo');
});
