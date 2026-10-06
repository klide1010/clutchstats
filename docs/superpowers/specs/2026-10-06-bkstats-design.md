# BKStats – Design

Data: 2026-10-06
Stato: approvato in conversazione, in attesa di revisione scritta

## 1. Scopo

Webapp per registrare le statistiche live di una squadra di basket da un
telefono Android datato, senza rete durante la partita, con sincronizzazione
su Cloudflare a fine partita e API di lettura per l'app dell'allenatore.

Primo utilizzo: la prossima partita degli ex compagni di squadra dell'utente.
Chi registra è una sola persona per partita.

Criteri di successo:

- Ogni azione di gioco si registra con al massimo due tap.
- Nessuna chiamata di rete è necessaria dall'inizio alla fine della partita.
- La app resta reattiva su Chrome Android di un Samsung di 6–8 anni.
- A fine partita un tap porta tutti i dati sul server.
- Un terzo (l'allenatore) legge il box score via API con una chiave propria.

## 2. Decisioni prese

| Tema | Decisione |
|---|---|
| Avversari | A livello di squadra. Punti e falli attribuibili al numero di maglia; tutto il resto senza numero. |
| Accesso | Password unica condivisa, nessun utente. Token firmato valido 30 giorni. |
| Cronometro | Opzionale per partita: con cronometro (tempo residuo del periodo) o solo periodo. |
| Ruoli | Italiani: Play, Guardia, Ala, Ala grande, Centro. |
| Valutazione | Formula Lega: (PT + RT + AS + ST + PR + FS) − (TL sbagliati + T2 sbagliati + T3 sbagliati + PP + SS + FF). |
| Minuti giocati | Calcolati dagli eventi di cambio, ciascuno con periodo e tempo. |
| Architettura | PWA offline-first su IndexedDB; Worker Cloudflare con static assets e D1 per sync e API. |
| Stack | Preact + TypeScript, Vite, CSS a mano, campo in SVG, Vitest. Worker in TypeScript, wrangler. |

## 3. Modello dati

Tutti gli id sono generati dal client (UUID v4). Ogni record ha `updatedAt`
(ms epoch) e `deleted` (boolean) per la sync.

### Team

`id, name, shortName, color`

Una sola squadra "mia" per installazione, ma il modello ne consente più di una.

### Player

`id, teamId, firstName, lastName, number, role, active, photoUrl?`

`role ∈ {PLAY, GUARDIA, ALA, ALA_GRANDE, CENTRO}`.

### Opponent

`id, name, shortName, roster: {number, name?}[]`

### Game

`id, teamId, opponentId, date (ISO), home (bool), competition?, venue?,
status ∈ {SCHEDULED, LIVE, CLOSED}, useClock (bool), periodLengthMin (default 10),
periodsRegulation (default 4), currentPeriod, source ∈ {MANUAL, ICS}, icsUid?,
starters: playerId[] (max 5), notes?`

### GameEvent

`id, gameId, seq (int, crescente nella partita), period, clockSec? (tempo
residuo), side ∈ {US, THEM}, type, playerId? (lato US), jerseyNumber? (lato
THEM, solo per SHOT_* e FOUL), x?, y? (coordinate normalizzate 0–1 su mezzo
campo, solo per tiri da campo), made? (bool, per i tiri), assistPlayerId?
(per i tiri segnati), foulKind? ∈ {PERSONAL, UNSPORTSMANLIKE, TECHNICAL,
OFFENSIVE}, subInPlayerId?, subOutPlayerId? (per SUBSTITUTION), createdAt`

Tipi di evento:

```
SHOT_2, SHOT_3, FREE_THROW
REBOUND_OFF, REBOUND_DEF
TURNOVER, STEAL
BLOCK, BLOCK_RECEIVED
FOUL, FOUL_DRAWN
SCREEN
SUBSTITUTION
TIMEOUT
PERIOD_START, PERIOD_END
```

Regole:

- L'assist non è un evento: è un campo del tiro segnato. Il box score lo
  conta scorrendo i tiri. Questo evita assist orfani dopo un undo.
- `FOUL` lato US con `playerId` incrementa i falli del giocatore e di squadra.
  `FOUL` lato THEM con `jerseyNumber` incrementa i falli di quel numero e di
  squadra avversaria. `FOUL_DRAWN` è sempre lato US con `playerId`.
- Lato THEM sono ammessi solo: SHOT_2, SHOT_3, FREE_THROW (con jerseyNumber
  opzionale), REBOUND_OFF/DEF, TURNOVER, STEAL, BLOCK, FOUL (con jerseyNumber
  opzionale), TIMEOUT. Niente SUBSTITUTION né SCREEN.
- Undo = cancellazione logica dell'evento con `seq` più alto non ancora
  cancellato (`deleted = true`). Un undo non cancella PERIOD_START/END: quelli
  si gestiscono dal menu periodo.
- `PERIOD_START` del periodo 1 porta la partita in `LIVE`. La chiusura
  partita inserisce `PERIOD_END` dell'ultimo periodo e porta `status` a
  `CLOSED`. I supplementari sono periodi 5, 6, … con durata 5 minuti.

### Derivazione del box score

Funzione pura `computeBoxScore(game, events, players) → BoxScore`.
Per ogni giocatore: minuti, PT, T2 fatti/tentati, T3 fatti/tentati, TL
fatti/tentati, percentuali, RO, RD, RT, AS, PP, PR, ST, SS, FF, FS, blocchi
(SCREEN), valutazione, plus/minus. Riga squadra e riga avversari (punti,
rimbalzi, perse, recuperate, stoppate, falli; falli per numero di maglia).

Minuti: per ciascun giocatore si sommano gli intervalli in campo. Un
giocatore è in campo dall'inizio del periodo 1 se è tra gli `starters`, poi
entra/esce con SUBSTITUTION. Senza cronometro il tempo dell'evento di cambio
è chiesto all'utente al momento del cambio (minuto del periodo, default
metà periodo). Con cronometro si usa `clockSec` del cronometro della app. Il
fine periodo chiude tutti gli intervalli aperti; l'inizio periodo successivo
li riapre per gli stessi giocatori.

