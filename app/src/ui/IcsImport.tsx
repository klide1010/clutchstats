import { useState } from 'preact/hooks';
import { parseIcs, proposeGames, type GameProposal } from '../model/ics';
import { DEFAULT_TEAM_NAME, myTeam, saveTeam, shortNameFor } from '../state/team';
import { findOrCreateOpponent, opponents } from '../state/opponents';
import { importProposals } from '../state/games';
import { toast } from '../ui/Toast';
import { readFileText } from '../model/fileText';

interface Row extends GameProposal { include: boolean; opponentChoice: string } // opponentChoice: id esistente oppure 'NEW'

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function IcsImport({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [errors, setErrors] = useState<{ line: number; reason: string }[]>([]);
  const [useClock, setUseClock] = useState(false);
  const [busy, setBusy] = useState(false);
  const needsName = !myTeam.value || myTeam.value.name === DEFAULT_TEAM_NAME;
  const [teamName, setTeamName] = useState('');

  const confirmName = async () => {
    const name = teamName.trim();
    if (!name) return;
    await saveTeam({ name, shortName: shortNameFor(name) });
  };

  const onFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    let parsed: ReturnType<typeof parseIcs>;
    try {
      parsed = parseIcs(await readFileText(file));
    } catch {
      toast('Impossibile leggere il file', 'error');
      return;
    }
    const props = proposeGames(parsed.events, myTeam.value?.name ?? '');
    setErrors(parsed.errors);
    setRows(props.map((p) => {
      const match = opponents.value.find((o) => o.name.toLowerCase() === p.opponentName.toLowerCase());
      return { ...p, include: true, opponentChoice: match ? match.id : 'NEW' };
    }));
    (e.target as HTMLInputElement).value = '';
  };

  const update = (i: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const doImport = async () => {
    if (!rows) return;
    setBusy(true);
    try {
      const selected = rows.filter((r) => r.include);
      const byUid: Record<string, string> = {};
      for (const r of selected) {
        byUid[r.icsUid] = r.opponentChoice === 'NEW' ? (await findOrCreateOpponent(r.opponentName)).id : r.opponentChoice;
      }
      const res = await importProposals(selected, byUid, useClock);
      toast(`${res.created} create, ${res.updated} aggiornate`);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  if (!rows && needsName) {
    return (
      <div class="card stack">
        <strong>Prima di importare</strong>
        <p class="muted">Serve il nome della tua squadra per capire quali partite sono in casa e chi sono gli avversari.</p>
        <label>Come si chiama la tua squadra?<input value={teamName} onInput={(e) => setTeamName((e.target as HTMLInputElement).value)} /></label>
        <div class="row">
          <button class="btn" onClick={onDone}>Annulla</button>
          <button class="btn btn-primary" disabled={!teamName.trim()} onClick={confirmName}>Avanti</button>
        </div>
      </div>
    );
  }

  if (!rows) {
    return (
      <div class="card stack">
        <strong>Importa calendario (.ics)</strong>
        <p class="muted">Squadra: <b>{myTeam.value?.name}</b>. Esporta il calendario da Google Calendar o Outlook e carica il file. Gli avversari nuovi vengono creati in automatico; le partite già importate vengono aggiornate, non duplicate.</p>
        <div class="row">
          <button class="btn" onClick={onDone}>Annulla</button>
          <label class="btn btn-primary" style="margin:0">Scegli file<input type="file" accept=".ics,text/calendar" style="display:none" onChange={onFile} /></label>
        </div>
      </div>
    );
  }

  return (
    <div class="card stack">
      <strong>Anteprima ({rows.filter((r) => r.include).length} di {rows.length})</strong>
      <label class="row" style="color:var(--fg)"><input type="checkbox" style="width:auto;flex:0" checked={useClock} onChange={(e) => setUseClock((e.target as HTMLInputElement).checked)} /> Usa cronometro in queste partite</label>
      {rows.map((r, i) => (
        <div key={r.icsUid} class="card stack" style={r.include ? '' : 'opacity:0.5'}>
          <label class="row" style="color:var(--fg)">
            <input type="checkbox" style="width:auto;flex:0" checked={r.include} onChange={(e) => update(i, { include: (e.target as HTMLInputElement).checked })} />
            <span style="flex:1"><b>{fmtDate(r.date)}</b><br /><span class="muted">{r.summary}</span></span>
          </label>
          <div class="row">
            <select value={r.opponentChoice} onChange={(e) => update(i, { opponentChoice: (e.target as HTMLSelectElement).value })} style="margin:0">
              <option value="NEW">Nuovo: {r.opponentName}</option>
              {opponents.value.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => update(i, { home: !r.home })}>{r.home ? 'Casa' : 'Trasferta'}</button>
          </div>
        </div>
      ))}
      {errors.map((er) => <p key={er.line} class="error">Riga {er.line}: {er.reason}</p>)}
      <div class="row">
        <button class="btn" onClick={() => setRows(null)}>Indietro</button>
        <button class="btn btn-primary" disabled={busy || rows.every((r) => !r.include)} onClick={doImport}>Importa</button>
      </div>
    </div>
  );
}
