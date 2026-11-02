'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import {
  CABLES,
  CableId,
  CableSource,
  CableSpec,
  CableTargetId,
  cableById,
  cableTargetById,
  findNearestTarget,
  getRequiredCables,
  isCableAvailable,
} from '@/engine/cabling';
import { useCableDragStore } from './cableDragStore';
import { Cable, CheckCircle2, AlertTriangle, Info, Zap, Server, Package, Maximize2 } from 'lucide-react';

const MAGNET_RADIUS = 28;
const DRAG_THRESHOLD = 5;
const EDGE_SCROLL_ZONE = 70;

const GROUPS: { source: CableSource; title: string; icon: React.ReactNode; emptyHint: string }[] = [
  { source: 'PSU', title: 'Cabos da fonte', icon: <Zap className="w-3.5 h-3.5" />, emptyHint: 'Instale a fonte para liberar os cabos dela.' },
  { source: 'CASE', title: 'Cabos do gabinete', icon: <Server className="w-3.5 h-3.5" />, emptyHint: 'Prepare o gabinete para liberar USB, áudio e ventoinhas.' },
  { source: 'PARTS', title: 'Cabos das peças', icon: <Package className="w-3.5 h-3.5" />, emptyHint: 'Cooler e discos SATA trazem os próprios cabos.' },
];

/** Ponta do cabo: conector colorido com os pinos e o fio saindo para cima */
const CablePlug: React.FC<{ cable: CableSpec; size?: 'sm' | 'md' }> = ({ cable, size = 'sm' }) => {
  const dark = cable.color === '#111827' || cable.color === '#1F2937';
  return (
    <span className={`relative inline-flex shrink-0 flex-col items-center ${size === 'md' ? 'scale-125' : ''}`} aria-hidden="true">
      <span className="h-3 w-1.5 rounded-t-full" style={{ backgroundColor: dark ? '#475569' : cable.color }} />
      <span
        className="grid h-5 w-9 grid-cols-4 place-items-center gap-px rounded-[3px] border border-black/60 px-1 shadow-[0_3px_6px_rgba(0,0,0,0.5)]"
        style={{ backgroundColor: cable.color }}
      >
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1 w-1 rounded-[1px] bg-black/70" />
        ))}
      </span>
    </span>
  );
};

/**
 * Bandeja com todos os cabos da montagem. O aluno arrasta cada cabo até o conector certo
 * (ou clica no cabo e depois no conector). Os conectores ficam na placa, na GPU e no disco.
 */
