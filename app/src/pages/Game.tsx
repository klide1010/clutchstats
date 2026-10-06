import { useEffect, useState } from 'preact/hooks';
import { shotValueFromPosition, type FoulKind } from '@bkstats/shared';
import { openLiveGame, type LiveGame } from '../state/liveGame';
import { side, selectedPlayerId, selectedJersey, pendingAction, pendingShot, pendingFoulKind, resetSelection, onPlayerTap, onActionTap } from '../state/liveUi';
import { TopBar } from '../ui/TopBar';
import { Court } from '../ui/Court';
import { ShotPopup } from '../ui/ShotPopup';
import { FreeThrowPopup } from '../ui/FreeThrowPopup';
import { PlayerBar } from '../ui/PlayerBar';
import { JerseyPad } from '../ui/JerseyPad';
import { ActionGrid } from '../ui/ActionGrid';
import { PlayerPicker } from '../ui/PlayerPicker';
import { toast } from '../ui/Toast';
import { navigate } from '../router';
import { SubsPanel } from '../ui/SubsPanel';
import { GameMenu } from '../ui/GameMenu';

const FOUL_KINDS: { kind: FoulKind; label: string }[] = [
  { kind: 'PERSONAL', label: 'Personale' },
  { kind: 'OFFENSIVE', label: 'In attacco' },
  { kind: 'UNSPORTSMANLIKE', label: 'Antisportivo' },
  { kind: 'TECHNICAL', label: 'Tecnico' },
];

function Lineup({ lg }: { lg: LiveGame }) {
  const [sel, setSel] = useState<string[]>(lg.game.value.starters);
  const start = async () => {
    try {
      await lg.setStarters(sel);
      await lg.startPeriod();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Errore', 'error');
    }
  };
  return (
    <main class="page stack">
      <div class="row">
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => navigate('#/calendar')}>‹</button>
        <h1 style="margin:0">Quintetto iniziale</h1>
      </div>
      <p class="muted">Scegli 5 giocatori ({sel.length}/5)</p>
      <PlayerPicker players={lg.players.value.filter((p) => p.active)} selected={sel} max={5} onChange={setSel} />
      <button class="btn btn-primary btn-block" disabled={sel.length !== 5} onClick={start}>Inizia partita</button>
    </main>
  );
}

