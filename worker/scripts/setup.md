# Checklist primo deploy

Da eseguire una volta sola, con l'account Cloudflare scelto per il progetto. I comandi `npx wrangler …` qui sotto vanno lanciati come `scripts/wr.sh …` dalla root del repo, così usano il profilo selezionato.

1. **Scegli l'account** (dalla root del repo). Il profilo `personal` usa una cartella di configurazione separata,
   così il login wrangler globale del Mac (account di lavoro) non viene toccato:
   ```bash
   scripts/cf-profile.sh personal    # apre il browser per il login la prima volta
   scripts/cf-profile.sh work        # torna al login globale
   scripts/cf-profile.sh status      # mostra profilo e account attivi
   ```
   Tutti i comandi `npm run dev|deploy|migrate -w worker` usano il profilo selezionato (file `.cf-profile`, ignorato da git).
2. **Database D1**:
   ```bash
   scripts/wr.sh d1 create bkstats
   ```
   Copia il `database_id` stampato in `wrangler.jsonc` al posto di `REPLACE_AFTER_D1_CREATE`, poi:
   ```bash
   npm run migrate
   ```
3. **Secret**:
   ```bash
   scripts/wr.sh secret put APP_PASSWORD    # password condivisa della app
   scripts/wr.sh secret put JWT_SECRET      # openssl rand -base64 48
   scripts/wr.sh secret put COACH_API_KEY   # chiave da dare all'allenatore
   ```
4. **Deploy** (dalla root del repo):
   ```bash
   npm run deploy
   ```
5. **Verifica**:
   ```bash
   curl https://bkstats.<subdomain>.workers.dev/api/health
   curl -H "X-Api-Key: <COACH_API_KEY>" https://bkstats.<subdomain>.workers.dev/api/v1/read/games
   ```
6. Apri l'URL su Chrome Android, accedi, installa la PWA. Prova in modalità aereo: la app deve aprirsi e registrare eventi; tornato online premi Sincronizza.

Per i deploy successivi basta `npm run deploy`. Le nuove migrazioni si applicano con `npm run migrate -w worker`.
