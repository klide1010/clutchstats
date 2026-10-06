import { useState } from 'preact/hooks';
import type { Player, Side } from '@bkstats/shared';
import { JerseyPad } from './JerseyPad';

export interface ShotResult {
  made: boolean;
  value: 2 | 3;
  playerId?: string;
  assistPlayerId?: string;
  jerseyNumber?: number;
}

interface Props {
  x: number;
  y: number;
  side: Side;
  onCourt: Player[];
  initialValue: 2 | 3;
  selectedPlayerId: string | null;
  jerseyNumbers?: number[];
  selectedJersey?: number | null;
  onConfirm: (r: ShotResult) => void;
  onCancel: () => void;
}

export function ShotPopup(p: Props) {
  const [value, setValue] = useState<2 | 3>(p.initialValue);
  const [playerId, setPlayerId] = useState<string | null>(p.selectedPlayerId);
  const [jersey, setJersey] = useState<number | null>(p.selectedJersey ?? null);
  const [stage, setStage] = useState<'shot' | 'assist'>('shot');

  const needsPlayer = p.side === 'US' && !playerId;
  const finish = (made: boolean, assistPlayerId?: string) =>
    p.onConfirm({ made, value, playerId: p.side === 'US' ? playerId ?? undefined : undefined, assistPlayerId, jerseyNumber: p.side === 'THEM' ? jersey ?? undefined : undefined });

  const onMade = () => (p.side === 'US' ? setStage('assist') : finish(true));

  return (
    <div class="popup-backdrop" onClick={p.onCancel}>
      <div class="popup" onClick={(e) => e.stopPropagation()}>
        {stage === 'shot' && (
          <>
            <div class="row">
              <span class="muted">{p.side === 'US' ? 'Tiro nostro' : 'Tiro avversario'}</span>
              <div class="seg" style="flex:0 0 auto">
                <button class={`seg-btn${value === 2 ? ' active' : ''}`} onClick={() => setValue(2)}>2</button>
                <button class={`seg-btn${value === 3 ? ' active' : ''}`} onClick={() => setValue(3)}>3</button>
              </div>
            </div>
            {p.side === 'US' && (
              <div class="chips">
                {p.onCourt.map((pl) => (
                  <button key={pl.id} class={`chip${playerId === pl.id ? ' active' : ''}`} onClick={() => setPlayerId(pl.id)}>#{pl.number} {pl.lastName}</button>
                ))}
              </div>
            )}
            {p.side === 'THEM' && <JerseyPad numbers={p.jerseyNumbers ?? []} selected={jersey} onSelect={setJersey} />}
            {needsPlayer && <p class="muted" style="margin:0">Scegli chi ha tirato</p>}
            <div class="row">
              <button class="btn btn-big btn-miss" disabled={needsPlayer} onClick={() => finish(false)}>Errore</button>
              <button class="btn btn-big btn-made" disabled={needsPlayer} onClick={onMade}>Canestro</button>
            </div>
          </>
        )}
        {stage === 'assist' && (
          <>
            <span class="muted">Assist di…</span>
            <div class="chips">
              {p.onCourt.filter((pl) => pl.id !== playerId).map((pl) => (
                <button key={pl.id} class="chip" onClick={() => finish(true, pl.id)}>#{pl.number} {pl.lastName}</button>
              ))}
            </div>
            <button class="btn btn-block" onClick={() => finish(true, undefined)}>Nessuno</button>
          </>
        )}
      </div>
    </div>
  );
}