Classificazione 2/3: funzione pura `shotValueFromPosition(x, y) → 2 | 3`
con la geometria FIBA (arco a 6,75 m, corridoi laterali a 0,90 m dalla linea
laterale). L'utente può forzare il valore con un toggle nel popup del tiro.

## 4. Frontend

### Struttura

```
app/
  src/
    main.tsx            bootstrap, router, registrazione service worker
    db/                 IndexedDB (idb), repository per entità, outbox sync
    model/              tipi, boxscore.ts, shotValue.ts, minutes.ts, ics.ts
    state/              store Preact signals: sessione, partita live
    ui/                 componenti: Court, PlayerBar, ActionGrid, TopBar,
                        ShotPopup, NumberPad, BoxScoreTable, ShotChart, …
    pages/              Login, Home, Roster, Opponents, Calendar, Game (live),
                        GameStats, Season, Settings
    api/                client HTTP con token, sync.ts
    sw.ts               service worker: precache shell, cache-first
  public/manifest.webmanifest, icone
```

Router hash-based (nessuna configurazione server). Bundle target < 100 KB
gzip. Nessuna animazione costosa, nessuna libreria UI, CSS con variabili.
Target browser: Chrome Android ≥ 70 (ES2018, no top-level await).

### Schermata partita live

Layout verticale a tutto schermo, orientamento portrait.

1. **TopBar** fissa: punteggio US–THEM, periodo, falli squadra per periodo
   di entrambe, cronometro (se attivo: start/stop con tap, tempo residuo
   modificabile con tap lungo), pulsanti Undo, Cambi, Menu.
2. **Court** (~55% altezza): mezzo campo SVG con canestro in alto, toggle
   Noi/Loro sopra il campo. Tap sul campo apre **ShotPopup** nel punto
   toccato: Canestro / Errore, valore 2|3 pre‑calcolato con toggle, se
   canestro lato US un selettore opzionale dell'assist tra i quattro
   compagni in campo. Pulsante "Tiro libero" fuori dal campo apre un popup
   fatto/sbagliato ripetibile (1, 2 o 3 tiri in sequenza).
