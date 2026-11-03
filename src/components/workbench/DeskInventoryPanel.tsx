'use client';

import React, { useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Armchair, CheckCircle2, Cpu, Grip, Headphones, Keyboard, Lock, Monitor, Mouse, Move, PanelTop, Square } from 'lucide-react';
import { useAssemblyStore, selectCurrentPhase, selectDeskStage } from '@/store/useAssemblyStore';
import {
  DESK_SNAP_POINTS,
  DeskInventoryEntry,
  DeskSnapPointId,
  PlacedDeskItem,
  buildDeskInventory,
  evaluateDeskSnapPoints,
  isPcReadyForDesk,
} from '@/engine/deskSetup';
import { PHASE_LABELS } from '@/engine/phases';
import { placeHeldItem, useDeskPlacementStore } from '@/components/three/deskPlacementStore';
import { DeskCablingPanel } from './DeskCablingPanel';

const ICONS: Record<DeskSnapPointId, React.ComponentType<{ className?: string }>> = {
  DESK_BASE: PanelTop,
  CHAIR: Armchair,
  PC_TOWER: Cpu,
  MONITOR_ARM: Grip,
  MONITOR_MAIN: Monitor,
  MOUSEPAD: Square,
  KEYBOARD: Keyboard,
  MOUSE: Mouse,
  HEADSET: Headphones,
};

const STAGE_HINT: Record<string, string> = {
  LOCKED: 'Comece pela mesa: os periféricos ficam apoiados nela. O PC só vem para a mesa depois de montado na bancada (Fase 7).',
  FURNISHING: 'Posicione mesa, gabinete, monitor, teclado e mouse. Arraste cada item até o holograma ou use “Posicionar”.',
  CABLING: 'Todos os itens obrigatórios estão na mesa. Próxima etapa: conectar os cabos externos (força, vídeo e USB).',
  READY_TO_BOOT: 'Estação cabeada e pronta para ligar.',
  RUNNING: 'AcademyOS em execução.',
};

/** Distância (px) que transforma um pressionar em arraste em vez de clique */
const DRAG_THRESHOLD = 6;

/**
 * Pressionar e mover = arrastar até a cena 3D; pressionar e soltar = pegar o item (click-to-place).
 * Os dois modos convivem (AGENTS.md: alunos com touchpads gastos usam o clique).
 */
function useDragOrClick(item: PlacedDeskItem) {
  const start = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    // Sem captura implícita: os eventos seguintes chegam ao canvas sob o cursor (touch e caneta inclusive)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    let dragging = false;

    const onMove = (ev: PointerEvent) => {
      const origin = start.current;
      if (!origin || dragging) return;
      if (Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) > DRAG_THRESHOLD) {
        dragging = true;
        document.body.style.cursor = 'grabbing';
        useDeskPlacementStore.getState().startDrag(item);
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      start.current = null;
      const placement = useDeskPlacementStore.getState();
      // Soltou fora de um encaixe: o arraste termina, mas o item continua em mãos para o clique
      if (dragging && placement.isDragging) placement.endDrag();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onClick = () => {
    const placement = useDeskPlacementStore.getState();
    if (placement.isDragging) return;
    placement.holdItem(placement.heldItem?.itemId === item.itemId ? null : item);
  };

  return { onPointerDown, onClick };
}

const InventoryCard: React.FC<{
  entry: DeskInventoryEntry;
  placedItem: PlacedDeskItem | undefined;
  isHeld: boolean;
  blockedMessage?: string;
  onRemove: (snap: DeskSnapPointId) => void;
}> = ({ entry, placedItem, isHeld, blockedMessage, onRemove }) => {
  const { onPointerDown, onClick } = useDragOrClick(entry.item);
  const Icon = ICONS[entry.targetSnapPoint];
  const spec = DESK_SNAP_POINTS[entry.targetSnapPoint];
  const isPlacedHere = placedItem?.itemId === entry.item.itemId;

  return (
    <li
      className={`rounded-xl border p-2.5 transition-colors ${
        isHeld
          ? 'border-cyan-400 bg-cyan-950/40'
          : isPlacedHere
          ? 'border-emerald-700/60 bg-emerald-950/20'
          : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-9 h-9 shrink-0 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400">
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {spec.label}
            {spec.isRequiredForBoot && <span className="text-cyan-500">• obrigatório</span>}
          </div>
          <div className="text-xs font-semibold text-slate-100 truncate" title={entry.item.name}>
            {entry.item.name}
          </div>
          {!isPlacedHere && blockedMessage && (
            <p className="mt-1 text-[11px] leading-snug text-amber-300/90 flex gap-1">
              <Lock className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{blockedMessage}</span>
            </p>
          )}
        </div>
        {isPlacedHere ? (
          <div className="flex flex-col items-end gap-1">
            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Na mesa
            </span>
            <button
              type="button"
              onClick={() => onRemove(entry.targetSnapPoint)}
              className="min-h-[32px] px-2 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label={`Retirar ${entry.item.name} da mesa`}
            >
              Retirar
            </button>
          </div>
        ) : placedItem ? (
          <span className="text-[11px] font-mono text-slate-500">Espaço ocupado</span>
        ) : (
          <button
            type="button"
            onPointerDown={onPointerDown}
            onClick={onClick}
            aria-pressed={isHeld}
            aria-label={isHeld ? `Cancelar: soltar ${entry.item.name}` : `Pegar ${entry.item.name} para posicionar`}
            className={`min-h-[44px] min-w-[44px] px-3 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-grab active:cursor-grabbing touch-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              isHeld ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            {isHeld ? 'Em mãos' : 'Posicionar'}
          </button>
        )}
      </div>

      {/* Alternativa acessível ao holograma: encaixar pelo teclado/leitor de tela */}
      {isHeld && (
        <button
          type="button"
          onClick={() => placeHeldItem(entry.targetSnapPoint)}
          className="mt-2 w-full min-h-[40px] rounded-lg border border-cyan-500/60 bg-cyan-500/10 hover:bg-cyan-500/20 text-[11px] font-mono font-bold text-cyan-200 cursor-pointer"
        >
          Encaixar em: {spec.label}
        </button>
      )}
    </li>
  );
};

