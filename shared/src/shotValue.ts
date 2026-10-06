/** Geometria FIBA del mezzo campo, in metri. x da sinistra a destra, y dalla linea di fondo verso centrocampo. */
export const COURT = {
  widthM: 15,
  depthM: 14,
  basketX: 7.5,
  basketY: 1.575,
  arcRadius: 6.75,
  cornerInset: 0.9,
} as const;

/** Valore del tiro dalla posizione normalizzata (0–1 su entrambi gli assi). */
export function shotValueFromPosition(x: number, y: number): 2 | 3 {
  const xm = x * COURT.widthM;
  const ym = y * COURT.depthM;
  if (xm < COURT.cornerInset || xm > COURT.widthM - COURT.cornerInset) return 3;
  const dx = xm - COURT.basketX;
  const dy = ym - COURT.basketY;
  return Math.sqrt(dx * dx + dy * dy) > COURT.arcRadius ? 3 : 2;
}
