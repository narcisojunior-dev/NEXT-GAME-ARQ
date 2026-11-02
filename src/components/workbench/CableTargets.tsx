'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { CABLES, CableSpec, CableTargetId, cableTargetById } from '@/engine/cabling';
import { useCableDragStore } from './cableDragStore';

/**
 * Estado compartilhado de um conector que recebe cabo: qual cabo está nele, se está em
 * destaque durante o arraste e o que acontece ao clicar (modo clicar-para-ligar)
 */
function useCableTarget(targetId: CableTargetId) {
  const cableConnections = useAssemblyStore((s) => s.cableConnections);
  const { heldCableId, isDragging, hoverTargetId, tryConnect, setFeedback } = useCableDragStore(
    useShallow((s) => ({
      heldCableId: s.heldCableId,
      isDragging: s.isDragging,
      hoverTargetId: s.hoverTargetId,
      tryConnect: s.tryConnect,
      setFeedback: s.setFeedback,
    }))
  );

  const connectedCable: CableSpec | null = CABLES.find((c) => cableConnections[c.id] === targetId) ?? null;
  const isHovered = hoverTargetId === targetId;
  const showAffordance = Boolean(heldCableId) && !connectedCable;
  const label = cableTargetById(targetId).label;

  const activate = () => {
    if (heldCableId) {
      tryConnect(heldCableId, targetId);
    } else if (connectedCable) {
      setFeedback({ tone: 'info', text: `${label}: ${connectedCable.name} ligado. Para soltar, use o botão na bandeja de cabos.` });
    } else {
      setFeedback({ tone: 'info', text: `${label}: ${cableTargetById(targetId).description}. Pegue um cabo na bandeja e traga até aqui.` });
    }
  };

  return { connectedCable, isHovered, showAffordance, isDragging, label, activate };
}

const onActivateKey = (activate: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    activate();
  }
};

type WireDirection = 'up' | 'down' | 'left' | 'right';

interface BoardHeaderProps {
  targetId: CableTargetId;
  x: number;
  y: number;
  w: number;
  h: number;
  rows: number;
  cols: number;
  /** Índices (linha * cols + coluna) de pinos ausentes: a "chave" que impede encaixe errado */
  missing?: number[];
  label?: string;
  labelPos?: 'above' | 'below' | 'right' | 'left';
  shroud?: string;
  wires: WireDirection;
  wireCount?: number;
  /** 'pins' desenha a matriz de pinos; 'sata' desenha portas SATA empilhadas em formato de L */
  variant?: 'pins' | 'sata';
}

/**
 * Conector macho de pinos desenhado em SVG que aceita um cabo arrastado
 */
