'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import {
  FPANEL_PINS,
  FPANEL_CONNECTORS,
  FPanelConnector,
  FPanelConnectorId,
  PinPair,
  orientPinPair,
  pairForPin,
  findNearestPinPair,
  getOccupiedPins,
} from '@/engine/frontPanel';
import { X, RotateCw, CheckCircle2, AlertTriangle, Hand, Plug, Eye, Info, Sparkles } from 'lucide-react';

// Geometria do cabeçalho: cada pino ocupa uma célula de 44px (área mínima de toque) com 14px de espaço
const CELL = 44;
const GAP = 14;
const PLUG_WIDTH = CELL * 2 + GAP;
const MAGNET_RADIUS = 56;
const DRAG_THRESHOLD = 5;

// Serigrafia branca impressa na placa, acima e abaixo das fileiras (padrão Intel)
const SILKSCREEN: { row: 'TOP' | 'BOTTOM'; col: number; span: number; text: string; className: string }[] = [
  { row: 'TOP', col: 1, span: 2, text: '+HDD_LED−', className: 'text-orange-300' },
  { row: 'TOP', col: 3, span: 2, text: 'RESET_SW', className: 'text-sky-300' },
  { row: 'TOP', col: 5, span: 1, text: 'NC', className: 'text-slate-500' },
  { row: 'BOTTOM', col: 1, span: 2, text: '+P_LED−', className: 'text-emerald-300' },
  { row: 'BOTTOM', col: 3, span: 2, text: 'PWR_SW', className: 'text-rose-300' },
  { row: 'BOTTOM', col: 5, span: 1, text: 'KEY', className: 'text-slate-500' },
];

const pinById = (id: number) => FPANEL_PINS.find((p) => p.id === id)!;

/** Posição na grade do cabeçalho de um par de pinos (coluna inicial à esquerda e fileira) */
const pairGridArea = (pair: PinPair) => {
  const [a, b] = pair.map(pinById);
  return { gridColumn: `${Math.min(a.col, b.col)} / span 2`, gridRow: a.row === 'TOP' ? 2 : 3 };
};

type Feedback = { tone: 'success' | 'error' | 'info'; text: string };

