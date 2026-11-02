import type React from 'react';

/**
 * Torna um alvo de clique não nativo (div da bancada, <g> do SVG da placa) operável por teclado:
 * foco com Tab e ativação com Enter/Espaço (WCAG 2.1.1). O onClick continua no próprio elemento.
 * Quando `enabled` é falso o alvo não faz nada e fica fora da ordem de tabulação.
 */
export function pressableProps(label: string, onActivate: () => void, enabled = true) {
  if (!enabled) return {};
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

/** Anel de foco visível para <g> de SVG, onde outline não é desenhado de forma confiável */
export const SVG_FOCUS_RING = 'outline-none focus-visible:drop-shadow-[0_0_6px_#22d3ee]';

/** Anel de foco visível para alvos em HTML */
export const FOCUS_RING = 'outline-none focus-visible:ring-4 focus-visible:ring-cyan-400/70';
