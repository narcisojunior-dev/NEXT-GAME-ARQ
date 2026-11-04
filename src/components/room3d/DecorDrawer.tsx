'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Camera, Lock, Move, RotateCcw, RotateCw, Sofa, Trash2, Undo2, X } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useRoomDecorStore } from '@/store/useRoomDecorStore';
import { DECOR_ITEMS, DECOR_PACKS, DecorItem, DecorPack, ZONE_LABELS, findDecorItem, validateNeonText, NEON_TEXT_MAX } from '@/engine/roomDecor';
import { describeUnlock, isUnlocked, unlockProgress } from '@/engine/decorUnlocks';
import { describePlacement, roomUsage } from '@/engine/roomPlacement';
import { ROOM_THEMES, RoomThemeId } from '@/engine/roomThemes';
import { PhotoAngle, ROOM_VIEWS, useDecorModeStore } from './decorModeStore';
import {
  commitHeld,
  getRoomContext,
  nudgeHeld,
  nudgePlaced,
  pickFromDrawer,
  pickPlaced,
  removePlaced,
  rotateHeld,
  rotatePlaced,
  undoRoom,
  useRoomContext,
} from './decorActions';

const DRAG_THRESHOLD = 6;

/** Pressionar e mover = arrastar até o quarto; clicar = pegar (click-to-place) */
function startCardDrag(e: React.PointerEvent<HTMLElement>, decorId: string) {
  if (e.button !== 0) return;
  if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  const origin = { x: e.clientX, y: e.clientY };
  let dragging = false;
  const onMove = (ev: PointerEvent) => {
    if (dragging || Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) <= DRAG_THRESHOLD) return;
    dragging = true;
    document.body.style.cursor = 'grabbing';
    pickFromDrawer(decorId, true);
  };
  const onUp = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    document.body.style.cursor = '';
    const mode = useDecorModeStore.getState();
    // Soltou fora de um lugar válido: o arraste termina e o item continua em mãos para o clique
    if (dragging && mode.isDragging) mode.endDrag();
    // O clique que o navegador dispara colado ao soltar (sobre o próprio card) não pega o item de novo.
    // Pelo horário do evento e não por temporizador: com a cena 3D pesada, teclas chegam antes do setTimeout.
    if (dragging) dragReleased = { decorId, at: ev.timeStamp };
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
/** Card e horário (Event.timeStamp) em que o último arraste da gaveta terminou */
let dragReleased: { decorId: string; at: number } | null = null;
const CLICK_AFTER_DRAG_MS = 100;

const isTyping = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