3. **PlayerBar**: i cinque in campo (lato US). Tap seleziona il giocatore
   corrente (evidenziato). Lato THEM la barra mostra una tastiera dei numeri
   di maglia noti dell'avversario più "Squadra".
4. **ActionGrid**: Rimb O, Rimb D, Persa, Recup, Stoppata, Stopp. subita,
   Fallo, Fallo subito, Blocco, Timeout. Ordine accettato: giocatore poi
   azione, oppure azione poi giocatore. Con nessun giocatore selezionato e
   lato THEM, l'azione va alla squadra avversaria.
5. **Feedback**: toast di 600 ms con il testo dell'evento ("#7 Rossi – T3
   segnato"). Nessuna conferma modale per le azioni; conferma solo per
   chiusura partita.
6. **Cambi**: pannello dal basso con in campo e panchina; tap su uno in
   campo e uno in panchina esegue il cambio. Chiede il minuto se il
   cronometro è spento (slider 0–10, default residuo stimato).
7. **Menu**: inizio/fine periodo, supplementare, timeout, modifica
   quintetto iniziale (solo prima del periodo 1), cronologia eventi con
   cancellazione puntuale, chiudi partita.

Persistenza: ogni evento è scritto in IndexedDB prima dell'aggiornamento
della UI. Al riapri della pagina la partita LIVE si ricarica dallo stato
salvato.

### Altre schermate

- **Login**: campo password, salva token. Senza token la app mostra solo
  Login (le pagine locali restano bloccate per coerenza, anche se i dati
  sono sul dispositivo).
- **Home**: prossima partita, ultime partite, pulsante Sincronizza con stato
  (n record in attesa, ultima sync).
- **Roster**: lista, aggiungi/modifica inline, import CSV
  (`numero;cognome;nome;ruolo`), attiva/disattiva.
- **Avversari**: lista squadre, per ciascuna i numeri di maglia con nome
  opzionale.
- **Calendario**: lista partite per data; import .ics (file picker). Il
  parser legge VEVENT: DTSTART, SUMMARY, LOCATION, UID. Dal SUMMARY si
  estrae l'avversario con euristica ("Mia Squadra - Avversario" → trasferta
  se la mia squadra è seconda). Anteprima riga per riga con avversario
  modificabile (scelta tra esistenti o crea nuovo) e casa/trasferta prima
  del salvataggio. Re‑import dello stesso UID aggiorna invece di duplicare.
  Creazione manuale della partita.
- **Statistiche partita**: box score, mappa tiri con filtri per
  giocatore/periodo/esito, cronologia. Export JSON e CSV scaricabili.
- **Stagione**: medie per giocatore sulle partite CLOSED, totali squadra.
- **Impostazioni**: squadra, durata periodi di default, logout, cancella
  dati locali.

## 5. Backend (Cloudflare Worker)

```
worker/
  src/index.ts        router, auth middleware
  src/auth.ts         login, JWT HS256 (Web Crypto)
  src/sync.ts         push/pull
  src/read.ts         API lettura per allenatore
  migrations/0001_init.sql
  wrangler.jsonc
```

Binding: `ASSETS` (static assets dalla build Vite, con fallback SPA a
`index.html`), `DB` (D1). Secret: `APP_PASSWORD`, `JWT_SECRET`,
`COACH_API_KEY`.

### Auth

- `POST /api/login {password}` → `{token, expiresAt}`. Confronto a tempo
  costante. Rate limit semplice: dopo 5 errori dallo stesso IP in 15 minuti
  risponde 429 (contatore in D1).
- Header `Authorization: Bearer <jwt>` per tutte le route `/api/*` tranne
  login. JWT HS256 con `exp` a 30 giorni.
- Header `X-Api-Key: <COACH_API_KEY>` consente solo le route `/api/v1/read/*`
  e `/api/v1/roster/import`.

