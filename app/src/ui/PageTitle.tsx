import { Icon, type IconName } from './Icon';
import type { ComponentChildren } from 'preact';

/** Titolo di pagina coerente con la Home: icona nel colore dati + Barlow Condensed. */
export function PageTitle({ icon, children, right, onBack, subtitle }: { icon: IconName; children: ComponentChildren; right?: ComponentChildren; onBack?: () => void; subtitle?: ComponentChildren }) {
  return (
    <div class="page-title-row">
      {onBack && <button class="btn btn-sm btn-icon icon-only back-btn" aria-label="Indietro" onClick={onBack}><Icon name="back" size={18} /></button>}
      <div class="page-title-text">
        <h1 class="page-title"><Icon name={icon} size={22} /> <span>{children}</span></h1>
        {subtitle && <span class="muted page-subtitle">{subtitle}</span>}
      </div>
      {right}
    </div>
  );
}
