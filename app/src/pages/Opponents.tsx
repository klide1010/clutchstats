import { useEffect, useState } from 'preact/hooks';
import type { Opponent } from '@bkstats/shared';
import { findOrCreateOpponent, loadOpponents, opponents, removeOpponent, saveOpponent } from '../state/opponents';
import { toast } from '../ui/Toast';

function OpponentDetail({ o, onBack }: { o: Opponent; onBack: () => void }) {
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const roster = [...o.roster].sort((a, b) => a.number - b.number);

  const addRow = async () => {
    if (!/^\d+$/.test(num)) return;
    const n = Number(num);
    const next = o.roster.filter((r) => r.number !== n).concat([{ number: n, name: name.trim() || undefined }]);
    await saveOpponent({ ...o, roster: next });
    setNum(''); setName('');
  };

  return (
    <main class="page stack">
      <div class="row">
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={onBack}>‹ Indietro</button>
        <h1 style="margin:0">{o.name}</h1>
      </div>
      <div class="card stack">
        <label>Nome<input value={o.name} onChange={(e) => saveOpponent({ ...o, name: (e.target as HTMLInputElement).value })} /></label>
        <label>Sigla<input value={o.shortName} maxLength={4} onChange={(e) => saveOpponent({ ...o, shortName: (e.target as HTMLInputElement).value.toUpperCase() })} /></label>
      </div>
      <h2>Numeri di maglia</h2>
      <div class="row">
        <label style="flex:0 0 5em">N.<input inputMode="numeric" value={num} onInput={(e) => setNum((e.target as HTMLInputElement).value)} /></label>
        <label>Nome (opzionale)<input value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <button class="btn" style="flex:0 0 auto;align-self:flex-end" disabled={!/^\d+$/.test(num)} onClick={addRow}>+</button>
      </div>
      <ul class="list">
        {roster.map((r) => (
          <li key={r.number}>
            <b style="width:2.2em">#{r.number}</b>
            <span style="flex:1">{r.name ?? <span class="muted">—</span>}</span>
            <button class="btn btn-sm" onClick={() => saveOpponent({ ...o, roster: o.roster.filter((x) => x.number !== r.number) })}>✕</button>
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
      <h1>Avversari</h1>
      <div class="row">
        <input placeholder="Nome squadra avversaria" value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} style="margin:0" />
        <button class="btn" style="flex:0 0 auto" disabled={!newName.trim()} onClick={create}>Aggiungi</button>
      </div>
      <ul class="list">
        {opponents.value.map((o) => (
          <li key={o.id}>
            <span style="flex:1" onClick={() => setSelectedId(o.id)}>
              <b>{o.name}</b> <span class="muted">{o.shortName}</span><br />
              <span class="muted">{o.roster.length} numeri</span>
            </span>
            <button class="btn btn-sm" onClick={() => { if (confirm(`Eliminare ${o.name}?`)) void removeOpponent(o.id); }}>✕</button>
          </li>
        ))}
        {opponents.value.length === 0 && <li class="muted">Nessun avversario.</li>}
      </ul>
    </main>
  );
}
