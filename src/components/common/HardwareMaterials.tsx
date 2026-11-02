import React from 'react';

/**
 * Materiais SVG compartilhados por todas as ilustrações de hardware.
 * Renderizado uma única vez na página: as ilustrações referenciam estes ids em vez de
 * declarar gradientes próprios (evita ids duplicados no DOM). Luz sempre vinda do canto superior esquerdo.
 */
export const HardwareMaterials: React.FC = () => (
  <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
    <defs>
      {/* Metal niquelado do IHS (tampa do processador) */}
      <linearGradient id="hw-ihs" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#F1F5F9" />
        <stop offset="0.45" stopColor="#CBD5E1" />
        <stop offset="1" stopColor="#8B98AA" />
      </linearGradient>

      {/* Alumínio escovado claro (aletas, coolers box) */}
      <linearGradient id="hw-alu" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#CBD5E1" />
        <stop offset="0.5" stopColor="#94A3B8" />
        <stop offset="1" stopColor="#64748B" />
      </linearGradient>

      {/* Alumínio anodizado escuro (dissipadores de RAM, carenagens) */}
      <linearGradient id="hw-alu-dark" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#3A4658" />
        <stop offset="0.55" stopColor="#1F2937" />
        <stop offset="1" stopColor="#111827" />
      </linearGradient>

      {/* Plástico preto texturizado (shroud de GPU, gabinete, fonte) */}
      <linearGradient id="hw-plastic" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#273244" />
        <stop offset="1" stopColor="#0F1623" />
      </linearGradient>

      {/* Cobre dos heatpipes e da base do cooler */}
      <linearGradient id="hw-copper" x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#F2A65A" />
        <stop offset="0.5" stopColor="#C2702E" />
        <stop offset="1" stopColor="#8A4B1C" />
      </linearGradient>

      {/* Contatos dourados */}
      <linearGradient id="hw-gold" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#FDE68A" />
        <stop offset="0.5" stopColor="#EAB308" />
        <stop offset="1" stopColor="#A16207" />
      </linearGradient>

      {/* PCB verde de componentes (substrato da CPU, pentes de RAM) */}
      <linearGradient id="hw-pcb-green" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#0F5132" />
        <stop offset="1" stopColor="#06311F" />
      </linearGradient>

      {/* PCB preta fosca (placas-mãe, SSDs) */}
      <linearGradient id="hw-pcb-dark" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#132036" />
        <stop offset="1" stopColor="#070D18" />
      </linearGradient>

      {/* Vidro temperado com reflexo diagonal */}
      <linearGradient id="hw-glass" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#7DD3FC" stopOpacity="0.22" />
        <stop offset="0.35" stopColor="#7DD3FC" stopOpacity="0.06" />
        <stop offset="0.36" stopColor="#7DD3FC" stopOpacity="0.14" />
        <stop offset="1" stopColor="#0EA5E9" stopOpacity="0.04" />
      </linearGradient>

      {/* Iluminação ARGB: usada somente em peças que realmente têm LEDs RGB */}
      <linearGradient id="hw-rgb" x1="0" y1="0" x2="1" y2="0">
        <stop stopColor="#22D3EE" />
        <stop offset="0.5" stopColor="#818CF8" />
        <stop offset="1" stopColor="#22D3EE" />
      </linearGradient>

      {/* Hélice de ventoinha: pás translúcidas sobre o cubo */}
      <radialGradient id="hw-fan" cx="0.5" cy="0.5" r="0.5">
        <stop stopColor="#334155" />
        <stop offset="0.75" stopColor="#1E293B" />
        <stop offset="1" stopColor="#0F172A" />
      </radialGradient>
    </defs>
  </svg>
);
