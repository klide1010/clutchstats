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
- Nel PDF anche i **falli antisportivi, tecnici e in attacco**, per giocatore (noi) e numero di maglia (loro), con il periodo
  (`specialFouls`). La colonna FF del box score resta il totale di tutti i falli.

- **Minuti sbagliati con Vall'Alta**: senza cronometro il selettore del cambio chiedeva i minuti *giocati* (0 = inizio periodo), ma a
  bordo campo si leggono quelli del tabellone, che conta alla rovescia. Tutti i cambi della partita sono stati inseriti così: tempi
  ribaltati, 248 minuti totali su 200 possibili (Chiesa 43' su 40). Ora il selettore chiede "Minuti sul tabellone" e sotto dice a quanti
  minuti giocati corrispondono. I dati della partita si correggono specchiando `clock_sec` dei cambi (600 − valore): il totale torna a 200.
  La partita con i 46ers (7 ottobre) ha tempi dei cambi non in ordine in nessuna delle due letture: lasciata com'è.

- **Box score nella pagina statistiche**: niente più spunta "Mostra percentuali", ogni tiro mostra sempre segnati/tentati con la
  percentuale sotto (nessuna percentuale a 0 tentativi). Falli speciali come colonne dopo FF: FA antisportivi, FT tecnici, FO in attacco
  (`app/src/model/fouls.ts`), mostrate solo se nella partita c'è almeno un fallo di quel tipo, con legenda sotto; FF resta il totale.
  Il tecnico senza giocatore (panchina) conta nella riga Squadra. CSV invariato.
- Percentuali anche nel **PDF**: sotto T2/T3/TL la percentuale in piccolo, come nell'app (righe un po' più alte; con 12 convocati il
  referto sta ancora in una pagina).

## 25 ottobre — visualizzazione delle partite

- Dopo percentuali e colonne dei falli speciali il box score su telefono era irregolare: righe alte e basse (percentuale solo con
  tentativi) e la colonna giocatore larga quanto il cognome più lungo. Ora ogni tiro tiene la riga della percentuale (vuota a 0 tentativi)
  e il cognome si tronca con "…" oltre 8,5rem; bordo a destra della colonna fissa.
- "Falli avversari" / "Punti avversari" (due righe di testo) diventano una tabellina **Avversari per numero** (# · PT · FF).
- **Cronologia** divisa per periodo, dal più recente, con il punteggio a fine periodo nell'intestazione e il punteggio progressivo accanto
  a ogni canestro (in arancione la squadra che ha segnato). Righe più basse.
- **Calendario** in tre sezioni: In corso, Prossime (dalla più vicina), Giocate (dalla più recente) con risultato e V/P/N. La palestra
  perde il prefisso "Campo: N -" ovunque (`venueLabel`, `app/src/model/gameView.ts`).

## 25 ottobre — partita live su tablet (anteprima)

- Schermata di registrazione con due layout tablet, solo CSS su `.game` (il telefono resta identico):
  **verticale** (≥700px di larghezza): campo in alto, sotto i 5 in campo in colonna (numero grande, cognome intero, falli) a sinistra e
  azioni su 3 colonne a destra; **orizzontale** (≥900×560): barra con punteggio, cronometro e Undo/Cambi/menu su una riga, poi
  "Ultime azioni" (`LiveFeed`, con punteggio progressivo) | campo | pannello Noi/Loro, giocatori, azioni.
- Manifest `orientation: 'any'` per lasciar ruotare i tablet; sui telefoni (lato corto < 600px) l'app installata si blocca in verticale
  con `screen.orientation.lock` (`app/src/state/orientation.ts`). I telefoni con l'app già installata prendono il nuovo manifest quando
  Chrome aggiorna la WebAPK.
- Prova di Andrea sul browser del Mac (finestra larga ma bassa): pannello destro tagliato in fondo. Ora in orizzontale giocatori e azioni
  si dividono l'altezza (righe tra 40 e 64/72px). Inoltre "Ultime azioni" e la cronologia ordinano per periodo e poi per inserimento:
  un evento aggiunto dopo per un periodo passato (cambi col tempo del tabellone) non finisce più in mezzo al periodo corrente.
- Pubblicata prima come **versione di anteprima** del Worker (`wrangler versions upload --preview-alias tablet`), senza toccare la
  produzione; provata da Andrea, poi unita a `main` e pubblicata in produzione lo stesso giorno.

## 25 ottobre — rifiniture delle statistiche

- Box score: i convocati **non entrati** (zero minuti e nessuna statistica) vanno in fondo, in grigio, con "N.E." al posto dei minuti.
- Punteggio finale con la sigla della squadra al posto di "NOI" e l'etichetta Vittoria/Sconfitta/Pareggio a partita chiusa.
- Tiri: filtri "Tutti i giocatori" (riga intera), "Tutti i periodi", "Tutti i tiri" (prima tre "Tutti" ambigui e uno troncato).
- Cronologia filtrabile per tipo (Tutto, Tiri, Falli, Cambi) e per giocatore (conta anche assist e chi entra/esce dal cambio).
- Esportazioni: in vista "Referto PDF"; CSV e JSON sotto "Dati".
- Stagione: tiri con la percentuale sotto (nei totali, come nel box score) e colonne FA/FT/FO quando ci sono; nelle medie divise per le
  partite giocate. Tabella estratta in `SeasonTable` per i test.

## Cose aperte

- Roster: numeri di maglia di Gabriele Giuliano, Ripamonti, Silvi e Storto (ora 90–93, inattivi).
- Import roster dall'API esterna dell'allenatore quando sarà disponibile (route `POST /api/v1/roster/import` già pronta).
- Minori rimandati dalla revisione: undo senza toast, partita chiusa che accetta ancora undo, minuto di default dei cambi nei supplementari
  con periodi non multipli di 5, avviso dati non sincronizzati prima di "Cancella dati locali", CORS per un'app allenatore su altro dominio.