export const CableTray: React.FC = () => {
  const { assembly, cableConnections, disconnectCable, openFrontPanelModal, fPanelConnections } = useAssemblyStore(
    useShallow((s) => ({
      assembly: s.assembly,
      cableConnections: s.cableConnections,
      disconnectCable: s.disconnectCable,
      openFrontPanelModal: s.openFrontPanelModal,
      fPanelConnections: s.fPanelConnections,
    }))
  );
  const { heldCableId, feedback, shakeCableId, setHeld, setDragging, setHoverTarget, setFeedback, tryConnect } = useCableDragStore(
    useShallow((s) => ({
      heldCableId: s.heldCableId,
      feedback: s.feedback,
      shakeCableId: s.shakeCableId,
      setHeld: s.setHeld,
      setDragging: s.setDragging,
      setHoverTarget: s.setHoverTarget,
      setFeedback: s.setFeedback,
      tryConnect: s.tryConnect,
    }))
  );
  const hoverTargetId = useCableDragStore((s) => s.hoverTargetId);

  const [session, setSession] = useState<{ id: CableId; startX: number; startY: number } | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);

  // Arraste com Pointer Events (mouse, touchpad e toque) e pointer capture: o cartão recebe todos os
  // movimentos de forma síncrona, mesmo fora dele. Os alvos são achados pelo atributo data-cable-target.
  const dragRef = useRef<{ id: CableId; startX: number; startY: number; active: boolean; target: CableTargetId | null } | null>(null);

  const onCablePointerDown = (id: CableId) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, active: false, target: null };
    setSession({ id, startX: e.clientX, startY: e.clientY });
  };

  const onCablePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD) return;
      drag.active = true;
      setHeld(drag.id);
      setDragging(true);
    }
    // Rolagem automática perto das bordas: a placa é maior que a tela em PCs escolares
    if (e.clientY < EDGE_SCROLL_ZONE) window.scrollBy(0, -14);
    else if (e.clientY > window.innerHeight - EDGE_SCROLL_ZONE) window.scrollBy(0, 14);

    const targets = Array.from(document.querySelectorAll<Element>('[data-cable-target]')).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        id: el.getAttribute('data-cable-target') as CableTargetId,
        rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      };
    });
    drag.target = findNearestTarget({ x: e.clientX, y: e.clientY }, targets, MAGNET_RADIUS);
    setHoverTarget(drag.target);
    setDragPoint({ x: e.clientX, y: e.clientY });
  };

  const onCablePointerUp = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.active) {
      suppressClickRef.current = true;
      window.setTimeout(() => (suppressClickRef.current = false), 0);
      if (drag.target) {
        tryConnect(drag.id, drag.target);
      } else {
        setFeedback({ tone: 'info', text: 'Solte o cabo em cima de um conector. Os pontilhados mostram onde dá para ligar.' });
        setHeld(null);
      }
    }
    setSession(null);
    setDragPoint(null);
    setDragging(false);
    setHoverTarget(null);
  };

  // Esc solta o cabo que está na mão
  useEffect(() => {
    if (!heldCableId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeld(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [heldCableId, setHeld]);

  const required = getRequiredCables(assembly);
  const connectedRequired = required.filter((id) => cableConnections[id] === cableById(id).target).length;
  const fPanelCount = Object.values(fPanelConnections).filter(Boolean).length;
  const draggingCable = dragPoint && session ? cableById(session.id) : null;

  const handleCableClick = (id: CableId) => {
    if (suppressClickRef.current) return;
    const next = heldCableId === id ? null : id;
    setHeld(next);
    if (next) setFeedback({ tone: 'info', text: `${cableById(id).name} na mão: clique no conector certo da placa (Esc para soltar).` });
  };

  return (
    <aside aria-label="Bandeja de cabos" className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 select-none">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-white">
          <Cable className="w-4 h-4 text-cyan-400" />
          Cabos
        </h3>
        <span className="font-mono text-xs font-bold text-cyan-300" aria-live="polite">
          {connectedRequired}/{required.length} ligados
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-400">
        Arraste cada cabo até o conector certo. Leia a serigrafia branca da placa.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {GROUPS.map((group) => {
          const cables = CABLES.filter((c) => c.source === group.source && isCableAvailable(c.id, assembly));
          return (
            <section key={group.source} aria-label={group.title}>
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                {group.icon}
                {group.title}
              </h4>
              <ul className="space-y-1.5">
                {cables.map((cable) => {
                  const target = cableConnections[cable.id];
                  const isHeld = heldCableId === cable.id;
                  return (
                    <li
                      key={cable.id}
                      className={`flex items-center gap-2 rounded-xl border p-1.5 transition-colors ${
                        isHeld
                          ? 'border-cyan-400 bg-cyan-950/60 ring-2 ring-cyan-400/30'
                          : target
                          ? 'border-emerald-800/60 bg-emerald-950/30'
                          : 'border-slate-800 bg-slate-900'
                      } ${shakeCableId === cable.id ? 'animate-plug-shake' : ''}`}
                    >
                      {target ? (
                        <>
                          <span className="grid h-10 w-12 shrink-0 place-items-center opacity-60">
                            <CablePlug cable={cable} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-white">{cable.name}</span>
                            <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              {cableTargetById(target).label}
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              disconnectCable(cable.id);
                              setFeedback({ tone: 'info', text: `${cable.name} desconectado.` });
                            }}
                            className="shrink-0 rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 cursor-pointer"
                          >
                            Soltar
                          </button>
                        </>
                      ) : (
                        <button
                          onPointerDown={onCablePointerDown(cable.id)}
                          onPointerMove={onCablePointerMove}
                          onPointerUp={onCablePointerUp}
                          onPointerCancel={onCablePointerUp}
                          onClick={() => handleCableClick(cable.id)}
                          aria-pressed={isHeld}
                          aria-label={`${cable.name}, ${cable.pins}. ${isHeld ? 'Na mão: escolha o conector.' : 'Arraste até o conector ou clique para pegar.'}`}
                          title={cable.description}
                          className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left cursor-grab active:cursor-grabbing touch-none focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                            draggingCable?.id === cable.id ? 'opacity-40' : ''
                          }`}
                        >
                          <span className="grid h-10 w-12 shrink-0 place-items-center">
                            <CablePlug cable={cable} />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-white">{cable.name}</span>
                            <span className="block text-[11px] font-mono text-slate-400">{cable.pins}</span>
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}

                {group.source === 'CASE' && (
                  <li className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-1.5">
                    <span className="grid h-10 w-12 shrink-0 place-items-center text-amber-400">
                      <Maximize2 className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">Painel frontal</span>
                      <span className="block text-[11px] font-mono text-slate-400">{fPanelCount}/4 fios no F_PANEL</span>
                    </span>
                    <button
                      onClick={openFrontPanelModal}
                      className="shrink-0 rounded-lg bg-amber-500 px-2 py-1 text-[11px] font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      Ligar
                    </button>
                  </li>
                )}

                {cables.length === 0 && (
                  <li className="rounded-xl border border-dashed border-slate-800 p-2 text-[11px] text-slate-500">{group.emptyHint}</li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <div
        aria-live="polite"
        className={`flex min-h-[44px] items-start gap-2 rounded-xl border p-2 text-[11px] leading-snug ${
          feedback?.tone === 'success'
            ? 'border-emerald-800/60 bg-emerald-950/50 text-emerald-200'
            : feedback?.tone === 'error'
            ? 'border-rose-800/60 bg-rose-950/50 text-rose-200'
            : 'border-slate-800 bg-slate-900 text-slate-300'
        }`}
      >
        {feedback?.tone === 'success' ? (
          <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0" />
        ) : feedback?.tone === 'error' ? (
          <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
        ) : (
          <Info className="w-3.5 h-3.5 mt-px shrink-0 text-cyan-400" />
        )}
        <span>{feedback?.text ?? 'Dica: comece pelo ATX 24 pinos, o maior conector da placa.'}</span>
      </div>

      {/* Ponta do cabo seguindo o ponteiro durante o arraste */}
      {draggingCable && dragPoint && (
        <div
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragPoint.x, top: dragPoint.y }}
        >
          <div className={`flex flex-col items-center gap-1 transition-transform ${hoverTargetId ? 'scale-110' : 'rotate-[-4deg]'}`}>
            <CablePlug cable={draggingCable} size="md" />
            <span className="mt-1 whitespace-nowrap rounded-md bg-slate-950/90 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow">
              {hoverTargetId ? `→ ${cableTargetById(hoverTargetId).label}` : draggingCable.name}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
