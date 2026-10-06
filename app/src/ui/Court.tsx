import type { GameEvent } from '@bkstats/shared';

interface Props {
  onTap?: (x: number, y: number) => void;
  shots?: GameEvent[];
  class?: string;
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
      {shots?.map((s) =>
        s.x !== undefined && s.y !== undefined ? (
          <circle key={s.id} cx={s.x * 150} cy={s.y * 140} r="3" class={s.made ? 'shot-made' : 'shot-missed'} />
        ) : null,
      )}
    </svg>
  );
}
