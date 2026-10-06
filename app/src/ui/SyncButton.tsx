import { useEffect } from 'preact/hooks';
import { initSyncState, runSync, syncState } from '../api/sync';
import { toast } from './Toast';
import { Icon } from './Icon';

function fmtTime(ms: number): string {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  return (today ? '' : d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }) + ' ') + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function SyncButton({ label = 'Sincronizza' }: { label?: string }) {
  useEffect(() => { void initSyncState(); }, []);
  const s = syncState.value;
  const go = async () => {
    try {
      const r = await runSync();
      toast(`Sync ok: ${r.pushed} inviati, ${r.pulled} ricevuti`, 'ok', 1500);
    } catch {
      /* lastError già impostato */
    }
  };
  return (
    <div class="card stack">
      <button class="btn btn-block btn-icon" disabled={s.running} onClick={go}>
        <Icon name="sync" size={18} class={s.running ? 'spin' : ''} /> {s.running ? 'Sincronizzazione…' : label}
        {s.pending > 0 && <span class="badge">{s.pending}</span>}
      </button>
      <span class="muted" style="font-size:0.85rem">
        {s.lastAt ? `Ultima sync: ${fmtTime(s.lastAt)}` : 'Mai sincronizzato'}{s.pending > 0 ? ` · ${s.pending} in attesa` : ''}
      </span>
      {s.lastError && <span class="error" style="font-size:0.9rem">{s.lastError}</span>}
    </div>
  );
}
