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
import { Icon } from '../ui/Icon';
import { PageTitle } from '../ui/PageTitle';

const FOUL_KINDS: { kind: FoulKind; label: string }[] = [
  { kind: 'PERSONAL', label: 'Personale' },
  { kind: 'OFFENSIVE', label: 'In attacco' },
  { kind: 'UNSPORTSMANLIKE', label: 'Antisportivo' },
  { kind: 'TECHNICAL', label: 'Tecnico' },
];

function Lineup({ lg }: { lg: LiveGame }) {
  const active = lg.allPlayers.value.filter((p) => p.active);
  const inactive = lg.allPlayers.value.filter((p) => !p.active);
  const initialRoster = lg.game.value.roster?.length ? lg.game.value.roster : active.map((p) => p.id);
  const [step, setStep] = useState<'roster' | 'starters'>(lg.game.value.roster?.length ? 'starters' : 'roster');
  const [roster, setRoster] = useState<string[]>(initialRoster);
  const [sel, setSel] = useState<string[]>(lg.game.value.starters);
  const [showInactive, setShowInactive] = useState(initialRoster.some((id) => inactive.some((p) => p.id === id)));
  const oppName = lg.opponent.value.name;

  const confirmRoster = async () => {
    try {
      await lg.setRoster(roster);
      setSel((s) => s.filter((id) => roster.includes(id)));
      setStep('starters');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Errore', 'error');
    }
  };
  const start = async () => {
    try {
      await lg.setStarters(sel);
      await lg.startPeriod();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Errore', 'error');
    }
  };

  if (step === 'roster') {
    const visible = showInactive ? lg.allPlayers.value : active;
    return (
      <main class="page stack">
        <PageTitle icon="users" onBack={() => navigate('#/calendar')} subtitle={`${lg.game.value.home ? 'vs' : '@'} ${oppName}`}>Convocati</PageTitle>
        <div class="row pick-summary">
          <span><b class="display">{roster.length}</b> <span class="muted">convocati · minimo 5</span></span>
          <div class="row" style="flex:0 0 auto">
            <button class="btn btn-sm" onClick={() => setRoster(active.map((p) => p.id))}>Tutti</button>
            <button class="btn btn-sm" onClick={() => setRoster([])}>Nessuno</button>
          </div>
        </div>
        <PlayerPicker players={visible} selected={roster} max={lg.allPlayers.value.length} onChange={setRoster} />
        {inactive.length > 0 && (
          <button class="btn btn-sm btn-block" onClick={() => setShowInactive(!showInactive)}>{showInactive ? 'Nascondi inattivi' : `Mostra inattivi (${inactive.length})`}</button>
        )}
        <p class="muted" style="margin:0;font-size:0.85rem">Le statistiche live e il box score mostreranno solo i convocati.</p>
        <button class="btn btn-primary btn-block btn-icon" disabled={roster.length < 5} onClick={confirmRoster}>Avanti: quintetto <Icon name="back" size={18} class="flip" /></button>
      </main>
    );
  }

  const called = lg.players.value;
  return (
    <main class="page stack">
      <PageTitle icon="play" onBack={() => setStep('roster')} subtitle={`${called.length} convocati`}>Quintetto iniziale</PageTitle>
      <div class="row pick-summary">
        <span><b class="display">{sel.length}</b><span class="muted">/5 in campo</span></span>
        <button class="btn btn-sm" style="flex:0 0 auto" onClick={() => setSel([])}>Azzera</button>
      </div>
      <PlayerPicker players={called} selected={sel} max={5} onChange={setSel} />
      <button class="btn btn-primary btn-block btn-icon" disabled={sel.length !== 5} onClick={start}><Icon name="play" size={18} /> Inizia partita</button>
    </main>
  );
}

