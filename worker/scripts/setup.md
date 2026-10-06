# Checklist primo deploy

Da eseguire una volta sola, dalla cartella `worker/`, con l'account Cloudflare scelto per il progetto.

1. **Login** (apre il browser):
   ```bash
   npx wrangler login
   npx wrangler whoami      # verifica che l'email sia quella giusta
   ```
   Se su questo Mac wrangler è già collegato a un altro account e non vuoi cambiarlo, in alternativa crea un API token
   (Cloudflare dashboard → My Profile → API Tokens → template "Edit Cloudflare Workers" + permesso D1 Edit) e usalo così:
   ```bash
   export CLOUDFLARE_API_TOKEN=...
   export CLOUDFLARE_ACCOUNT_ID=...
   ```
2. **Database D1**:
   ```bash
   npx wrangler d1 create bkstats
   ```
   Copia il `database_id` stampato in `wrangler.jsonc` al posto di `REPLACE_AFTER_D1_CREATE`, poi:
   ```bash
   npm run migrate
   ```
3. **Secret**:
   ```bash
   npx wrangler secret put APP_PASSWORD    # password condivisa della app
   npx wrangler secret put JWT_SECRET      # openssl rand -base64 48
   npx wrangler secret put COACH_API_KEY   # chiave da dare all'allenatore
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