export function Game({ id }: { id: string }) {
  const [lg, setLg] = useState<LiveGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ft, setFt] = useState(false);
  const [foulChooser, setFoulChooser] = useState(false);
  const [panel, setPanel] = useState<'none' | 'subs' | 'menu'>('none');

  useEffect(() => {
    let disposed = false;
    let instance: LiveGame | null = null;
    resetSelection();
    side.value = 'US';
    openLiveGame(id).then((l) => { if (disposed) l.dispose(); else { instance = l; setLg(l); } }).catch((e) => setError(e instanceof Error ? e.message : 'Errore'));
    return () => { disposed = true; instance?.dispose(); };
  }, [id]);

  if (error) return <main class="page"><p class="error">{error}</p></main>;
  if (!lg) return <main class="page"><p class="muted">Caricamento…</p></main>;
  if (lg.game.value.currentPeriod === 0) return <Lineup lg={lg} />;

  const onCourtPlayers = lg.players.value.filter((p) => lg.onCourt.value.includes(p.id)).sort((a, b) => a.number - b.number);
  const playerFouls: Record<string, number> = {};
  for (const l of lg.boxScore.value.players) playerFouls[l.playerId] = l.pf;
  const jerseyNumbers = lg.opponent.value.roster.map((r) => r.number);
  const liveShots = lg.events.value.filter((e) => !e.deleted && (e.type === 'SHOT_2' || e.type === 'SHOT_3') && e.period === lg.game.value.currentPeriod);

  const onCourtTap = (x: number, y: number) => {
    if (!lg.periodOpen.value) { toast('Periodo non aperto', 'error'); return; }
    pendingShot.value = { x, y };
  };

  const confirmShot = async (r: { made: boolean; value: 2 | 3; playerId?: string; assistPlayerId?: string; jerseyNumber?: number }) => {
    const shot = pendingShot.value;
    if (!shot) return;
    try {
      await lg.addEvent({ type: r.value === 3 ? 'SHOT_3' : 'SHOT_2', side: side.value, playerId: r.playerId, assistPlayerId: r.assistPlayerId, jerseyNumber: r.jerseyNumber, made: r.made, x: shot.x, y: shot.y });
      toast(lg.lastEventLabel.peek(), 'ok');
      resetSelection();
    } catch (e) {
      toast(e instanceof Error && e.message === 'Periodo non aperto' ? e.message : 'Salvataggio fallito, riprova', 'error');
    }
  };

  const freeThrow = async (made: boolean, playerId?: string, jerseyNumber?: number) => {
    try {
      await lg.addEvent({ type: 'FREE_THROW', side: side.value, playerId, jerseyNumber, made });
      toast(lg.lastEventLabel.peek(), 'ok');
    } catch {
      toast('Salvataggio fallito, riprova', 'error');
    }
  };

  const chooseFoul = async (kind: FoulKind) => {
    setFoulChooser(false);
    pendingFoulKind.value = kind;
    await onActionTap('FOUL', lg);
  };

  return (
    <div class="game">
      <TopBar lg={lg} onSubs={() => setPanel('subs')} onMenu={() => setPanel('menu')} />
      <div class="side-toggle seg">
        <button class={`seg-btn${side.value === 'US' ? ' active' : ''}`} onClick={() => { side.value = 'US'; resetSelection(); }}>Noi</button>
        <button class={`seg-btn${side.value === 'THEM' ? ' active' : ''}`} onClick={() => { side.value = 'THEM'; resetSelection(); }}>Loro</button>
      </div>
      <div class="court-wrap">
        <Court onTap={onCourtTap} shots={liveShots} />
        {pendingAction.value && <div class="hint">Scegli il giocatore</div>}
      </div>
      {side.value === 'US' ? (
        <PlayerBar players={onCourtPlayers} selectedId={selectedPlayerId.value} fouls={playerFouls} onTap={(pid) => void onPlayerTap(pid, lg)} />
      ) : (
        <div class="player-bar them-bar">
          <JerseyPad numbers={jerseyNumbers} selected={selectedJersey.value} onSelect={(n) => (selectedJersey.value = n)} />
        </div>
      )}
      <ActionGrid side={side.value} pending={pendingAction.value} onAction={(t) => void onActionTap(t, lg)} onFreeThrow={() => setFt(true)} onFoulLongPress={() => setFoulChooser(true)} />

      {pendingShot.value && (
        <ShotPopup
          x={pendingShot.value.x} y={pendingShot.value.y} side={side.value} onCourt={onCourtPlayers}
          initialValue={shotValueFromPosition(pendingShot.value.x, pendingShot.value.y)}
          selectedPlayerId={selectedPlayerId.value} jerseyNumbers={jerseyNumbers} selectedJersey={selectedJersey.value}
          onConfirm={confirmShot} onCancel={() => (pendingShot.value = null)}
        />
      )}
      {ft && (
        <FreeThrowPopup side={side.value} onCourt={onCourtPlayers} selectedPlayerId={selectedPlayerId.value} jerseyNumbers={jerseyNumbers} selectedJersey={selectedJersey.value}
          onShot={freeThrow} onClose={() => { setFt(false); resetSelection(); }} />
      )}
      {foulChooser && (
        <div class="popup-backdrop" onClick={() => setFoulChooser(false)}>
          <div class="popup" onClick={(e) => e.stopPropagation()}>
            <span class="muted">Tipo di fallo</span>
            {FOUL_KINDS.map((f) => <button key={f.kind} class="btn btn-block" onClick={() => chooseFoul(f.kind)}>{f.label}</button>)}
          </div>
        </div>
      )}
      {panel === 'subs' && <SubsPanel lg={lg} onClose={() => setPanel('none')} />}
      {panel === 'menu' && <GameMenu lg={lg} onClose={() => setPanel('none')} />}
    </div>
  );
}