export const DeskInventoryPanel: React.FC = () => {
  const { studentSetup, placedDeskItems, assembly, selectedMotherboard, removeDeskItem } = useAssemblyStore(
    useShallow((s) => ({
      studentSetup: s.studentSetup,
      placedDeskItems: s.deskSetup.placedDeskItems,
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
      removeDeskItem: s.removeDeskItem,
    }))
  );
  const stage = useAssemblyStore(selectDeskStage);
  const phase = useAssemblyStore(selectCurrentPhase);
  const heldItem = useDeskPlacementStore((s) => s.heldItem);

  const inventory = useMemo(() => buildDeskInventory(studentSetup), [studentSetup]);
  const isPcAssembled = isPcReadyForDesk(assembly, selectedMotherboard);
  const context = useMemo(() => ({ isPcAssembled, studentSetup }), [isPcAssembled, studentSetup]);

  const requiredTotal = inventory.filter((e) => DESK_SNAP_POINTS[e.targetSnapPoint].isRequiredForBoot).length;
  const requiredPlaced = inventory.filter(
    (e) => DESK_SNAP_POINTS[e.targetSnapPoint].isRequiredForBoot && placedDeskItems[e.targetSnapPoint]
  ).length;
  const phaseLabel = PHASE_LABELS.find((p) => p.id === phase)?.label ?? phase;

  return (
    <aside aria-label="Inventário da mesa" className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col gap-3">
      <header>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100">Inventário da Mesa</h2>
          <span className="text-[11px] font-mono text-cyan-300" aria-label={`${requiredPlaced} de ${requiredTotal} itens obrigatórios posicionados`}>
            {requiredPlaced}/{requiredTotal} obrigatórios
          </span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden" aria-hidden>
          <div
            className="h-full bg-cyan-400 transition-[width] duration-300"
            style={{ width: `${requiredTotal ? (requiredPlaced / requiredTotal) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] leading-snug text-slate-400">{STAGE_HINT[stage]}</p>
        {!isPcAssembled && (
          <p className="mt-1.5 text-[11px] leading-snug text-amber-300/90">
            Montagem atual: <b>Fase {phaseLabel}</b>
          </p>
        )}
      </header>

      <ul className="flex flex-col gap-2">
        {inventory.map((entry) => {
          const placedItem = placedDeskItems[entry.targetSnapPoint];
          const state = evaluateDeskSnapPoints(entry.item, placedDeskItems, context)[entry.targetSnapPoint];
          return (
            <InventoryCard
              key={entry.item.itemId + entry.targetSnapPoint}
              entry={entry}
              placedItem={placedItem}
              isHeld={heldItem?.itemId === entry.item.itemId && heldItem.snapPointId === entry.targetSnapPoint}
              // Sem mesa, todo periférico está bloqueado pelo mesmo motivo: a dica do topo já explica
              blockedMessage={state.status === 'BLOCKED' && placedDeskItems.DESK_BASE ? state.message : undefined}
              onRemove={removeDeskItem}
            />
          );
        })}
      </ul>

      {/* Cabeamento externo e energia: liberados quando o PC está na mesa (Issue 04) */}
      {placedDeskItems.PC_TOWER && <DeskCablingPanel />}
    </aside>
  );
};

export default DeskInventoryPanel;
