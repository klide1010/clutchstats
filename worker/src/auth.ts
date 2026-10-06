import type { Context, MiddlewareHandler } from 'hono';
import type { AppVariables, Env } from './env';
import { signJwt, verifyJwt } from './jwt';

type AppContext = Context<{ Bindings: Env; Variables: AppVariables }>;

export const TOKEN_TTL_SEC = 30 * 24 * 3600;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export function constantTimeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  const n = Math.max(ea.length, eb.length);
  for (let i = 0; i < n; i++) diff |= (ea[i % ea.length] ?? 0) ^ (eb[i % eb.length] ?? 0);
  return diff === 0;
}

function clientIp(c: AppContext): string {
  return c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')?.split(',')[0].trim() ?? 'unknown';
}

export async function loginHandler(c: AppContext): Promise<Response> {
  let body: { password?: unknown };
  try {
    body = (await c.req.json()) as { password?: unknown };
  } catch {
    return c.json({ error: 'invalid_body' }, 400);
  }
  if (typeof body.password !== 'string' || body.password === '') return c.json({ error: 'invalid_body' }, 400);

  const ip = clientIp(c);
  const since = Date.now() - WINDOW_MS;
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND at > ?').bind(ip, since).first<{ n: number }>();
  if ((row?.n ?? 0) >= MAX_ATTEMPTS) return c.json({ error: 'too_many_attempts' }, 429);

  if (!constantTimeEqual(body.password, c.env.APP_PASSWORD)) {
    await c.env.DB.prepare('INSERT INTO login_attempts (ip, at) VALUES (?, ?)').bind(ip, Date.now()).run();
    return c.json({ error: 'unauthorized' }, 401);
  }

  await c.env.DB.prepare('DELETE FROM login_attempts WHERE ip = ? OR at <= ?').bind(ip, since).run();
  const token = await signJwt({ sub: 'user' }, c.env.JWT_SECRET, TOKEN_TTL_SEC);
  return c.json({ token, expiresAt: Date.now() + TOKEN_TTL_SEC * 1000 });
}

async function userFromBearer(c: AppContext): Promise<boolean> {
  const h = c.req.header('Authorization');
  if (!h || !h.startsWith('Bearer ')) return false;
  const payload = await verifyJwt(h.slice(7).trim(), c.env.JWT_SECRET);
  return payload !== null;
}

function coachFromKey(c: AppContext): boolean {
  const k = c.req.header('X-Api-Key');
  return !!k && !!c.env.COACH_API_KEY && constantTimeEqual(k, c.env.COACH_API_KEY);
}

export const requireUser: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  if (!(await userFromBearer(c))) return c.json({ error: 'unauthorized' }, 401);
  c.set('auth', { kind: 'user' });
  await next();
};

export const requireUserOrCoach: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  if (await userFromBearer(c)) c.set('auth', { kind: 'user' });
  else if (coachFromKey(c)) c.set('auth', { kind: 'coach' });
  else return c.json({ error: 'unauthorized' }, 401);
  await next();
};
