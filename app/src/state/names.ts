import { signal } from '@preact/signals';
import type { Player } from '@bkstats/shared';
import { meta } from '../db';

/** Come chiamare i giocatori nella partita live: cognome o soprannome. Si sceglie prima della partita, vale per il dispositivo. */
export type NameMode = 'LAST' | 'NICK';

export const nameMode = signal<NameMode>('LAST');

export async function initNameMode(): Promise<void> {
  nameMode.value = (await meta.get<NameMode>('nameMode')) === 'NICK' ? 'NICK' : 'LAST';
}

export async function setNameMode(m: NameMode): Promise<void> {
  nameMode.value = m;
  await meta.set('nameMode', m);
}

/** Nome da mostrare in partita: il soprannome se scelto e presente, altrimenti il cognome. Box score, PDF e CSV usano sempre il cognome. */
export function displayName(p: Pick<Player, 'lastName' | 'nickname'>): string {
  const nick = p.nickname ? p.nickname.trim() : '';
  return nameMode.value === 'NICK' && nick ? nick : p.lastName;
}
