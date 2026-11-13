import { nameMode, setNameMode } from '../state/names';

/** Prima della partita: in campo i giocatori si chiamano per cognome o per soprannome (chi non ce l'ha resta col cognome). */
export function NameModeToggle() {
  return (
    <div class="stack">
      <span class="muted" style="font-size:0.85rem">In partita mostra</span>
      <div class="seg">
        <button class={`seg-btn${nameMode.value === 'LAST' ? ' active' : ''}`} onClick={() => void setNameMode('LAST')}>Cognomi</button>
        <button class={`seg-btn${nameMode.value === 'NICK' ? ' active' : ''}`} onClick={() => void setNameMode('NICK')}>Soprannomi</button>
      </div>
    </div>
  );
}