### Sync

- `POST /api/sync/push` body `{teams[], players[], opponents[], games[],
  events[]}` → upsert per id se `updatedAt` ricevuto ≥ quello salvato
  (last‑write‑wins). Gli eventi sono immutabili tranne `deleted`. Risposta:
  `{accepted: n, serverTime}`.
- `GET /api/sync/pull?since=<ms>` → tutti i record con `updatedAt > since`.
  Il client applica lo stesso last‑write‑wins
  in locale e aggiorna il proprio `lastPulledAt`.
- Il client tiene un outbox: ogni scrittura locale segna il record come
  `dirty`; push invia i dirty e li pulisce al 200.

### API lettura per allenatore (v1)

- `GET /api/v1/read/games` → lista partite con punteggio finale.
- `GET /api/v1/read/games/:id/boxscore` → stesso oggetto `BoxScore` del
  frontend (il Worker importa la stessa funzione pura da un pacchetto
  condiviso `shared/`).
- `GET /api/v1/read/games/:id/events` → eventi grezzi.
- `GET /api/v1/read/players` → roster.
- `POST /api/v1/roster/import` body `{players: [{number, lastName,
  firstName, role}]}` → upsert per numero di maglia; i giocatori non presenti
  non vengono toccati. Pronta per l'integrazione futura con l'API esterna.

### D1

Tabelle `teams, players, opponents, games, events, login_attempts` con
colonne che specchiano il modello; `opponents.roster` e `games.starters` in
JSON. Indici su `events(game_id, seq)` e su `updated_at` di ogni tabella.

## 6. Pacchetto condiviso

`shared/` contiene tipi TypeScript e le funzioni pure (`boxscore.ts`,
`shotValue.ts`, `minutes.ts`, `rating.ts`). Importato sia da `app/` sia da
`worker/` tramite workspace npm. Qui vivono la maggior parte dei test.

## 7. Gestione errori

- Scritture IndexedDB fallite: toast rosso persistente, l'evento resta in
  memoria e si ritenta al tap successivo.
- Sync senza rete o 5xx: messaggio "Sync rimandata", nulla viene perso,
  l'outbox resta pieno.
- Token scaduto (401): la app torna alla Login mantenendo i dati locali;
  dopo il login la sync riparte.
- Import .ics malformato: si mostrano le righe lette e quelle scartate con
  motivo.
- Tiro senza giocatore selezionato lato US: il popup chiede il giocatore
  tra i cinque in campo prima di salvare.

## 8. Test

- Vitest su `shared/`: box score (casi: tiri, assist, rimbalzi, falli,
  undo via deleted), minuti giocati (starter, cambi, periodi, supplementare,
  senza cronometro), `shotValueFromPosition` (punti noti dentro/fuori arco e
  corridoi), valutazione Lega.
- Vitest su `app/src/model/ics.ts` con file .ics di esempio (Google
  Calendar e Outlook) e sulla logica di merge last‑write‑wins della sync.
- Worker: test con `@cloudflare/vitest-pool-workers` su login, auth,
  push/pull e route di lettura, D1 in memoria.
- Verifica manuale su Chrome Android reale prima della partita: percorso
  completo da import .ics a sync.

## 9. Deploy

- Monorepo npm workspaces: `shared/`, `app/`, `worker/`.
- `npm run dev` avvia Vite e `wrangler dev` insieme con proxy `/api`.
- `npm run deploy`: build dell'app in `worker/public`, `wrangler deploy`.
- Primo deploy: `npx wrangler login` con l'account klide10@gmail.com,
  `wrangler d1 create bkstats`, applicazione migrazioni, `wrangler secret
  put` per i tre secret.
- URL: `bkstats.<subdomain>.workers.dev`, installabile come PWA da Chrome.

## 10. Fuori scopo per questa versione

Più utenti con ruoli, tracciamento individuale degli avversari, video,
statistiche avanzate (lineup, play‑type), import roster da API esterna
(predisposta la route, manca il connettore), modalità landscape dedicata.
