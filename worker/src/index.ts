import { Hono } from 'hono';
import type { AppVariables, Env } from './env';
import { loginHandler, requireUser, requireUserOrCoach } from './auth';
import { pullHandler, pushHandler } from './sync';

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.get('/api/health', (c) => c.json({ ok: true }));
app.post('/api/login', loginHandler);
app.get('/api/me', requireUser, (c) => c.json({ kind: c.get('auth').kind }));
app.post('/api/sync/push', requireUser, pushHandler);
app.get('/api/sync/pull', requireUser, pullHandler);
app.get('/api/v1/read/ping', requireUserOrCoach, (c) => c.json({ ok: true, kind: c.get('auth').kind }));

app.notFound((c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'not_found' }, 404) : c.env.ASSETS.fetch(c.req.raw)));
app.onError((err, c) => {
  console.error(err instanceof Error ? err.message : String(err));
  return c.json({ error: 'internal_error' }, 500);
});

export default app;
