import { newId } from '@bkstats/shared';
import { meta } from '../db';

let cached: string | null = null;

/** Identificativo stabile di questo dispositivo/installazione (per la presa in carico delle partite). */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await meta.get<string>('deviceId');
  if (!id) {
    id = newId();
    await meta.set('deviceId', id);
  }
  cached = id;
  return id;
}

/** Solo per i test. */
export function resetDeviceIdCache(): void { cached = null; }
