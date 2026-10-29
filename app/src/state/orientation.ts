/** Telefono se il lato corto dello schermo è sotto i 600px (i tablet partono da circa 600–800). */
export function isPhoneScreen(width: number, height: number): boolean {
  return Math.min(width, height) < 600;
}

interface ScreenLike { width: number; height: number; orientation?: { lock?: (o: string) => Promise<void> } }

/**
 * Il manifest lascia libera la rotazione per i tablet (layout verticale e orizzontale);
 * sui telefoni l'app installata resta in verticale. Fuori dalla PWA installata il browser rifiuta: si ignora.
 */
export function lockPortraitOnPhone(s: ScreenLike): void {
  if (!isPhoneScreen(s.width, s.height) || !s.orientation || typeof s.orientation.lock !== 'function') return;
  try {
    s.orientation.lock('portrait').catch(() => undefined);
  } catch {
    // API presente ma non utilizzabile qui.
  }
}

/** Tablet (o computer): lato corto dello schermo da 600px in su. Misura lo schermo, non la finestra, che le barre di Chrome accorciano. */
export function isTabletScreen(width: number, height: number): boolean {
  return !isPhoneScreen(width, height);
}

/** Classe `tablet` sulla radice: abilita i layout della partita live per tablet verticale e orizzontale (styles.css). */
export function markTabletScreen(s: { width: number; height: number }, root: Element): void {
  if (isTabletScreen(s.width, s.height)) root.classList.add('tablet');
}