export function Game({ id }: { id: string }) {
  const [lg, setLg] = useState<LiveGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ft, setFt] = useState(false);
  const [foulChooser, setFoulChooser] = useState(false);
  const [panel, setPanel] = useState<'none' | 'subs' | 'menu'>('none');
  const [subsOut, setSubsOut] = useState<string | null>(null);
  const [foulOutDismissed, setFoulOutDismissed] = useState<string | null>(null);

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
  if (lg.foreignLive.value) {
    const run = async (fn: () => Promise<void>) => { try { await fn(); } catch (e) { toast(e instanceof Error ? e.message : 'Errore', 'error'); } };
    return (
      <main class="page stack">
        <PageTitle icon="swap" onBack={() => navigate('#/calendar')}>Partita su un altro telefono</PageTitle>
        <p class="muted">Questa gara è stata registrata da un altro dispositivo e sincronizzata. Cosa vuoi fare?</p>
        <div class="card stack">
          <strong class="card-title"><Icon name="swap" size={18} /> Continua da qui</strong>
          <span class="muted">Prendi in carico la partita con tutti gli eventi già registrati. L'altro telefono dovrà sincronizzare prima di continuare.</span>
          <button class="btn btn-primary btn-block" onClick={() => run(() => lg.takeOver())}>Prendi in carico</button>
        </div>
        <div class="card stack">
          <strong class="card-title"><Icon name="undo" size={18} /> Riparti da zero</strong>
          <span class="muted">Ignora quanto registrato dall'altro telefono: gli eventi vengono cancellati e la partita torna "programmata". Alla prossima sync la cancellazione arriva anche agli altri dispositivi.</span>
          <button class="btn btn-danger btn-block" onClick={() => { if (confirm('Cancellare gli eventi registrati dall\'altro telefono?')) void run(() => lg.restartFromScratch()); }}>Riparti da zero</button>
        </div>
        <button class="btn btn-block" onClick={() => navigate('#/calendar')}>Torna al calendario</button>
      </main>
    );
  }
  if (lg.game.value.currentPeriod === 0) return <Lineup lg={lg} />;

  const onCourtPlayers = lg.players.value.filter((p) => lg.onCourt.value.includes(p.id)).sort((a, b) => a.number - b.number);
  const playerFouls: Record<string, number> = {};
  for (const l of lg.boxScore.value.players) playerFouls[l.playerId] = l.pf;
  const jerseyNumbers = lg.opponent.value.roster.map((r) => r.number);
  const liveShots = lg.events.value.filter((e) => !e.deleted && (e.type === 'SHOT_2' || e.type === 'SHOT_3' || e.type === 'FREE_THROW') && e.side === side.value && e.period === lg.game.value.currentPeriod);

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

  const freeThrow = async (made: boolean, playerId?: string, jerseyNumber?: number): Promise<boolean> => {
    try {
      await lg.addEvent({ type: 'FREE_THROW', side: side.value, playerId, jerseyNumber, made });
      toast(lg.lastEventLabel.peek(), 'ok');
      return true;
    } catch (e) {
      toast(e instanceof Error && (e.message === 'Periodo non aperto' || e.message === 'Partita chiusa') ? e.message : 'Salvataggio fallito, riprova', 'error');
      return false;
    }
  };

  const chooseFoul = async (kind: FoulKind) => {
    setFoulChooser(false);
    pendingFoulKind.value = kind;
    await onActionTap('FOUL', lg);
  };

  const fouledOutId = lg.fouledOut.value[0] ?? null;
  const fouledOutPlayer = fouledOutId ? lg.allPlayers.value.find((p) => p.id === fouledOutId) : undefined;
  const showFoulOut = !!fouledOutId && panel === 'none' && !pendingShot.value && foulOutDismissed !== fouledOutId;
  const undoFifthFoul = async () => {
    const e = fouledOutId ? lg.lastFoulOf(fouledOutId) : null;
    if (!e) return;
    try {
      await lg.deleteEvent(e.id);
      toast('Fallo annullato', 'ok');
    } catch {
      toast('Operazione fallita, riprova', 'error');
    }
  };

  return (
    <div class="game">
      <TopBar lg={lg} onSubs={() => { setSubsOut(null); setPanel('subs'); }} onMenu={() => setPanel('menu')} />
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
          <JerseyPad numbers={jerseyNumbers} selected={selectedJersey.value} onSelect={(n) => { selectedJersey.value = n; if (n !== null && !jerseyNumbers.includes(n)) void lg.addOpponentNumber(n); }} />
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
      {panel === 'subs' && <SubsPanel lg={lg} initialOut={subsOut} onClose={() => { setPanel('none'); setSubsOut(null); }} />}
      {showFoulOut && fouledOutPlayer && (
        <div class="popup-backdrop">
          <div class="popup">
            <strong class="card-title"><Icon name="alert" size={18} class="err-text" /> Quinto fallo</strong>
            <span><b>#{fouledOutPlayer.number} {fouledOutPlayer.lastName}</b> ha raggiunto 5 falli e deve uscire. Finché resta in campo non può registrare azioni.</span>
            <button class="btn btn-primary btn-block btn-icon" onClick={() => { setSubsOut(fouledOutPlayer.id); setPanel('subs'); }}><Icon name="swap" size={18} /> Sostituisci</button>
            <button class="btn btn-block btn-icon" onClick={undoFifthFoul}><Icon name="undo" size={18} /> Annulla il fallo</button>
            <button class="btn btn-sm" onClick={() => setFoulOutDismissed(fouledOutPlayer.id)}>Più tardi</button>
          </div>
        </div>
      )}
      {panel === 'menu' && <GameMenu lg={lg} onClose={() => setPanel('none')} />}
    </div>
  );
}

