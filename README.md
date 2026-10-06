# BKStats

Webapp per registrare le statistiche di una squadra di basket in tempo reale da un telefono, anche senza rete, con sincronizzazione su Cloudflare e API di lettura per l'allenatore.

- **App** (`app/`): PWA Preact + TypeScript, dati in IndexedDB, installabile da Chrome Android.
- **Worker** (`worker/`): Cloudflare Worker con Hono, database D1, serve anche i file statici dell'app.
- **Shared** (`shared/`): tipi e funzioni pure (box score, valutazione Lega, minuti giocati, geometria del campo) usate da app e Worker.

## Requisiti

- Node 22
- Un account Cloudflare (piano gratuito sufficiente)

## Sviluppo locale

```bash
npm install
cp worker/.dev.vars.example worker/.dev.vars   # poi modifica le tre variabili
npm run migrate:local -w worker                 # crea le tabelle nel D1 locale
npm run dev                                     # app su http://localhost:5173, worker su :8787
```

L'app in dev inoltra `/api/*` al Worker locale. La password di accesso è `APP_PASSWORD` in `worker/.dev.vars`.

```bash
npm test          # tutti i test (shared, app, worker)
npm run typecheck # controllo tipi
npm run build     # build dell'app in worker/public
```

## Primo deploy

Vedi [worker/scripts/setup.md](worker/scripts/setup.md). In breve:

```bash
cd worker
npx wrangler login                     # con l'account Cloudflare scelto
npx wrangler d1 create bkstats         # copia database_id in wrangler.jsonc
npm run migrate                        # applica le migrazioni al D1 remoto
npx wrangler secret put APP_PASSWORD
npx wrangler secret put JWT_SECRET     # es. openssl rand -base64 48
npx wrangler secret put COACH_API_KEY
cd .. && npm run deploy
```

L'app risponde su `https://bkstats.<subdomain>.workers.dev`.

## Uso

1. **Accedi** con la password condivisa (token valido 30 giorni).
2. **Roster**: aggiungi i giocatori o importa un CSV `numero;cognome;nome;ruolo` (ruoli: Play, Guardia, Ala, Ala grande, Centro).
3. **Avversari**: crea la squadra avversaria e, se vuoi, i numeri di maglia (servono per attribuire punti e falli).
4. **Calendario**: importa un file `.ics` esportato da Google Calendar o Outlook, oppure crea la partita a mano. Scegli se usare il cronometro.
5. **Partita**: quintetto iniziale, poi tap sul campo per i tiri (la app propone 2 o 3 punti dalla posizione), pulsanti per rimbalzi, perse, recuperi, stoppate, falli, blocchi. Undo annulla l'ultimo evento. Cambi dal pulsante dedicato; senza cronometro viene chiesto il minuto.
6. **Statistiche**: box score, mappa tiri, cronologia, export CSV e JSON.
7. **Sincronizza** dalla Home o a fine partita: i dati vanno sul Worker e tornano disponibili alle API.

### Installare la PWA su Android

Apri l'URL in Chrome, menu ⋮ → "Installa app" (o "Aggiungi a schermata Home"). Dopo il primo caricamento la app funziona anche offline; la sync richiede rete.

## API per l'allenatore

Autenticazione con header `X-Api-Key: <COACH_API_KEY>` (sola lettura, più l'import roster).

| Metodo | Route | Risposta |
|---|---|---|
| GET | `/api/v1/read/games` | elenco partite con `opponentName` e `score` |
| GET | `/api/v1/read/games/:id/boxscore` | `{ game, opponent, players, boxScore }` |
| GET | `/api/v1/read/games/:id/events` | eventi grezzi ordinati per `seq` |
| GET | `/api/v1/read/players` | roster |
| POST | `/api/v1/roster/import` | upsert giocatori per numero di maglia |

```bash
curl -H "X-Api-Key: $COACH_API_KEY" https://bkstats.<subdomain>.workers.dev/api/v1/read/games
curl -H "X-Api-Key: $COACH_API_KEY" https://bkstats.<subdomain>.workers.dev/api/v1/read/games/<id>/boxscore
curl -X POST -H "X-Api-Key: $COACH_API_KEY" -H "Content-Type: application/json" \
  -d '{"players":[{"number":7,"lastName":"Rossi","firstName":"Mario","role":"Ala grande"}]}' \
  https://bkstats.<subdomain>.workers.dev/api/v1/roster/import
```

Il `boxScore` ha la stessa forma usata dall'app: per ogni giocatore `pts, fg2m/fg2a, fg3m/fg3a, ftm/fta, oreb, dreb, reb, ast, tov, stl, blk, blkR, pf, pfd, screens, seconds, plusMinus, rating` (valutazione Lega).

## Modello dati

Ogni partita è una lista di eventi immutabili (`GameEvent`): tiri con coordinate, rimbalzi, assist (campo del tiro segnato), palle perse e recuperate, stoppate, falli con tipo, blocchi, cambi, timeout, inizio e fine periodo. L'undo è una cancellazione logica. Il box score è sempre derivato dagli eventi. Ogni record ha `id` (UUID generato dal client), `updatedAt` e `deleted`; la sync è push/pull con last-write-wins.
