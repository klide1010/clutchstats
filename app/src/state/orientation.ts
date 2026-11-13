/**
 * Telefono: tutto ciò che non è tablet. Tablet se il lato corto è almeno 500px, oppure se lo schermo è "largo"
 * (rapporto fino a 1,7, cioè 16:10 o 4:3) con almeno 360px: i telefoni sono 16:9 (1,78) o più allungati.
 * Esempi: tablet 10" 1280×800 a densità 1,5 → 853×533; telefono 360×640, 412×915.
 */
export function isPhoneScreen(width: number, height: number): boolean {
  const short = Math.min(width, height);
  const ratio = Math.max(width, height) / Math.max(1, short);
  return !(short >= 500 || (short >= 360 && ratio <= 1.7));
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

/** Tablet (o computer): vedi isPhoneScreen. Misura lo schermo, non la finestra, che le barre di Chrome accorciano. */
export function isTabletScreen(width: number, height: number): boolean {
  return !isPhoneScreen(width, height);
}

/** Classe `tablet` sulla radice: abilita i layout della partita live per tablet verticale e orizzontale (styles.css). */
export function markTabletScreen(s: { width: number; height: number }, root: Element): void {
  if (isTabletScreen(s.width, s.height)) root.classList.add('tablet');
}
