import type { GameEvent } from '@bkstats/shared';

interface Props {
  onTap?: (x: number, y: number) => void;
  shots?: GameEvent[];
  class?: string;
}

/** Linea del tiro libero: 5,80 m dalla linea di fondo → 58 nel viewBox. */
export const FT_LINE_Y = 58;

/** Posizione nel viewBox di un tiro: coordinate registrate, oppure la lunetta per i liberi (con un piccolo scarto per non sovrapporli). */
export function shotPosition(s: GameEvent): [number, number] | null {
  if (s.type === 'FREE_THROW') {
    const jitter = ((s.seq % 7) - 3) * 1.6;
    return [75 + jitter, FT_LINE_Y];
  }
  if (s.x === undefined || s.y === undefined) return null;
  return [s.x * 150, s.y * 140];
}

/** Mezzo campo FIBA, viewBox in decimetri (150 × 140), canestro in alto. */
export function Court({ onTap, shots, class: cls }: Props) {
  const handle = (e: MouseEvent) => {
    if (!onTap) return;
    const svg = e.currentTarget as SVGSVGElement;
    let x: number;
    let y: number;
    const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null;
    if (ctm && typeof svg.createSVGPoint === 'function') {
      // Mappa il tap nelle coordinate del viewBox (gestisce i bordi vuoti del "meet").
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const p = pt.matrixTransform(ctm.inverse());
      x = p.x / 150;
      y = p.y / 140;
    } else {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = (e.clientX - rect.left) / rect.width;
      y = (e.clientY - rect.top) / rect.height;
    }
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    onTap(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
  };
  return (
    <svg class={`court${cls ? ' ' + cls : ''}`} viewBox="0 0 150 140" preserveAspectRatio="xMidYMid meet" onClick={handle}>
      <rect x="0" y="0" width="150" height="140" class="court-floor" />
      {/* area dei 3 secondi */}
      <rect x="50.5" y="0" width="49" height="58" class="court-line" />
      <circle cx="75" cy="58" r="18" class="court-line" />
      {/* linea da 3 punti */}
      <path d="M 9 0 L 9 29.9 A 67.5 67.5 0 0 0 141 29.9 L 141 0" class="court-line" />
      {/* semicerchio no sfondamento */}
      <path d="M 62.5 15.75 A 12.5 12.5 0 0 0 87.5 15.75" class="court-line" />
      {/* tabellone e canestro */}
      <line x1="66" y1="12" x2="84" y2="12" class="court-board" />
      <circle cx="75" cy="15.75" r="2.25" class="court-rim" />
      {/* metà campo */}
      <path d="M 57 140 A 18 18 0 0 1 93 140" class="court-line" />
      {shots?.map((s) => {
        const pos = shotPosition(s);
        if (!pos) return null;
        const [cx, cy] = pos;
        const ft = s.type === 'FREE_THROW';
        const r = ft ? 2.2 : 3;
        const cls = (s.made ? 'shot-made' : 'shot-missed') + (ft ? ' shot-ft' : '');
        return s.made ? (
          <circle key={s.id} cx={cx} cy={cy} r={r} class={cls} data-cy={cy} />
        ) : (
          <path key={s.id} d={`M ${cx - r} ${cy - r} L ${cx + r} ${cy + r} M ${cx + r} ${cy - r} L ${cx - r} ${cy + r}`} class={cls} data-cy={cy} />
        );
      })}
    </svg>
  );
}
