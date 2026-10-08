export type FoulLevel = 'none' | 'ok' | 'warn' | 'hot' | 'out';

/** 0 → nessuno, 1–2 verde, 3 giallo, 4 arancione, 5+ rosso (espulso). */
export function foulLevel(count: number): FoulLevel {
  if (count <= 0) return 'none';
  if (count <= 2) return 'ok';
  if (count === 3) return 'warn';
  if (count === 4) return 'hot';
  return 'out';
}

/** Cinque quadratini: pieni fino al numero di falli, colore dal verde al rosso. */
export function FoulDots({ count, max = 5 }: { count: number; max?: number }) {
  const level = foulLevel(count);
  return (
    <span class={`foul-dots level-${level}`} aria-label={`${count} ${count === 1 ? 'fallo' : 'falli'}`} title={`${count} ${count === 1 ? 'fallo' : 'falli'}`}>
      {Array.from({ length: max }, (_, i) => <span key={i} class={`foul-dot${i < count ? ' on' : ''}`} />)}
    </span>
  );
}
