import { describe, it, expect } from 'vitest';
import { newId } from '../src/id';

describe('newId', () => {
  it('returns RFC 4122 v4 format', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('is unique across 1000 calls', () => {
    expect(new Set(Array.from({ length: 1000 }, newId)).size).toBe(1000);
  });
});
