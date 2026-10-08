import { useState } from 'preact/hooks';
import type { Player, Side } from '@bkstats/shared';
import { JerseyPad } from './JerseyPad';
import { Icon } from './Icon';

interface Props {
  side: Side;
  onCourt: Player[];
  selectedPlayerId: string | null;
  jerseyNumbers?: number[];
  selectedJersey?: number | null;
  /** Ritorna true se il tiro è stato salvato. */
  onShot: (made: boolean, playerId?: string, jerseyNumber?: number) => Promise<boolean> | boolean;
  onClose: () => void;
}

export function FreeThrowPopup(p: Props) {
  const [playerId, setPlayerId] = useState<string | null>(p.selectedPlayerId);
  const [jersey, setJersey] = useState<number | null>(p.selectedJersey ?? null);
  const [total, setTotal] = useState<number | null>(null);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);

  const needsPlayer = p.side === 'US' && !playerId;

  const [busy, setBusy] = useState(false);
  const shot = async (made: boolean) => {
    if (busy) return;
    setBusy(true);
    let ok = false;
    try {
      ok = await p.onShot(made, p.side === 'US' ? playerId ?? undefined : undefined, p.side === 'THEM' ? jersey ?? undefined : undefined);
    } finally {
      setBusy(false);
    }
    if (!ok) return;
    const n = done + 1;
    setDone(n);
    setResults([...results, made]);
    if (total !== null && n >= total) p.onClose();
  };

  return (
    <div class="popup-backdrop" onClick={p.onClose}>
      <div class="popup" onClick={(e) => e.stopPropagation()}>
        <strong class="card-title"><Icon name="target" size={18} /> Tiri liberi {p.side === 'US' ? 'nostri' : 'avversari'}</strong>
        {p.side === 'US' && (
          <div class="chips">
            {p.onCourt.map((pl) => (
              <button key={pl.id} class={`chip${playerId === pl.id ? ' active' : ''}`} onClick={() => setPlayerId(pl.id)}>#{pl.number} {pl.lastName}</button>
            ))}
          </div>
        )}
        {p.side === 'THEM' && <JerseyPad numbers={p.jerseyNumbers ?? []} selected={jersey} onSelect={setJersey} />}
        {total === null ? (
          <div class="row">
            {[1, 2, 3].map((n) => <button key={n} class="btn btn-big" disabled={needsPlayer} onClick={() => setTotal(n)}>{n}</button>)}
          </div>
        ) : (
          <>
            <div class="row" style="justify-content:center">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} class={`ft-dot${i < done ? (results[i] ? ' made' : ' missed') : ''}`} />
              ))}
            </div>
            <div class="row">
              <button class="btn btn-big btn-miss" onClick={() => shot(false)}>Sbagliato</button>
              <button class="btn btn-big btn-made" onClick={() => shot(true)}>Segnato</button>
            </div>
          </>
        )}
        <button class="btn btn-sm" onClick={p.onClose}>Chiudi</button>
      </div>
    </div>
  );
}