/** Conector de 2 vias do gabinete: carcaça preta, dois furos e as pontas dos fios coloridos */
const PlugBody: React.FC<{ connector: FPanelConnector; flipped: boolean; withWires?: boolean }> = ({
  connector,
  flipped,
  withWires = false,
}) => {
  const otherWire = connector.isPolaritySensitive ? '#E5E7EB' : '#64748B';
  const holes = [
    { x: CELL / 2, color: flipped ? otherWire : connector.wireColor, isPlus: !flipped },
    { x: CELL + GAP + CELL / 2, color: flipped ? connector.wireColor : otherWire, isPlus: flipped },
  ];
  return (
    <div className="relative" style={{ width: PLUG_WIDTH, height: CELL }}>
      {withWires &&
        holes.map((h, i) => (
          <span key={`w${i}`} className="absolute -top-6 h-6 w-1.5 rounded-t-full" style={{ left: h.x - 3, backgroundColor: h.color }} />
        ))}
      <div className="absolute inset-0 rounded-md border border-slate-500/80 bg-gradient-to-b from-slate-700 to-slate-950 shadow-[0_6px_14px_rgba(0,0,0,0.55)]" />
      {holes.map((h, i) => (
        <React.Fragment key={i}>
          <span className="absolute top-0 h-1.5 w-3 rounded-b-sm" style={{ left: h.x - 6, backgroundColor: h.color }} />
          <span className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-[3px] border border-slate-600 bg-black" style={{ left: h.x - 7 }} />
          {connector.isPolaritySensitive && h.isPlus && (
            <span className="absolute bottom-0.5 text-[11px] font-black leading-none text-amber-300" style={{ left: h.x - 3.5 }}>
              +
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export const FrontPanelZoomModal: React.FC = () => {
  const { isFrontPanelModalOpen, closeFrontPanelModal, fPanelConnections, connectFPanelJumper, disconnectFPanelJumper, autoConnectAllFPanel } =
    useAssemblyStore(
      useShallow((s) => ({
        isFrontPanelModalOpen: s.isFrontPanelModalOpen,
        closeFrontPanelModal: s.closeFrontPanelModal,
        fPanelConnections: s.fPanelConnections,
        connectFPanelJumper: s.connectFPanelJumper,
        disconnectFPanelJumper: s.disconnectFPanelJumper,
        autoConnectAllFPanel: s.autoConnectAllFPanel,
      }))
    );

  // Os LEDs começam em orientação aleatória: o aluno precisa ler o "+" da serigrafia e girar o conector
  const [flipped, setFlipped] = useState<Record<FPanelConnectorId, boolean>>(() => ({
    POWER_SW: false,
    RESET_SW: false,
    HDD_LED: Math.random() < 0.5,
    POWER_LED: Math.random() < 0.5,
  }));
  const [selectedId, setSelectedId] = useState<FPanelConnectorId | null>(null);
  const [session, setSession] = useState<{ id: FPanelConnectorId; fromSeat: boolean; startX: number; startY: number } | null>(null);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [hoverPair, setHoverPair] = useState<PinPair | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [shakeId, setShakeId] = useState<FPanelConnectorId | null>(null);
  const [seatedId, setSeatedId] = useState<FPanelConnectorId | null>(null);
  const pinRefs = useRef<Record<number, HTMLElement | null>>({});
  const suppressClickRef = useRef(false);

  const place = (id: FPanelConnectorId, pair: PinPair) => {
    const connector = FPANEL_CONNECTORS.find((c) => c.id === id)!;
    if (fPanelConnections[id]) disconnectFPanelJumper(id);
    const result = connectFPanelJumper(id, orientPinPair(pair, flipped[id]));
    if (result.success) {
      setFeedback({ tone: 'success', text: result.message });
      setSelectedId(null);
      setSeatedId(id);
      window.setTimeout(() => setSeatedId(null), 360);
    } else {
      setFeedback({
        tone: 'error',
        text: result.isPolarityInverted ? `${result.message} Gire o conector e tente de novo.` : `${result.message} ${connector.didacticTip}`,
      });
      setShakeId(id);
      window.setTimeout(() => setShakeId(null), 450);
    }
  };
  // O arraste roda em listeners do window: a ref garante que eles chamem a versão atual (orientação girada no meio do arraste)
  const placeRef = useRef(place);
  placeRef.current = place;

  const rotate = (id: FPanelConnectorId) => {
    setFlipped((prev) => ({ ...prev, [id]: !prev[id] }));
    const connector = FPANEL_CONNECTORS.find((c) => c.id === id)!;
    setFeedback({
      tone: 'info',
      text: connector.isPolaritySensitive
        ? 'Conector girado 180°: o fio colorido (+) trocou de lado.'
        : 'Conector girado 180°. Interruptores não têm polaridade, então tanto faz o lado.',
    });
  };

  // Arraste com Pointer Events: funciona com mouse, touchpad e toque
  useEffect(() => {
    if (!session) return;
    let active = false;
    let currentPair: PinPair | null = null;
    const occupied = getOccupiedPins(fPanelConnections, session.id);

    const onMove = (e: PointerEvent) => {
      if (!active) {
        if (Math.hypot(e.clientX - session.startX, e.clientY - session.startY) < DRAG_THRESHOLD) return;
        active = true;
        setSelectedId(session.id);
      }
      const centers: Record<number, { x: number; y: number }> = {};
      Object.entries(pinRefs.current).forEach(([pinId, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        centers[Number(pinId)] = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      currentPair = findNearestPinPair({ x: e.clientX, y: e.clientY }, centers, occupied, MAGNET_RADIUS);
      setDragPoint({ x: e.clientX, y: e.clientY });
      setHoverPair(currentPair);
    };

    const onUp = () => {
      if (active) {
        suppressClickRef.current = true;
        window.setTimeout(() => (suppressClickRef.current = false), 0);
        if (currentPair) {
          placeRef.current(session.id, currentPair);
        } else if (session.fromSeat) {
          disconnectFPanelJumper(session.id);
          setFeedback({ tone: 'info', text: 'Conector removido dos pinos.' });
        }
      }
      setSession(null);
      setDragPoint(null);
      setHoverPair(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [session, fPanelConnections, disconnectFPanelJumper]);

  // Atalhos: R gira o conector em mãos, Esc cancela ou fecha
  useEffect(() => {
    if (!isFrontPanelModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const heldId = session?.id ?? selectedId;
      if ((e.key === 'r' || e.key === 'R') && heldId && !fPanelConnections[heldId]) {
        rotate(heldId);
      } else if (e.key === 'Escape') {
        if (session) setSession(null);
        else if (selectedId) setSelectedId(null);
        else closeFrontPanelModal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isFrontPanelModalOpen) return null;

  const connectedCount = FPANEL_CONNECTORS.filter((c) => fPanelConnections[c.id]).length;
  const isComplete = connectedCount === FPANEL_CONNECTORS.length;
  const draggingId = dragPoint ? session?.id ?? null : null;
  const draggingConnector = draggingId ? FPANEL_CONNECTORS.find((c) => c.id === draggingId)! : null;

  const startPointer = (id: FPanelConnectorId, fromSeat: boolean) => (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const seatedPins = fromSeat ? fPanelConnections[id] : null;
    if (seatedPins) {
      // Ao tirar da placa, o conector continua com o fio colorido do mesmo lado em que estava encaixado
      const seatedFlipped = pinById(seatedPins[0]).col > pinById(seatedPins[1]).col;
      setFlipped((prev) => ({ ...prev, [id]: seatedFlipped }));
    }
    setSession({ id, fromSeat, startX: e.clientX, startY: e.clientY });
  };

  const handlePlugClick = (id: FPanelConnectorId) => {
    if (suppressClickRef.current) return;
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handlePinClick = (pinId: number) => {
    if (!selectedId) {
      setFeedback({ tone: 'info', text: 'Primeiro pegue um conector: arraste-o até os pinos ou clique nele.' });
      return;
    }
    const pair = pairForPin(pinId);
    if (!pair) return;
    const occupied = getOccupiedPins(fPanelConnections, selectedId);
    if (occupied.has(pair[0]) || occupied.has(pair[1])) {
      setFeedback({ tone: 'error', text: `Os pinos ${pair[0]} e ${pair[1]} já estão ocupados por outro conector.` });
      setShakeId(selectedId);
      window.setTimeout(() => setShakeId(null), 450);
      return;
    }
    place(selectedId, pair);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fpanel-title"
    >
      <div className="relative w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-950 border border-slate-700 rounded-3xl p-5 md:p-6 shadow-2xl select-none">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-400">Painel frontal do gabinete</p>
            <h2 id="fpanel-title" className="text-lg font-bold text-white mt-0.5">
              Ligue os cabos do gabinete no cabeçalho F_PANEL
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-cyan-300" aria-live="polite">
              {connectedCount}/4 encaixados
            </span>
            <button
              onClick={closeFrontPanelModal}
              aria-label="Fechar o minigame do painel frontal"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Como jogar em 3 passos */}
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5 text-xs text-slate-300">
          <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <Hand className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
            <span>
              <strong className="text-white">Arraste</strong> um conector até os pinos dourados (ou clique nele e depois em um pino).
            </span>
          </li>
          <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <Eye className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
            <span>
              <strong className="text-white">Leia a serigrafia</strong> branca da placa: ela diz o nome de cada par de pinos.
            </span>
          </li>
          <li className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <RotateCw className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
            <span>
              <strong className="text-white">LEDs têm polaridade:</strong> o fio colorido (+) vai no pino marcado com +. Gire com o botão ou a tecla R.
            </span>
          </li>
        </ol>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-5">
          {/* Cabos do gabinete */}
          <section aria-label="Cabos do gabinete">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Cabos do gabinete</h3>
              <button
                onClick={autoConnectAllFPanel}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
                title="Encaixar todos os 4 conectores de uma só vez usando o adaptador Q-Connector"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Q-Connector Rápido</span>
              </button>
            </div>
            <ul className="space-y-2">
              {FPANEL_CONNECTORS.map((conn) => {
                const pins = fPanelConnections[conn.id];
                const isSelected = selectedId === conn.id;
                const isDragging = draggingId === conn.id;
                return (
                  <li
                    key={conn.id}
                    className={`p-3 rounded-2xl border transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/30'
                        : pins
                        ? 'bg-emerald-950/30 border-emerald-800/60'
                        : 'bg-slate-900 border-slate-800'
                    } ${shakeId === conn.id ? 'animate-plug-shake' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white flex items-center gap-1.5">
                          {conn.name}
                          {pins && <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-label="encaixado" />}
                        </p>
                        <p className={`text-[11px] font-semibold ${conn.isPolaritySensitive ? 'text-amber-300' : 'text-slate-400'}`}>
                          {conn.isPolaritySensitive ? 'Tem polaridade (+/−)' : 'Sem polaridade'}
                        </p>
                      </div>
                      {pins ? (
                        <button
                          onClick={() => {
                            disconnectFPanelJumper(conn.id);
                            setFeedback({ tone: 'info', text: `${conn.name} removido dos pinos.` });
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                        >
                          Soltar
                        </button>
                      ) : (
                        <button
                          onClick={() => rotate(conn.id)}
                          aria-label={`Girar o conector ${conn.name} 180 graus`}
                          title="Girar 180° (tecla R)"
                          className="shrink-0 p-2 rounded-lg text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-cyan-300 cursor-pointer"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {pins ? (
                      <p className="mt-2 text-[11px] font-mono text-emerald-300">
                        Encaixado nos pinos {pins[0]} e {pins[1]}
                      </p>
                    ) : (
                      <button
                        onPointerDown={startPointer(conn.id, false)}
                        onClick={() => handlePlugClick(conn.id)}
                        aria-pressed={isSelected}
                        aria-label={`${conn.name}: ${isSelected ? 'na mão, escolha um pino' : 'pegar conector'}`}
                        className={`mt-3 mb-1 flex w-full justify-center pt-6 pb-1 rounded-xl cursor-grab active:cursor-grabbing touch-none focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                          isDragging ? 'opacity-30' : ''
                        }`}
                      >
                        <PlugBody connector={conn} flipped={flipped[conn.id]} withWires />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Cabeçalho F_PANEL da placa-mãe */}
          <section aria-label="Cabeçalho F_PANEL da placa-mãe" className="flex flex-col gap-3">
            <div
              className="relative flex flex-col items-center justify-center rounded-2xl border border-cyan-900/70 bg-[#0b1329] px-2 sm:px-4 py-8 md:py-10"
              style={{ backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px)', backgroundSize: '16px 16px' }}
            >
              <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-400/80 mb-5">Placa-mãe · F_PANEL</p>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(5, ${CELL}px)`,
                  gridTemplateRows: `20px ${CELL}px ${CELL}px 20px`,
                  columnGap: GAP,
                  rowGap: 6,
                }}
              >
                {/* Base plástica preta do cabeçalho */}
                <div
                  className="rounded-lg bg-slate-950 border border-slate-800 -m-1.5"
                  style={{ gridColumn: '1 / span 5', gridRow: '2 / span 2' }}
                />

                {SILKSCREEN.map((label) => (
                  <span
                    key={`${label.row}${label.col}`}
                    className={`self-center text-center text-[11px] font-mono font-bold tracking-wide ${label.className}`}
                    style={{ gridColumn: `${label.col} / span ${label.span}`, gridRow: label.row === 'TOP' ? 1 : 4 }}
                  >
                    {label.text}
                  </span>
                ))}

                {FPANEL_PINS.map((pin) =>
                  pin.isKeyOrNc ? (
                    <span
                      key={pin.id}
                      title={pin.name}
                      className="grid place-items-center"
                      style={{ gridColumn: pin.col, gridRow: pin.row === 'TOP' ? 2 : 3 }}
                    >
                      <span className={`h-4 w-4 rounded-[3px] border border-dashed ${pin.label === 'KEY' ? 'border-slate-700' : 'border-slate-600 bg-slate-800'}`} />
                    </span>
                  ) : (
                    <button
                      key={pin.id}
                      ref={(el) => {
                        pinRefs.current[pin.id] = el;
                      }}
                      onClick={() => handlePinClick(pin.id)}
                      aria-label={`Pino ${pin.id}: ${pin.name}`}
                      className={`relative grid place-items-center rounded-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                        selectedId ? 'hover:bg-cyan-400/15' : 'hover:bg-slate-800/60'
                      }`}
                      style={{ gridColumn: pin.col, gridRow: pin.row === 'TOP' ? 2 : 3 }}
                    >
                      <span className="h-4 w-4 rounded-[3px] bg-gradient-to-br from-amber-100 via-amber-400 to-amber-700 shadow-[0_0_6px_rgba(245,158,11,0.35)]" />
                      <span className="absolute bottom-0.5 right-1 text-[11px] font-mono text-slate-500">{pin.id}</span>
                    </button>
                  )
                )}

                {/* Prévia magnética: o conector "gruda" no par mais próximo enquanto é arrastado */}
                {hoverPair && draggingConnector && (
                  <div className="z-10 pointer-events-none rounded-md ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0b1329] opacity-80" style={pairGridArea(hoverPair)}>
                    <PlugBody
                      connector={draggingConnector}
                      flipped={pinById(hoverPair[0]).col > pinById(hoverPair[1]).col ? !flipped[draggingConnector.id] : flipped[draggingConnector.id]}
                    />
                  </div>
                )}

                {/* Conectores encaixados */}
                {FPANEL_CONNECTORS.map((conn) => {
                  const pins = fPanelConnections[conn.id];
                  if (!pins || draggingId === conn.id) return null;
                  const seatedFlipped = pinById(pins[0]).col > pinById(pins[1]).col;
                  return (
                    <button
                      key={conn.id}
                      onPointerDown={startPointer(conn.id, true)}
                      aria-label={`${conn.name} encaixado nos pinos ${pins[0]} e ${pins[1]}. Arraste para mover ou para fora para soltar.`}
                      title={`${conn.name} · arraste para mover`}
                      className={`z-20 cursor-grab active:cursor-grabbing touch-none rounded-md focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                        seatedId === conn.id ? 'animate-plug-seat' : ''
                      }`}
                      style={pairGridArea(pins)}
                    >
                      <PlugBody connector={conn} flipped={seatedFlipped} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Retorno da última ação */}
            <div
              aria-live="polite"
              className={`min-h-[52px] flex items-start gap-2 p-3 rounded-2xl border text-sm ${
                feedback?.tone === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200'
                  : feedback?.tone === 'error'
                  ? 'bg-rose-950/50 border-rose-800/60 text-rose-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {feedback?.tone === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : feedback?.tone === 'error' ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : feedback ? (
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <Plug className="w-4 h-4 mt-0.5 shrink-0 text-cyan-400" />
              )}
              <span>{feedback?.text ?? 'Comece pelo POWER SW: sem ele, o botão de ligar do gabinete não funciona.'}</span>
            </div>

            {/* Banner de Verificação e Conclusão do Painel Frontal */}
            {(isComplete || fPanelConnections.POWER_SW) && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/70 text-emerald-100 shadow-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-emerald-300">
                      {isComplete
                        ? 'Todos os 4 conectores do Painel Frontal ligados com perfeição!'
                        : 'Botão Power (POWER SW) ligado com sucesso! O PC já pode ligar.'}
                    </span>
                    <span className="block text-[11px] text-emerald-200/80">
                      {isComplete
                        ? 'Botão Liga/Desliga, Reset e LEDs de diagnóstico estão funcionais.'
                        : `${connectedCount}/4 conectados. Painel frontal verificado pelo sistema.`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={closeFrontPanelModal}
                  className="w-full sm:w-auto shrink-0 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black cursor-pointer shadow-md shadow-emerald-500/25 transition-all active:scale-95"
                >
                  Concluir e Voltar à Bancada
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Conector "na mão" seguindo o ponteiro (some quando a atração magnética o prende a um par) */}
      {draggingConnector && dragPoint && !hoverPair && (
        <div
          className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] scale-105 opacity-95"
          style={{ left: dragPoint.x, top: dragPoint.y }}
        >
          <PlugBody connector={draggingConnector} flipped={flipped[draggingConnector.id]} withWires />
        </div>
      )}
    </div>
  );
};