/** Teclado (#87): setas movem 10 cm, Q/E giram, Enter confirma, Esc cancela, Delete retira, Ctrl+Z desfaz */
function useDecorKeyboard() {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const mode = useDecorModeStore.getState();
      if (!mode.isOpen) return;
      const typing = isTyping(ev.target);
      if (ev.key === 'Escape') {
        if (mode.held) {
          mode.hold(null);
          mode.say('Cancelado: o item voltou para a gaveta.');
        } else mode.select(null);
        return;
      }
      if (typing) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        undoRoom();
        return;
      }
      const arrows: Record<string, 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'> = { ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN' };
      const dir = arrows[ev.key];
      if (dir && (mode.held || mode.selectedId)) {
        ev.preventDefault();
        if (mode.held) nudgeHeld(dir);
        else if (mode.selectedId) nudgePlaced(mode.selectedId, dir);
        return;
      }
      const key = ev.key.toLowerCase();
      if (key === 'q' || key === 'e') {
        const step = key === 'e' ? 1 : -1;
        if (mode.held) rotateHeld(step);
        else if (mode.selectedId) rotatePlaced(mode.selectedId, step);
        return;
      }
      if (ev.key === 'Enter' && mode.held && !(ev.target instanceof HTMLButtonElement)) {
        ev.preventDefault();
        commitHeld();
        return;
      }
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && mode.selectedId && !mode.held) {
        ev.preventDefault();
        removePlaced(mode.selectedId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/* ------------------------------------------------------------------------------------
 * Card da gaveta
 * ------------------------------------------------------------------------------------ */
const ItemCard: React.FC<{ item: DecorItem; unlocked: boolean; placedCount: number; isHeld: boolean }> = ({ item, unlocked, placedCount, isHeld }) => {
  const progress = useProgressStore(useShallow((s) => ({ missionResults: s.missionResults, teacherUnlockAll: s.teacherUnlockAll, deskRunningAt: s.deskRunningAt, postFirstTryCount: s.postFirstTryCount, diagnosticsResolved: s.diagnosticsResolved })));
  const full = placedCount >= item.maxPerRoom;
  if (!unlocked) {
    const { current, target } = unlockProgress(item.unlock, progress);
    return (
      <li>
        <button
          type="button"
          aria-label={`${item.name}, bloqueado. ${describeUnlock(item.unlock)} (${Math.min(current, target)} de ${target}).`}
          onClick={() => useDecorModeStore.getState().say(`${item.name} está bloqueado: ${describeUnlock(item.unlock)}. Progresso ${Math.min(current, target)}/${target}.`)}
          className="w-full min-h-[44px] text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 text-slate-500 cursor-help focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Lock className="w-3.5 h-3.5" aria-hidden /> {item.name}
          </span>
          <span className="block text-[11px] mt-1 leading-snug">{describeUnlock(item.unlock)}</span>
          <span className="mt-1.5 flex items-center gap-2" aria-hidden>
            <span className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <span className="block h-full bg-amber-400" style={{ width: `${(Math.min(current, target) / target) * 100}%` }} />
            </span>
            <span className="text-[10px] font-mono text-amber-300">
              {Math.min(current, target)}/{target}
            </span>
          </span>
        </button>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        aria-label={`${isHeld ? 'Em mãos' : 'Pegar'}: ${item.name}`}
        aria-pressed={isHeld}
        aria-describedby={`decor-desc-${item.id}`}
        onPointerDown={(e) => !full && startCardDrag(e, item.id)}
        onClick={(e) => {
          // Só o clique do mouse sobre o mesmo card, colado ao fim do arraste; o teclado (detail 0) nunca é ignorado
          if (e.detail > 0 && dragReleased?.decorId === item.id && e.timeStamp - dragReleased.at < CLICK_AFTER_DRAG_MS) return;
          // Enter/Espaço no card do item em mãos coloca o item (teclado); o clique do mouse devolve
          if (isHeld && e.detail === 0) {
            commitHeld();
            return;
          }
          if (full) {
            useDecorModeStore.getState().say(`Limite de ${item.maxPerRoom} ${item.name} no quarto.`, 'error');
            return;
          }
          pickFromDrawer(item.id);
        }}
        className={`w-full min-h-[44px] text-left p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
          isHeld ? 'border-fuchsia-400 bg-fuchsia-500/15 ring-1 ring-fuchsia-400/60' : full ? 'border-slate-800 bg-slate-900/40 opacity-60' : 'border-slate-700 bg-slate-900/80 hover:border-cyan-500/60'
        }`}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-100">{item.name}</span>
          <span className="text-[10px] font-mono text-slate-400">
            {placedCount}/{item.maxPerRoom}
          </span>
        </span>
        <span className="block text-[10px] font-mono text-cyan-300/80 mt-0.5">{item.zones.map((z) => ZONE_LABELS[z]).join(' · ')}</span>
        <span id={`decor-desc-${item.id}`} className="block text-[11px] text-slate-400 mt-1 leading-snug">
          {item.description}
        </span>
      </button>
    </li>
  );
};

/* ------------------------------------------------------------------------------------
 * Item em mãos: girar, variante, texto do neon
 * ------------------------------------------------------------------------------------ */
const HeldPanel: React.FC = () => {
  const held = useDecorModeStore((s) => s.held);
  const item = held ? findDecorItem(held.decorId) : null;
  const [neonDraft, setNeonDraft] = useState(held?.text ?? '');
  useEffect(() => setNeonDraft(held?.text ?? ''), [held?.decorId, held?.instanceId, held?.text]);
  if (!held || !item) return null;
  const neonCheck = item.id === 'proc-neon-texto' ? validateNeonText(neonDraft) : null;
  return (
    <section aria-label={`Em mãos: ${item.name}`} className="p-3 rounded-xl border border-fuchsia-500/50 bg-fuchsia-950/30 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300">{held.instanceId ? 'Movendo' : 'Em mãos'}</p>
          <p className="text-sm font-bold text-white">{item.name}</p>
        </div>
        <button type="button" onClick={() => useDecorModeStore.getState().hold(null)} aria-label="Cancelar (Esc)" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <p className="text-[11px] text-slate-300 leading-snug">Arraste até o quarto, clique num ponto destacado ou use as setas. Q e E giram, Enter coloca.</p>
      {item.variants && (
        <label className="block text-[11px] text-slate-300">
          {item.id === 'proc-neon-texto' ? 'Cor do neon' : item.id === 'proc-fita-led' ? 'Efeito da fita' : 'Arte'}
          <select
            value={held.variant}
            onChange={(e) => useDecorModeStore.getState().updateHeld({ variant: e.target.value })}
            className="mt-1 w-full min-h-[36px] rounded-lg bg-slate-900 border border-slate-700 px-2 text-xs text-slate-100"
          >
            {item.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {item.id === 'proc-neon-texto' && (
        <label className="block text-[11px] text-slate-300">
          Texto do neon (até {NEON_TEXT_MAX} caracteres)
          <input
            value={neonDraft}
            maxLength={NEON_TEXT_MAX + 4}
            onChange={(e) => {
              setNeonDraft(e.target.value);
              const v = validateNeonText(e.target.value);
              if (v.ok) useDecorModeStore.getState().updateHeld({ text: v.text });
            }}
            aria-invalid={neonCheck?.ok === false}
            aria-describedby="neon-hint"
            className="mt-1 w-full min-h-[36px] rounded-lg bg-slate-900 border border-slate-700 px-2 text-xs text-slate-100"
          />
          <span id="neon-hint" className={`block mt-1 ${neonCheck?.ok === false ? 'text-rose-300' : 'text-slate-500'}`}>
            {neonCheck && !neonCheck.ok ? neonCheck.message : 'Sem links e sem palavrões: o neon fica na foto da turma.'}
          </span>
        </label>
      )}
      <div className="flex gap-2">
        {item.zones[0] !== 'WALL' && (
          <>
            <button type="button" onClick={() => rotateHeld(-1)} aria-label="Girar para a esquerda (Q)" className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer">
              <RotateCcw className="w-4 h-4" aria-hidden />
            </button>
            <button type="button" onClick={() => rotateHeld(1)} aria-label="Girar para a direita (E)" className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 cursor-pointer">
              <RotateCw className="w-4 h-4" aria-hidden />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => commitHeld()}
          disabled={neonCheck?.ok === false}
          className="flex-1 min-h-[40px] px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
        >
          Colocar aqui (Enter)
        </button>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------------------------
 * Foto do quarto
 * ------------------------------------------------------------------------------------ */
const PhotoPanel: React.FC = () => {
  const capture = useDecorModeStore((s) => s.capturePhoto);
  const teamName = useAssemblyStore((s) => s.teamName);
  const [angle, setAngle] = useState<PhotoAngle>(0);
  const [busy, setBusy] = useState(false);
  const take = async () => {
    if (!capture) return;
    setBusy(true);
    const blob = await capture(angle);
    setBusy(false);
    if (!blob) {
      useDecorModeStore.getState().say('Não foi possível gerar a foto neste navegador.', 'error');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quarto-${(teamName || 'equipe').toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    useDecorModeStore.getState().say(`Foto salva (1920 × 1080, vista ${ROOM_VIEWS[angle].label}).`, 'ok');
  };
  return (
    <section aria-label="Foto do quarto" className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
      <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
        <Camera className="w-3.5 h-3.5" aria-hidden /> Foto do quarto
      </h3>
      <label className="block text-[11px] text-slate-400">
        Ângulo
        <select value={angle} onChange={(e) => setAngle(Number(e.target.value) as PhotoAngle)} className="mt-1 w-full min-h-[36px] rounded-lg bg-slate-900 border border-slate-700 px-2 text-xs text-slate-100">
          {ROOM_VIEWS.map((v, i) => (
            <option key={v.label} value={i}>
              {v.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void take()}
        disabled={!capture || busy}
        className="w-full min-h-[40px] rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
      >
        {busy ? 'Gerando…' : 'Tirar foto (PNG)'}
      </button>
    </section>
  );
};

/* ------------------------------------------------------------------------------------
 * Gaveta
 * ------------------------------------------------------------------------------------ */
export const DecorDrawer: React.FC = () => {
  useDecorKeyboard();
  const ctx = useRoomContext();
  const { items, ready, setTheme } = useRoomDecorStore(useShallow((s) => ({ items: s.items, ready: s.ready, setTheme: s.setTheme })));
  const { held, selectedId, message } = useDecorModeStore(useShallow((s) => ({ held: s.held, selectedId: s.selectedId, message: s.message })));
  const progress = useProgressStore(useShallow((s) => ({ missionResults: s.missionResults, teacherUnlockAll: s.teacherUnlockAll, deskRunningAt: s.deskRunningAt, postFirstTryCount: s.postFirstTryCount, diagnosticsResolved: s.diagnosticsResolved })));
  const theme = useAssemblyStore((s) => s.selectedRoomTheme);
  const setRoomTheme = useAssemblyStore((s) => s.setSelectedRoomTheme);
  const [pack, setPack] = useState<DecorPack>('CLASSICO');
  const [confirmRestart, setConfirmRestart] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const unlocked = useMemo(() => new Map(DECOR_ITEMS.map((i) => [i.id, isUnlocked(i.unlock, progress)])), [progress]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((p) => m.set(p.decorId, (m.get(p.decorId) ?? 0) + 1));
    return m;
  }, [items]);
  const usage = roomUsage(items);

  const chooseTheme = (id: RoomThemeId) => {
    setRoomTheme(id);
    setTheme(id);
  };

  return (
    <aside
      aria-label="Gaveta de decoração"
      className="flex flex-col gap-3 p-3 rounded-2xl border border-slate-800 bg-slate-950/90 max-h-[620px] overflow-y-auto"
      onPointerUp={() => {
        // Arrastar uma peça do quarto de volta para a gaveta a retira
        const mode = useDecorModeStore.getState();
        if (mode.isDragging && mode.held?.instanceId) {
          removePlaced(mode.held.instanceId);
          mode.endDrag();
        }
      }}
    >
      <header className="space-y-1">
        <h2 className="text-sm font-black text-white flex items-center gap-2">
          <Sofa className="w-4 h-4 text-fuchsia-300" aria-hidden /> Decorar o Quarto
        </h2>
        <p className="text-[11px] font-mono text-slate-400">
          {usage.items}/{ctx.limits.maxItems} itens · {Math.round(usage.faces / 1000)} mil/{Math.round(ctx.limits.maxFaces / 1000)} mil faces · {usage.animated}/{ctx.limits.maxAnimated} animados
        </p>
        <p role="status" aria-live="polite" className={`min-h-[32px] text-[11px] leading-snug rounded-lg px-2 py-1.5 ${message?.tone === 'error' ? 'bg-rose-950/60 text-rose-200 border border-rose-700/60' : message?.tone === 'ok' ? 'bg-emerald-950/50 text-emerald-200 border border-emerald-800/60' : 'bg-slate-900 text-slate-300 border border-slate-800'}`}>
          {message?.text ?? 'Escolha um item da gaveta. Itens bloqueados mostram a conquista que os libera.'}
        </p>
      </header>

      <fieldset className="space-y-1">
        <legend className="text-[11px] font-bold text-slate-300 mb-1">Tema do quarto</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {ROOM_THEMES.map((t) => (
            <label key={t.id} className={`flex items-center gap-1.5 min-h-[40px] px-2 rounded-lg border text-[11px] cursor-pointer ${theme === t.id ? 'border-fuchsia-400 bg-fuchsia-500/15 text-white' : 'border-slate-800 text-slate-300 hover:border-slate-600'}`}>
              <input type="radio" name="room-theme" checked={theme === t.id} onChange={() => chooseTheme(t.id)} className="accent-fuchsia-500" />
              <span aria-hidden>{t.avatar}</span> {t.name.split(' ').slice(0, 2).join(' ')}
            </label>
          ))}
        </div>
      </fieldset>

      <HeldPanel />

      <div role="tablist" aria-label="Pacotes de decoração" className="grid grid-cols-4 gap-1">
        {DECOR_PACKS.map((p) => {
          const all = DECOR_ITEMS.filter((i) => i.pack === p.id);
          const open = all.filter((i) => unlocked.get(i.id)).length;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={pack === p.id}
              aria-controls="decor-pack-panel"
              onClick={() => setPack(p.id)}
              className={`min-h-[44px] px-1 rounded-lg text-[11px] font-bold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${pack === p.id ? 'bg-fuchsia-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
            >
              {p.title}
              <span className="block text-[10px] font-mono opacity-80">
                {open}/{all.length}
              </span>
            </button>
          );
        })}
      </div>
      <div id="decor-pack-panel" role="tabpanel" aria-label={`Pacote ${DECOR_PACKS.find((p) => p.id === pack)?.title}`}>
        <p className="text-[11px] text-slate-400 mb-2">{DECOR_PACKS.find((p) => p.id === pack)?.description}</p>
        <ul className="grid grid-cols-1 gap-1.5">
          {DECOR_ITEMS.filter((i) => i.pack === pack).map((item) => (
            <ItemCard key={item.id} item={item} unlocked={Boolean(unlocked.get(item.id))} placedCount={counts.get(item.id) ?? 0} isHeld={held?.decorId === item.id && !held.instanceId} />
          ))}
        </ul>
      </div>

      <section aria-label="Itens no quarto" className="space-y-1.5">
        <h3 className="text-xs font-bold text-slate-200">Itens no quarto ({items.length})</h3>
        {!ready && <p className="text-[11px] text-slate-500">Carregando o quarto…</p>}
        <ul ref={listRef} className="space-y-1">
          {items.map((p) => {
            const it = findDecorItem(p.decorId);
            if (!it) return null;
            const label = `${it.name}, ${describePlacement(p, { items })}`;
            return (
              <li key={p.instanceId} className={`flex items-center gap-1 p-1.5 rounded-lg border ${selectedId === p.instanceId ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
                <button
                  type="button"
                  onClick={() => useDecorModeStore.getState().select(selectedId === p.instanceId ? null : p.instanceId)}
                  aria-pressed={selectedId === p.instanceId}
                  aria-label={`Selecionar ${label}`}
                  className="flex-1 min-h-[36px] text-left text-[11px] text-slate-200 px-1 cursor-pointer"
                >
                  <span className="font-bold">{it.name}</span>
                  <span className="block text-[10px] text-slate-400">{describePlacement(p, { items })}</span>
                </button>
                <button type="button" onClick={() => pickPlaced(p.instanceId)} aria-label={`Mover ${it.name}`} title="Mover (setas e Enter)" className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer">
                  <Move className="w-4 h-4" aria-hidden />
                </button>
                <button type="button" onClick={() => rotatePlaced(p.instanceId)} aria-label={`Girar ${it.name}`} title="Girar 90° (E)" className="p-2 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer">
                  <RotateCw className="w-4 h-4" aria-hidden />
                </button>
                <button type="button" onClick={() => removePlaced(p.instanceId)} aria-label={`Remover ${it.name}`} title="Remover (Delete)" className="p-2 rounded-lg hover:bg-rose-900/60 text-rose-300 cursor-pointer">
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex gap-2">
        <button type="button" onClick={undoRoom} className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold cursor-pointer">
          <Undo2 className="w-4 h-4" aria-hidden /> Desfazer (Ctrl+Z)
        </button>
        {confirmRestart ? (
          <span className="flex-1 flex gap-1">
            <button
              type="button"
              onClick={() => {
                useRoomDecorStore.getState().restart(getRoomContext());
                setConfirmRestart(false);
                useDecorModeStore.getState().say('Quarto recomeçado com o conjunto inicial do tema. Ctrl+Z desfaz.', 'ok');
              }}
              className="flex-1 min-h-[40px] rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
            >
              Confirmar
            </button>
            <button type="button" onClick={() => setConfirmRestart(false)} className="min-h-[40px] px-2 rounded-lg bg-slate-800 text-slate-200 text-[11px] cursor-pointer">
              Não
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmRestart(true)} className="flex-1 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold cursor-pointer">
            Recomeçar quarto
          </button>
        )}
      </div>

      <PhotoPanel />
    </aside>
  );
};

export default DecorDrawer;
