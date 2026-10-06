import { SELF } from 'cloudflare:test';

export const BASE = 'http://bkstats.test';

export async function post(path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return SELF.fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
}

export async function get(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return SELF.fetch(BASE + path, { headers });
}

export async function loginToken(password = 'segreta'): Promise<string> {
  const r = await post('/api/login', { password });
  if (r.status !== 200) throw new Error(`login failed ${r.status}`);
  const { token } = (await r.json()) as { token: string };
  return token;
}

export const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
export const coach = { 'X-Api-Key': 'coach-key' };

export const TABLES = ['teams', 'players', 'opponents', 'games', 'events', 'login_attempts'];

/** Svuota tutte le tabelle: i test condividono lo stesso D1 locale. */
export async function clearDb(): Promise<void> {
  const { env } = await import('cloudflare:test');
  await env.DB.batch(TABLES.map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
}
