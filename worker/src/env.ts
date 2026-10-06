export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_PASSWORD: string;
  JWT_SECRET: string;
  COACH_API_KEY: string;
}

export type AuthKind = 'user' | 'coach';

export interface AppVariables {
  auth: { kind: AuthKind };
}
