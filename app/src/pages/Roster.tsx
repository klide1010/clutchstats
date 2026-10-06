import { useEffect, useState } from 'preact/hooks';
import { newId, ROLE_LABELS, ROLES, type Player, type Role } from '@bkstats/shared';
import { ensureTeam, loadPlayers, myTeam, players, removePlayer, savePlayer, savePlayers, saveTeam } from '../state/team';
import { mergeRoster, parseRosterCsv, type RosterCsvResult } from '../model/rosterCsv';
import { toast } from '../ui/Toast';

interface Draft { id: string; number: string; lastName: string; firstName: string; role: Role; active: boolean }

const emptyDraft = (): Draft => ({ id: newId(), number: '', lastName: '', firstName: '', role: 'PLAY', active: true });

function PlayerForm({ draft, onChange, onSave, onCancel }: { draft: Draft; onChange: (d: Draft) => void; onSave: () => void; onCancel: () => void }) {
  const valid = /^\d+$/.test(draft.number) && draft.lastName.trim() !== '';
  return (
    <div class="card stack">
      <div class="row">
        <label>N.<input inputMode="numeric" value={draft.number} onInput={(e) => onChange({ ...draft, number: (e.target as HTMLInputElement).value })} /></label>
        <label>Ruolo
          <select value={draft.role} onChange={(e) => onChange({ ...draft, role: (e.target as HTMLSelectElement).value as Role })}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </label>
      </div>
      <div class="row">
        <label>Cognome<input value={draft.lastName} onInput={(e) => onChange({ ...draft, lastName: (e.target as HTMLInputElement).value })} /></label>
        <label>Nome<input value={draft.firstName} onInput={(e) => onChange({ ...draft, firstName: (e.target as HTMLInputElement).value })} /></label>
      </div>
      <div class="row">
        <button class="btn" onClick={onCancel}>Annulla</button>
        <button class="btn btn-primary" disabled={!valid} onClick={onSave}>Salva</button>
      </div>
    </div>
  );
}

export function Roster() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [csv, setCsv] = useState<RosterCsvResult | null>(null);
  const [editTeam, setEditTeam] = useState(false);

  useEffect(() => { void loadPlayers(); }, []);

  const startEdit = (p?: Player) => setDraft(p ? { id: p.id, number: String(p.number), lastName: p.lastName, firstName: p.firstName, role: p.role, active: p.active } : emptyDraft());

  const save = async () => {
    if (!draft) return;
    await savePlayer({ id: draft.id, number: Number(draft.number), lastName: draft.lastName.trim(), firstName: draft.firstName.trim(), role: draft.role, active: draft.active });
    setDraft(null);
    toast('Giocatore salvato');
  };

  const onCsvFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    setCsv(parseRosterCsv(await file.text()));
    (e.target as HTMLInputElement).value = '';
  };

  const confirmCsv = async () => {
    if (!csv) return;
    const team = await ensureTeam();
    await savePlayers(mergeRoster(players.value, csv.rows, team.id));
    toast(`${csv.rows.length} giocatori importati`);
    setCsv(null);
  };

  const team = myTeam.value;

  return (
    <main class="page stack">
      <div class="row">
        <h1 style="margin:0">{team?.name ?? 'Roster'}</h1>
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setEditTeam(!editTeam)}>Squadra</button>
      </div>
      {editTeam && team && (
        <div class="card stack">
          <label>Nome squadra<input value={team.name} onChange={(e) => saveTeam({ name: (e.target as HTMLInputElement).value })} /></label>
          <div class="row">
            <label>Sigla<input value={team.shortName} maxLength={4} onChange={(e) => saveTeam({ shortName: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>
            <label>Colore<input type="color" value={team.color} onChange={(e) => saveTeam({ color: (e.target as HTMLInputElement).value })} /></label>
          </div>
        </div>
      )}

      <div class="row">
        <button class="btn" onClick={() => startEdit()}>Aggiungi</button>
        <label class="btn" style="margin:0">
          Importa CSV
          <input type="file" accept=".csv,text/csv" style="display:none" onChange={onCsvFile} />
        </label>
      </div>

      {csv && (
        <div class="card stack">
          <strong>Anteprima import ({csv.rows.length} righe)</strong>
          <ul class="list">
            {csv.rows.map((r) => <li key={r.number}><b>#{r.number}</b> {r.lastName} {r.firstName} <span class="muted">{ROLE_LABELS[r.role]}</span></li>)}
          </ul>
          {csv.errors.map((er) => <p key={er.line} class="error">Riga {er.line}: {er.reason}</p>)}
          <p class="muted">Formato: numero;cognome;nome;ruolo</p>
          <div class="row">
            <button class="btn" onClick={() => setCsv(null)}>Annulla</button>
            <button class="btn btn-primary" disabled={csv.rows.length === 0} onClick={confirmCsv}>Conferma</button>
          </div>
        </div>
      )}

      {draft && <PlayerForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} />}

      <ul class="list">
        {players.value.map((p) => (
          <li key={p.id} style={p.active ? '' : 'opacity:0.5'}>
            <b style="width:2.2em">#{p.number}</b>
            <span style="flex:1" onClick={() => startEdit(p)}>{p.lastName} {p.firstName}<br /><span class="muted">{ROLE_LABELS[p.role]}</span></span>
            <button class="btn btn-sm" onClick={() => savePlayer({ ...p, active: !p.active })}>{p.active ? 'Attivo' : 'Inattivo'}</button>
            <button class="btn btn-sm" onClick={() => { if (confirm(`Eliminare #${p.number} ${p.lastName}?`)) void removePlayer(p.id); }}>✕</button>
          </li>
        ))}
        {players.value.length === 0 && <li class="muted">Nessun giocatore. Aggiungi o importa un CSV.</li>}
      </ul>
    </main>
  );
}
