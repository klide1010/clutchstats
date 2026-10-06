import { computed, signal } from '@preact/signals';
import { meta } from '../db';

export const token = signal<string | null>(null);
export const isLoggedIn = computed(() => token.value !== null);

export async function initSession(): Promise<void> {
  token.value = (await meta.get<string>('token')) ?? null;
}

export async function setToken(t: string | null): Promise<void> {
  token.value = t;
  await meta.set('token', t);
}
