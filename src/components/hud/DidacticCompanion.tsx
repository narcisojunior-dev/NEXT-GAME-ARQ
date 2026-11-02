'use client';

import React from 'react';
import { useAssemblyStore, selectCurrentPhase } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { Bot, Lightbulb, Sparkles } from 'lucide-react';

export const DidacticCompanion: React.FC = () => {
  const {
    activeAlert,
    dismissAlert,
  } = useAssemblyStore(
    useShallow((s) => ({
      activeAlert: s.activeAlert,
      dismissAlert: s.dismissAlert,
    }))
  );
  const currentPhase = useAssemblyStore(selectCurrentPhase);

  const getPhaseAdvice = () => {
    switch (currentPhase) {
      case 'PHASE_1_PREPARATION':
        return {
          title: 'Passo 1: Descarga Eletrostática (ESD)',
          text: 'Você sabia que o corpo humano acumula até 10.000 Volts de eletricidade estática ao andar num tapete? Esse choque que você quase não sente pode queimar transistores microscópicos da placa-mãe. Clique no botão de descarga antes de encostar nas peças!',
        };
      case 'PHASE_2_BENCH_ASSEMBLY':
        return {
          title: 'Passo 2: Montagem Pré-Gabinete',
          text: 'Dica de ouro: Monte a CPU, a pasta térmica, o cooler e as memórias RAM FORA do gabinete, sobre a caixa da placa-mãe. Isso dá espaço livre para as suas mãos e evita arranhar os componentes na lataria.',
        };
      case 'PHASE_3_CASE_PREPARATION':
        return {
          title: 'Passo 3: Gabinete, Espelho Traseiro & Espaçadores',
          text: 'Antes de comprar o gabinete, confira se ele aceita o formato da sua placa-mãe (ATX, Micro-ATX) e o comprimento da placa de vídeo. Cuidado Crítico: NUNCA parafuse a placa-mãe direto no metal do gabinete sem os espaçadores de latão (standoffs)! Se os pontos de solda encostarem na chapa de ferro, o computador sofrerá curto-circuito ao ligar.',
        };
      case 'PHASE_4_MOTHERBOARD_INSTALL':
        return {
          title: 'Passo 4: Fixação no Gabinete',
          text: 'Ao parafusar a placa-mãe, use parafusos de rosca fina e aperte em padrão cruzado (em "X"), sem forçar em excesso para não rachar as trilhas internas de circuito.',
        };
      case 'PHASE_5_GPU_EXPANSION':
        return {
          title: 'Passo 5: Placa de Vídeo (PCIe x16)',
          text: 'Use sempre o slot PCIe superior mais próximo da CPU! Ele tem conexão elétrica direta de 16 pistas com o processador, garantindo a menor latência e maior taxa de quadros (FPS) para jogos.',
        };
      case 'PHASE_6_CABLING':
        return {
          title: 'Passo 6: O Cabeamento',
          text: 'Não tenha medo do cabo do Painel Frontal (F_PANEL)! O botão POWER SW é apenas um contato momentâneo e não tem lado positivo/negativo. Já os LEDs (HDD LED, POWER LED) têm polaridade (+ e -).',
        };
      case 'PHASE_7_BOOT_POST':
        return {
          title: 'Passo 7: O Teste da Verdade (POST)',
          text: 'Ao apertar o botão de ligar, a placa-mãe executa o POST (Power-On Self Test). Observe os 4 LEDs de diagnóstico (CPU → DRAM → VGA → BOOT). Se tudo der certo, você ouvirá o clássico Bip único da BIOS!',
        };
      default:
        return {
          title: 'Bancada Pronta',
          text: 'Siga a ordem lógica de montagem para garantir que o computador ligue de primeira!',
        };
    }
  };

  const advice = getPhaseAdvice();

  return (
    <div className="w-full bg-slate-950/70 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-cyan-400 font-mono tracking-wider uppercase">
              Byte — Tutor Didático
            </span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium">
              {advice.title}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-4xl">
            {advice.text}
          </p>
        </div>
      </div>

      {activeAlert && (
        <div
          // Equivalência multimodal: o mesmo aviso do som de erro/sucesso é anunciado pelo leitor de tela
          role={activeAlert.type === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-2xl border text-xs max-w-md shrink-0 flex items-start gap-2 shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
          activeAlert.type === 'error'
            ? 'bg-rose-950/90 border-rose-600/80 text-rose-200'
            : activeAlert.type === 'warning'
            ? 'bg-amber-950/90 border-amber-600/80 text-amber-200'
            : 'bg-emerald-950/90 border-emerald-600/80 text-emerald-200'
        }`}>
          <div className="flex-1">
            <div className="font-bold mb-0.5">{activeAlert.title}</div>
            <div className="text-[11px] opacity-90 leading-normal">{activeAlert.message}</div>
          </div>
          <button
            type="button"
            onClick={dismissAlert}
            aria-label="Fechar aviso"
            className="text-xs opacity-60 hover:opacity-100 p-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

