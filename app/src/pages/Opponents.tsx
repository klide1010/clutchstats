import { useEffect, useState } from 'preact/hooks';
import type { Opponent } from '@bkstats/shared';
import { addNumbers, findOrCreateOpponent, loadOpponents, opponents, parseJerseyNumbers, removeOpponent, saveOpponent } from '../state/opponents';
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';
import { toast } from '../ui/Toast';

function OpponentDetail({ o, onBack }: { o: Opponent; onBack: () => void }) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const roster = [...o.roster].sort((a, b) => a.number - b.number);

  const parsed = parseJerseyNumbers(num);
  const addRow = async () => {
    if (parsed.length === 0) return;
    if (parsed.length === 1 && name.trim()) {
      const n = parsed[0];
      await saveOpponent({ ...o, roster: o.roster.filter((r) => r.number !== n).concat([{ number: n, name: name.trim() }]) });
    } else {
      await addNumbers(o.id, parsed);
    }
    setNum(''); setName('');
    toast(parsed.length === 1 ? `#${parsed[0]} aggiunto` : `${parsed.length} numeri aggiunti`);
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); void addRow(); } };

  return (
    <main class="page stack">
      <PageTitle icon="shield" onBack={onBack} subtitle={`${o.roster.length} numeri di maglia`}>{o.name}</PageTitle>
      <div class="card stack">
        <label>Nome<input value={o.name} onChange={(e) => saveOpponent({ ...o, name: (e.target as HTMLInputElement).value })} /></label>
        <label>Sigla<input value={o.shortName} maxLength={4} onChange={(e) => saveOpponent({ ...o, shortName: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>
      </div>
      <h2>Numeri di maglia</h2>
      <p class="muted" style="margin:0">Servono per attribuire punti e falli. Puoi inserirne più d'uno insieme: <b>7 12 23</b>.</p>
      <label>Numero (o lista di numeri)<input type="tel" value={num} placeholder="es. 7 12 23" onInput={(e) => setNum((e.target as HTMLInputElement).value)} onKeyDown={onKey} /></label>
      <label>Nome (opzionale, solo per un numero)<input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} onKeyDown={onKey} /></label>
      <button class="btn btn-primary btn-block btn-icon" disabled={parsed.length === 0} onClick={addRow}><Icon name="plus" size={18} /> {parsed.length > 1 ? `Aggiungi ${parsed.length} numeri` : 'Aggiungi numero'}</button>
      <ul class="list">
        {roster.map((r) => (
          <li key={r.number}>
            <b style="width:2.2em">#{r.number}</b>
            <span style="flex:1">{r.name ?? <span class="muted">—</span>}</span>
            <button class="btn btn-sm btn-icon icon-only btn-ghost danger" aria-label="Rimuovi" onClick={() => saveOpponent({ ...o, roster: o.roster.filter((x) => x.number !== r.number) })}><Icon name="x" size={16} /></button>
          </li>
        ))}
        {roster.length === 0 && <li class="muted">Nessun numero. Servono per attribuire punti e falli.</li>}
      </ul>
    </main>
  );
}

export function Opponents() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => { void loadOpponents(); }, []);

  const selected = opponents.value.find((o) => o.id === selectedId);
  if (selected) return <OpponentDetail o={selected} onBack={() => setSelectedId(null)} />;

  const create = async () => {
    if (!newName.trim()) return;
    const o = await findOrCreateOpponent(newName);
    setNewName('');
    toast('Avversario salvato');
    setSelectedId(o.id);
  };

  return (
    <main class="page stack">
      <PageTitle icon="shield">Avversari</PageTitle>
      <div class="row">
        <input placeholder="Nome squadra avversaria" value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} style="margin:0" />
        <button class="btn btn-icon" style="flex:0 0 auto" disabled={!newName.trim()} onClick={create}><Icon name="plus" size={18} /> Aggiungi</button>
      </div>
      <ul class="list">
        {opponents.value.map((o) => (
          <li key={o.id}>
            <span style="flex:1" onClick={() => setSelectedId(o.id)}>
              <b>{o.name}</b> <span class="muted">{o.shortName}</span><br />
              <span class="muted">{o.roster.length} numeri</span>
            </span>
            <button class="btn btn-sm btn-icon icon-only btn-ghost danger" aria-label="Elimina" onClick={() => { if (confirm(`Eliminare ${o.name}?`)) void removeOpponent(o.id); }}><Icon name="trash" size={16} /></button>
          </li>
        ))}
        {opponents.value.length === 0 && <li class="muted">Nessun avversario.</li>}
      </ul>
    </main>
  );
}
