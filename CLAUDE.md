# ClutchStats (repo `bkstats`) — contesto per Claude

App web per statistiche live di una squadra di basket, usata da Andrea per la squadra **Fiore Outlanders**.
Nome pubblico **ClutchStats**; `bkstats` resta il nome tecnico (repo, Worker, URL).

## Vincoli non negoziabili

- **Telefono target: Samsung con Chrome Android 65 (Android 6).** Tutto ciò che va in `app/` e `shared/` deve girare lì:
  Vite `build.target 'chrome65'` e `cssTarget 'chrome65'`; niente `Array.prototype.at`, `crypto.randomUUID`, `Blob.text()`,
  `Intl` con `hourCycle`, `inset`, flex `gap` (usa margini; `grid-gap` accanto a `gap` nelle griglie), `aspect-ratio`, `:has()`.
  `Promise.allSettled` è polyfillato nel service worker (`app/public/sw-polyfills.js`). Controlla caniuse prima di usare API nuove.
- **Cloudflare: solo account personale klide10@gmail.com.** Wrangler globale su questo Mac è loggato con l'account di lavoro:
  usa sempre `scripts/wr.sh …` / `npm run deploy` (profilo `personal` scelto da `scripts/cf-profile.sh`, file `.cf-profile` ignorato).
  Prima di ogni operazione: `scripts/cf-profile.sh status` deve dire klide10@gmail.com.
- Segreti in `worker/.secrets.local` (ignorato da git): APP_PASSWORD, JWT_SECRET, COACH_API_KEY. Non stamparli mai in chat.
- Git: identità del repo `klide1010 <klide10@gmail.com>`, remote GitHub privato `klide1010/clutchstats`, branch `main`.

## Architettura (dettagli in docs/superpowers/specs e README)

- `shared/`: tipi e funzioni pure (box score, valutazione Lega, minuti, geometria campo, `parseRole`). Usato da app e Worker.
- `app/`: PWA Preact + TypeScript, IndexedDB (`idb`) con outbox `dirty` per la sync, router hash, Vitest + jsdom.
  Stato partita in `src/state/liveGame.ts`: la partita è una lista di eventi immutabili, undo = soft delete, tutto derivato dagli eventi.
- `worker/`: Cloudflare Worker (Hono) + D1. Login con password unica → JWT 30 giorni; `POST /api/sync/push` e `GET /api/sync/pull`
  (last-write-wins su `updatedAt` del client, cursore di pull su `server_updated_at`); API allenatore `X-Api-Key` sotto `/api/v1/read/*`.
  Migrazioni in `worker/migrations/` (0001–0005), test con `@cloudflare/vitest-pool-workers`.
- Design "Analytics Mono": token in `app/src/styles.css`, tema chiaro/scuro (`data-theme`), colore squadra derivato a runtime con
  contrasto garantito (`app/src/model/color.ts`), icone SVG inline (`app/src/ui/Icon.tsx`), font Barlow Condensed + Montserrat (fontsource, solo latin).

## Comandi

- `npm install` · `npm test` (shared, app, worker) · `npm run typecheck` · `npm run build` · `npm run dev` (app :5173 + worker :8787)
- Deploy: `npm run deploy` (build + wrangler deploy con profilo personale). Nuove migrazioni: `scripts/wr.sh d1 migrations apply bkstats --remote`.
- Produzione: https://bkstats.klide10.workers.dev

## Modo di lavorare concordato

- TDD: test che fallisce → implementazione → suite verde → build → deploy → commit. Dopo ogni modifica visibile pubblicare subito.
- Testi UI in italiano. Ruoli: Play, Guardia, Ala, Ala grande, Centro. Valutazione Lega.
- Non toccare logica o schermate oltre a quanto chiesto; segnalare ciò che si è deciso in autonomia.
- Storico delle decisioni: `docs/diario-progetto.md` (aggiornarlo quando si prendono decisioni importanti).
