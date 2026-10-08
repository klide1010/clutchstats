import { Icon, type IconName } from './Icon';
import type { ComponentChildren } from 'preact';

/** Titolo di pagina coerente con la Home: icona nel colore dati + Barlow Condensed. */
export function PageTitle({ icon, children, right }: { icon: IconName; children: ComponentChildren; right?: ComponentChildren }) {
  return (
    <div class="page-title-row">
      <h1 class="page-title"><Icon name={icon} size={22} /> <span>{children}</span></h1>
      {right}
    </div>
  );
}
