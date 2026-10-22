# Diario di progetto — ClutchStats

Storico delle decisioni prese insieme a Claude. Serve come base per riprendere il lavoro: cosa è stato scelto e perché.

## 6 ottobre 2026 — nascita

- Richiesta: app di statistiche basket live, stile iStatVball/Easy Stats, per gli ex compagni di squadra; da usare su un Samsung vecchio;
  rilascio come webapp su Cloudflare Workers con l'account klide10@gmail.com; in futuro API di export per l'allenatore e import roster.
- Scelte di design: avversari a livello di squadra con punti e falli per numero di maglia; login con password unica condivisa;
  cronometro opzionale per partita; ruoli italiani; valutazione Lega; minuti giocati dai cambi (minuto chiesto se il cronometro è spento).
- Architettura "offline-first": PWA con IndexedDB, Worker + D1 per sync e API. Spec e piano in `docs/superpowers/`.
- Implementazione in 21 task con TDD. Revisione finale indipendente: corretti cursore di sync, race sui record dirty,
  ripristino cronometro al reload, compatibilità Chrome vecchi, bootstrap squadra, doppio tap, tiri liberi.

## 7 ottobre — primo rilascio e dati

- Deploy su https://bkstats.klide10.workers.dev con profilo Cloudflare separato (`scripts/cf-profile.sh personal`) per non toccare il login aziendale.
- Il telefono è Chrome 65: target abbassato da 70 a 65 (esbuild/CSS, polyfill nel service worker, niente `gap` flex, `aspect-ratio`, `inset`).
- Squadra **Fiore Outlanders** (viola e giallo); calendario 2026-27 (22 partite, 11 avversarie) importato dal calendario Google;
  roster di 18 giocatori letto dal sito del club (4 senza numero inseriti inattivi con numeri 90–93); logo squadra.
- Correzioni d'uso: convocati prima del quintetto; statistiche live solo dei convocati; campo con proporzioni FIBA e arco da tre corretto;
  tiro da 2/3 deciso dalla posizione senza chiedere; colore squadra come colore primario.

## 7–8 ottobre — redesign e funzioni di partita

- Tema chiaro/scuro in Impostazioni, font Barlow Condensed (numeri/titoli) e Montserrat (testi), icone SVG inline ovunque.
- Mappa tiri: cerchio verde canestro, X rossa errore, liberi sulla lunetta.
- Numeri di maglia avversari con inserimento multiplo e salvataggio dal vivo; timeout nella barra; barra di navigazione sopra le tabelle.
- Passaggio della partita tra telefoni: `ownerDevice` sulla partita; chi riceve una gara in corso sceglie "Prendi in carico" o "Riparti da zero";
  "Invia partita (sync)" nel menu e sync automatica a fine periodo.
- Nuovo nome e logo: prima HoopMetrics, poi **ClutchStats** (scelto l'8 ottobre). Tre proposte grafiche su una tela; scelta **Analytics Mono**:
  fondi neutri, navy e arancione del logo solo sui dati, campo stile lavagna tecnica.
- Colore squadra gestito dinamicamente (`deriveTeamPalette`): se contrasta poco con il tema viene scurito/schiarito, testo bianco o navy scelto da solo.

## 9 ottobre — rifiniture e regole

- Testata comune con marchio e pulsante impostazioni; barra in basso a 4 voci; titoli pagina con icona coerenti; pulsanti con icona e testo spaziati.
- Contatore falli a quadratini (verde 1–2, giallo 3, arancione 4, rosso 5).
- Quinto fallo: avviso con "Sostituisci" (pannello cambi con il giocatore già in uscita) o "Annulla il fallo"; nessuna azione accettata
  per un giocatore con 5 falli, che non può rientrare.
- Convocati e quintetto come schede giocatore con spunta; inattivi nascosti dietro un interruttore; pulsanti icona quadrati e "ghost"
  per cestino, X e freccia indietro.

## 12 ottobre — repository

- Codice pubblicato su GitHub privato `klide1010/clutchstats`, storico riscritto con l'identità personale. Cloudflare già personale.
- Creati `CLAUDE.md` e questo diario come base per le sessioni future.
- Si lavora in cloud (Claude Code sul web), senza repo locale sul Mac: commit e push diretti su `main`; deploy con il token Cloudflare
  dell'ambiente (solo account personale). Il repo locale, se usato, va prima aggiornato con `git pull`.
- Convocati/quintetto: con cognomi lunghi le schede sbordavano su telefono. Colonne `minmax(0, 1fr)` e, sotto i 420px, una colonna sola
  per leggere cognome, nome e ruolo per intero.

## 22 ottobre — convocati inattivi in panchina (partita con Vall Alta)

- Bug trovato in partita: un convocato **inattivo** partito in quintetto, una volta uscito per un cambio, spariva dalla panchina e non
  poteva più rientrare, nemmeno dopo averlo riattivato nel roster. La panchina filtrava ancora `active`, che serve solo a proporre i
  convocati di default: ora la panchina è "convocati non in campo". Inoltre `reload()` (dopo ogni sync) rilegge anche il roster, così una
  modifica fatta da un altro telefono si vede a partita aperta.
- Nessun dato da sistemare: il cambio era registrato correttamente, mancava solo il giocatore nell'elenco. Dopo il deploy è ricomparso in
  panchina e la partita è proseguita. Due test nuovi in `app/test/liveGame.test.ts`.

- **Quintetto a inizio periodo**: "Inizia periodo" (menu partita) chiede chi parte, con già selezionati i 5 che hanno chiuso il periodo
  precedente e chi ha 5 falli non selezionabile. Le differenze diventano cambi registrati a periodo chiuso (`setPeriodLineup`), che non
  spostano i minuti: si conta da chi è in campo al `PERIOD_START`. Prima bisognava fare i cambi uno per uno.
- **Referto PDF** dalla pagina statistiche (bottone PDF accanto a CSV e JSON): intestazione, punteggio e parziali, box score con legenda,
  punti/falli avversari per numero, mappa tiri noi/loro. Generato da `app/src/model/pdf.ts` senza librerie (Helvetica WinAnsi, solo
  operatori PDF di base), per restare leggeri e compatibili con Chrome 65.

## Cose aperte

- Roster: numeri di maglia di Gabriele Giuliano, Ripamonti, Silvi e Storto (ora 90–93, inattivi).
- Import roster dall'API esterna dell'allenatore quando sarà disponibile (route `POST /api/v1/roster/import` già pronta).
- Minori rimandati dalla revisione: undo senza toast, partita chiusa che accetta ancora undo, minuto di default dei cambi nei supplementari
  con periodi non multipli di 5, avviso dati non sincronizzati prima di "Cancella dati locali", CORS per un'app allenatore su altro dominio.