export const BoardHeader: React.FC<BoardHeaderProps> = ({
  targetId,
  x,
  y,
  w,
  h,
  rows,
  cols,
  missing = [],
  label,
  labelPos = 'below',
  shroud = '#0B1220',
  wires,
  wireCount = 4,
  variant = 'pins',
}) => {
  const { connectedCable, isHovered, showAffordance, label: silkscreen, activate } = useCableTarget(targetId);
  const pad = 4;
  const cellW = (w - pad * 2) / cols;
  const cellH = (h - pad * 2) / rows;
  const pin = Math.max(2.5, Math.min(cellW, cellH) * 0.45);
  const text = label ?? silkscreen;

  const labelProps =
    labelPos === 'above'
      ? { x: x + w / 2, y: y - 6, textAnchor: 'middle' as const }
      : labelPos === 'right'
      ? { x: x + w + 6, y: y + h / 2 + 3.5, textAnchor: 'start' as const }
      : labelPos === 'left'
      ? { x: x - 6, y: y + h / 2 + 3.5, textAnchor: 'end' as const }
      : { x: x + w / 2, y: y + h + 13, textAnchor: 'middle' as const };

  // Fios saindo do conector plugado em direção à borda mais próxima
  const wireLines = connectedCable
    ? [...Array(wireCount)].map((_, i) => {
        const t = (i + 0.5) / wireCount;
        if (wires === 'up' || wires === 'down') {
          const wx = x + w * t;
          const y0 = wires === 'up' ? y : y + h;
          return { x1: wx, y1: y0, x2: wx + (t - 0.5) * 8, y2: y0 + (wires === 'up' ? -22 : 22) };
        }
        const wy = y + h * t;
        const x0 = wires === 'left' ? x : x + w;
        return { x1: x0, y1: wy, x2: x0 + (wires === 'left' ? -22 : 22), y2: wy + (t - 0.5) * 8 };
      })
    : [];

  return (
    <g
      data-cable-target={targetId}
      role="button"
      tabIndex={0}
      aria-label={`${silkscreen}${connectedCable ? `, ligado: ${connectedCable.name}` : ', vazio'}`}
      onClick={activate}
      onKeyDown={onActivateKey(activate)}
      className="cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100"
    >
      <rect className="focus-ring opacity-0" x={x - 7} y={y - 7} width={w + 14} height={h + 14} rx="6" stroke="#22D3EE" strokeWidth="2" />
      {showAffordance && !isHovered && (
        <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx="5" stroke="#22D3EE" strokeOpacity="0.7" strokeWidth="1.5" strokeDasharray="4 3" />
      )}
      {isHovered && <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx="6" fill="#22D3EE" fillOpacity="0.18" stroke="#22D3EE" strokeWidth="3" />}

      <rect x={x} y={y} width={w} height={h} rx="2.5" fill={shroud} stroke="#334155" strokeWidth="1.2" />
      {variant === 'sata' &&
        [...Array(rows)].map((_, r) => {
          const py = y + 3 + r * ((h - 6) / rows);
          const ph = (h - 6) / rows - 3;
          return (
            <g key={r}>
              <path
                d={`M ${x + 4} ${py} H ${x + w - 4} V ${py + ph} H ${x + 14} V ${py + ph * 0.55} H ${x + 4} Z`}
                fill="#7F1D1D"
                stroke="#B91C1C"
                strokeWidth="0.8"
              />
              <rect x={x + 18} y={py + ph * 0.3} width={w - 28} height="2" fill="url(#hw-gold)" />
            </g>
          );
        })}
      {variant === 'pins' && [...Array(rows * cols)].map((_, i) => {
        if (missing.includes(i)) return null;
        const r = Math.floor(i / cols);
        const c = i % cols;
        return (
          <rect
            key={i}
            x={x + pad + c * cellW + cellW / 2 - pin / 2}
            y={y + pad + r * cellH + cellH / 2 - pin / 2}
            width={pin}
            height={pin}
            rx="0.6"
            fill="url(#hw-gold)"
          />
        );
      })}

      {connectedCable && (
        <g pointerEvents="none">
          {wireLines.map((l, i) => (
            <line key={i} {...l} stroke={connectedCable.color === '#111827' || connectedCable.color === '#1F2937' ? '#334155' : connectedCable.color} strokeWidth="3" strokeLinecap="round" />
          ))}
          <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} rx="3" fill={connectedCable.color} stroke="#0B0F19" strokeWidth="1.5" />
          <rect x={x + 1} y={y + 1} width={w - 2} height="2.5" rx="1" fill="#FFFFFF" fillOpacity="0.25" />
        </g>
      )}

      {text && (
        <text {...labelProps} fill={connectedCable ? '#6EE7B7' : '#CBD5E1'} fontSize="10" fontWeight="700" fontFamily="var(--font-mono)" letterSpacing="0.5">
          {text}
          {connectedCable ? ' ✓' : ''}
        </text>
      )}
    </g>
  );
};

/**
 * Conector em HTML (ex: entrada de energia do disco na baia SATA)
 */
export const CableTargetBox: React.FC<{ targetId: CableTargetId; title: string; hint: string }> = ({ targetId, title, hint }) => {
  const { connectedCable, isHovered, showAffordance, activate } = useCableTarget(targetId);
  return (
    <div
      data-cable-target={targetId}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        activate();
      }}
      onKeyDown={onActivateKey(activate)}
      aria-label={`${title}${connectedCable ? `, ligado: ${connectedCable.name}` : ', vazio'}`}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
        isHovered
          ? 'border-cyan-400 bg-cyan-400/20 text-cyan-100 ring-2 ring-cyan-400/40'
          : connectedCable
          ? 'border-emerald-700/70 bg-emerald-950/50 text-emerald-300'
          : showAffordance
          ? 'border-dashed border-cyan-400/70 text-cyan-200'
          : 'border-slate-700 bg-slate-900 text-slate-300'
      }`}
    >
      <span
        className="h-3 w-5 rounded-sm border border-slate-600"
        style={{ backgroundColor: connectedCable ? connectedCable.color : '#0B1220' }}
      />
      <span>
        {title}: {connectedCable ? 'ligado ✓' : hint}
      </span>
    </div>
  );
};
