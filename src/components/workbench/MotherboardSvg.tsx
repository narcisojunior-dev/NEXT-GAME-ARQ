'use client';

import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { MotherboardComponent } from '@/engine/types';
import { Cpu, Zap, HardDrive, Fan, AlertTriangle, CheckCircle2, ArrowDown, CircuitBoard, RefreshCw } from 'lucide-react';
import { HardwareImage } from '@/components/common/HardwareImage';
import { BoardHeader } from './CableTargets';
import { pressableProps, SVG_FOCUS_RING, FOCUS_RING } from '@/components/common/pressable';

// Escala da GPU desenhada sobre a placa (viewBox da ilustração 340x130 → 544x208 na placa)
const GPU_ART = { x: 56, y: 384, scale: 1.6 };

interface MotherboardSvgProps {
  onSlotClick?: (slotId: string) => void;
}

export const MotherboardSvg: React.FC<MotherboardSvgProps> = ({ onSlotClick }) => {
  const {
    selectedMotherboard,
    installMotherboard,
    selectMotherboard,
    assembly,
    postResult,
    selectedComponentForPlacement,
    installCpu,
    toggleSocketLever,
    applyThermalPaste,
    installCooler,
    removeCooler,
    installRam,
    installStorage,
    installGpu,
    openFrontPanelModal,
    fPanelConnections,
  } = useAssemblyStore(
    useShallow((s) => ({
      selectedMotherboard: s.selectedMotherboard,
      installMotherboard: s.installMotherboard,
      selectMotherboard: s.selectMotherboard,
      assembly: s.assembly,
      postResult: s.postResult,
      selectedComponentForPlacement: s.selectedComponentForPlacement,
      installCpu: s.installCpu,
      toggleSocketLever: s.toggleSocketLever,
      applyThermalPaste: s.applyThermalPaste,
      installCooler: s.installCooler,
      removeCooler: s.removeCooler,
      installRam: s.installRam,
      installStorage: s.installStorage,
      installGpu: s.installGpu,
      openFrontPanelModal: s.openFrontPanelModal,
      fPanelConnections: s.fPanelConnections,
    }))
  );

  const handleCpuAreaClick = () => {
    if (selectedComponentForPlacement?.category === 'CPU') {
      installCpu(selectedComponentForPlacement as never);
    } else if (selectedComponentForPlacement?.category === 'PASTE') {
      applyThermalPaste();
    } else if (selectedComponentForPlacement?.category === 'COOLER') {
      installCooler(selectedComponentForPlacement as never);
    } else if (assembly.cpuInstalled && !assembly.coolerInstalled) {
      toggleSocketLever();
    }
  };

  const handleRamSlotClick = (slot: number) => {
    // Só os slots 2 e 4 (A2/B2) recebem pentes; antes, clicar no 1 ou no 3 instalava no slot 4
    if ((slot === 2 || slot === 4) && selectedComponentForPlacement?.category === 'RAM') {
      installRam(slot, selectedComponentForPlacement as never);
    }
  };

  const handleM2SlotClick = () => {
    if (selectedComponentForPlacement?.category === 'STORAGE') {
      installStorage(selectedComponentForPlacement, 'M2');
    }
  };

  const handlePcieSlotClick = () => {
    if (selectedComponentForPlacement?.category === 'GPU') {
      installGpu(selectedComponentForPlacement as never);
    }
  };

  const isPowerOn = postResult?.canPowerOn;
  // Discos SATA ficam na baia do gabinete; só o NVMe aparece no slot M.2 da placa
  const m2Storage = assembly.storageInstalled?.storageType === 'NVMe_M2' ? assembly.storageInstalled : null;

  // Indicadores de onde clicar com base na peça selecionada
  const isCpuTarget = selectedComponentForPlacement?.category === 'CPU';
  const isPasteTarget = selectedComponentForPlacement?.category === 'PASTE';
  const isCoolerTarget = selectedComponentForPlacement?.category === 'COOLER';
  const isRamTarget = selectedComponentForPlacement?.category === 'RAM';
  const isStorageTarget = selectedComponentForPlacement?.category === 'STORAGE';
  const isGpuTarget = selectedComponentForPlacement?.category === 'GPU';

  if (!selectedMotherboard) {
    const isMbInHand = selectedComponentForPlacement?.category === 'MOTHERBOARD';
    const placeMotherboard = () => {
      if (isMbInHand) {
        installMotherboard(selectedComponentForPlacement as MotherboardComponent);
      }
    };
    return (
      <div
        data-testid="workbench-2d"
        onClick={placeMotherboard}
        {...pressableProps(
          `Assentar ${selectedComponentForPlacement?.name ?? 'placa-mãe'} na bancada`,
          placeMotherboard,
          isMbInHand
        )}
        className={`relative w-full aspect-4/3 max-w-4xl mx-auto rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none overflow-hidden ${FOCUS_RING} ${
          isMbInHand
            ? 'bg-cyan-950/40 border-cyan-400 ring-4 ring-cyan-400/20 shadow-2xl shadow-cyan-500/20 animate-pulse'
            : 'bg-slate-950/60 border-dashed border-slate-700 hover:border-slate-500'
        }`}
      >
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-inner">
          <CircuitBoard className={`w-10 h-10 ${isMbInHand ? 'text-cyan-400' : 'text-slate-500'}`} />
        </div>

        {isMbInHand ? (
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              Placa pronta para assentamento
            </span>
            <h3 className="text-xl font-black text-white">
              CLIQUE AQUI PARA POSICIONAR {selectedComponentForPlacement.name.toUpperCase()} NA BANCADA!
            </h3>
            <p className="text-xs text-cyan-200/80 max-w-md mx-auto">
              Soquete: {(selectedComponentForPlacement as MotherboardComponent).socket} • Memória: {(selectedComponentForPlacement as MotherboardComponent).supportedRam} • Formato: {(selectedComponentForPlacement as MotherboardComponent).formFactor}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800 text-slate-400">
              Etapa 2 da Montagem
            </span>
            <h3 className="text-lg font-bold text-white">
              Bancada Pronta: Escolha uma Placa-Mãe
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Abra a aba <strong className="text-cyan-300">Placa-Mãe</strong> no inventário abaixo e clique em <strong className="text-cyan-300">&quot;Usar&quot;</strong> na placa que deseja usar (LGA1700, AM4 ou AM5). Depois clique aqui para assentá-la na manta antiestática.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-4/3 max-w-4xl mx-auto bg-slate-950/90 rounded-3xl border-2 border-slate-800 p-4 shadow-2xl backdrop-blur-md overflow-hidden select-none">
      {/* Informações da Placa-Mãe Ativa */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg text-[11px] text-slate-300">
        <CircuitBoard className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-white">{selectedMotherboard.name}</span>
        <span className="font-mono text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
          {selectedMotherboard.socket}
        </span>
        <span className="font-mono text-purple-300 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
          {selectedMotherboard.supportedRam}
        </span>
        <button
          onClick={() => selectMotherboard(null)}
          title="Substituir Placa-Mãe por outro modelo"
          className="ml-1 text-slate-400 hover:text-white flex items-center gap-1 hover:bg-slate-800 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="text-[11px]">Trocar</span>
        </button>
      </div>
      {/* Banner Superior com Orientação Dinâmica para o Aluno */}
      {selectedComponentForPlacement && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-cyan-500 text-slate-950 text-xs font-black shadow-xl flex items-center gap-2 animate-bounce">
          <ArrowDown className="w-4 h-4" />
          <span>
            {isCpuTarget && 'CLIQUE NO SOQUETE CENTRAL PARA ENCAIXAR A CPU!'}
            {isPasteTarget && 'CLIQUE SOBRE O PROCESSADOR PARA APLICAR A PASTA!'}
            {isCoolerTarget && 'CLIQUE SOBRE A CPU PARA PARAFUSAR O COOLER!'}
            {isRamTarget && 'CLIQUE NO SLOT 2 OU 4 PARA ENCAIXAR A MEMÓRIA (DUAL CHANNEL)!'}
            {isStorageTarget && 'CLIQUE NO SLOT M.2 PARA ENCAIXAR O SSD!'}
            {isGpuTarget && 'CLIQUE NO SLOT PCIe x16 PARA ENCAIXAR A PLACA DE VÍDEO!'}
            {!isCpuTarget && !isPasteTarget && !isCoolerTarget && !isRamTarget && !isStorageTarget && !isGpuTarget && `CLIQUE NO SLOT CORRESPONDENTE PARA ENCAIXAR ${selectedComponentForPlacement.name}`}
          </span>
        </div>
      )}

      <svg
        viewBox="0 0 900 680"
        data-testid="workbench-2d"
        role="group"
        aria-label={`Bancada 2D: placa-mãe ${selectedMotherboard.name}`}
        className="w-full h-full drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pcbBg" x1="0" y1="0" x2="900" y2="680" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0B132B" />
            <stop offset="0.5" stopColor="#0A192F" />
            <stop offset="1" stopColor="#030C1E" />
          </linearGradient>

          <linearGradient id="heatsinkMetal" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#334155" />
            <stop offset="0.5" stopColor="#1E293B" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>

          <linearGradient id="goldTraces" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#EAB308" stopOpacity="0.5" />
            <stop offset="1" stopColor="#CA8A04" stopOpacity="0.2" />
          </linearGradient>

          <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="targetPulse" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#06B6D4" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* 1. PCB Base */}
        <rect x="20" y="20" width="860" height="640" rx="16" fill="url(#pcbBg)" stroke="#1E293B" strokeWidth="4" />

        {/* Furos de Parafuso com anel de aterramento */}
        {[
          { cx: 50, cy: 50 },
          { cx: 450, cy: 50 },
          { cx: 850, cy: 50 },
          { cx: 50, cy: 340 },
          { cx: 450, cy: 340 },
          { cx: 850, cy: 340 },
          { cx: 50, cy: 630 },
          { cx: 450, cy: 630 },
          { cx: 850, cy: 630 },
        ].map((hole, idx) => (
          <g key={idx}>
            <circle cx={hole.cx} cy={hole.cy} r="14" fill="#EAB308" fillOpacity="0.25" stroke="#CA8A04" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={hole.cx} cy={hole.cy} r="6" fill="#0F172A" stroke="#475569" strokeWidth="2" />
            {assembly.standoffsInstalled && (
              <circle cx={hole.cx} cy={hole.cy} r="4" fill="#F59E0B" />
            )}
            {assembly.motherboardScrewed && (
              <circle cx={hole.cx} cy={hole.cy} r="5" fill="#94A3B8" stroke="#0F172A" strokeWidth="1" />
            )}
          </g>
        ))}

        {/* Trilhas decorativas douradas */}
        <path d="M 50 120 L 220 120 L 260 160 L 260 280" stroke="url(#goldTraces)" strokeWidth="2" strokeDasharray="6 4" />
        <path d="M 440 80 L 440 180 L 520 220" stroke="url(#goldTraces)" strokeWidth="2" />
        <path d="M 680 500 L 780 500 L 820 460" stroke="url(#goldTraces)" strokeWidth="2" />

        {/* Painel de I/O traseiro (portas que ficam para fora do gabinete) */}
        <g>
          <rect x="22" y="62" width="30" height="236" rx="3" fill="url(#hw-alu)" stroke="#94A3B8" strokeWidth="1" />
          {[74, 96, 118, 140].map((y) => (
            <rect key={y} x="27" y={y} width="20" height="14" rx="1.5" fill="#1D4ED8" stroke="#0F172A" />
          ))}
          <rect x="27" y="166" width="20" height="22" rx="2" fill="#0F172A" stroke="#475569" />
          <rect x="27" y="196" width="20" height="16" rx="2" fill="#0F172A" stroke="#475569" />
          {[228, 246, 264, 282].map((y, i) => (
            <circle key={y} cx="37" cy={y} r="6" fill={['#22C55E', '#EC4899', '#38BDF8', '#F97316'][i]} stroke="#0F172A" strokeWidth="2" />
          ))}
        </g>

        {/* Dissipador do VRM (Fases de Energia) */}
        <rect x="60" y="80" width="140" height="200" rx="8" fill="url(#heatsinkMetal)" stroke="#334155" strokeWidth="2" />
        <text x="130" y="180" fill="#64748B" fontSize="12" fontWeight="bold" textAnchor="middle" letterSpacing="2">VRM HEATSINK</text>
        {[100, 130, 160, 190, 220, 250].map((y) => (
          <line key={y} x1="75" y1={y} x2="185" y2={y} stroke="#475569" strokeWidth="2" />
        ))}
        {/* Bobinas (chokes) das fases de energia ao lado do soquete */}
        {[96, 126, 156, 186, 216, 246].map((y) => (
          <g key={y}>
            <rect x="207" y={y} width="22" height="22" rx="3" fill="#1F2937" stroke="#4B5563" />
            <text x="218" y={y + 14} fill="#9CA3AF" fontSize="6.5" fontWeight="700" textAnchor="middle">R22</text>
          </g>
        ))}

        {/* Conector EPS 12V da CPU (ATX12V, 8 pinos) */}
        <BoardHeader targetId="ATX12V" x={70} y={30} w={64} h={32} rows={2} cols={4} labelPos="right" wires="up" />

        {/* Conector da ventoinha do processador */}
        <BoardHeader targetId="CPU_FAN" x={362} y={46} w={42} h={14} rows={1} cols={4} labelPos="right" wires="up" wireCount={3} />

        {/* Conector de ventoinha do gabinete */}
        <BoardHeader targetId="SYS_FAN" x={640} y={46} w={42} h={14} rows={1} cols={4} labelPos="right" wires="up" wireCount={3} />

        {/* Remover Cooler (necessário para reaplicar pasta térmica) */}
        {assembly.coolerInstalled && (
          <g
            className={`cursor-pointer transition-transform hover:scale-105 ${SVG_FOCUS_RING}`}
            onClick={removeCooler}
            {...pressableProps(`Remover cooler ${assembly.coolerInstalled.name}`, removeCooler)}
          >
            <rect x="240" y="45" width="110" height="20" rx="3" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="295" y="59" fill="#FBBF24" fontSize="9" fontWeight="bold" textAnchor="middle">
              REMOVER COOLER
            </text>
          </g>
        )}

        {/* 2. SOQUETE DA CPU (LGA1700 / AM5) */}
        <g
          className={`cursor-pointer transition-all ${SVG_FOCUS_RING}`}
          onClick={handleCpuAreaClick}
          {...pressableProps(
            isCpuTarget
              ? 'Soquete da CPU: encaixar processador'
              : isPasteTarget
              ? 'Soquete da CPU: aplicar pasta térmica'
              : isCoolerTarget
              ? 'Soquete da CPU: instalar cooler'
              : assembly.cpuInstalled
              ? `Soquete da CPU: ${assembly.cpuInstalled.name}, alavanca ${assembly.socketLeverLocked ? 'travada' : 'destravada'}`
              : 'Soquete da CPU vazio',
            handleCpuAreaClick,
            isCpuTarget || isPasteTarget || isCoolerTarget || Boolean(assembly.cpuInstalled && !assembly.coolerInstalled)
          )}
          filter={isCpuTarget || isPasteTarget || isCoolerTarget ? 'url(#targetPulse)' : undefined}
        >
          {/* Base do Soquete */}
          <rect
            x="240"
            y="90"
            width="200"
            height="210"
            rx="12"
            fill="#1E293B"
            stroke={isCpuTarget || isPasteTarget || isCoolerTarget ? '#06B6D4' : '#475569'}
            strokeWidth={isCpuTarget || isPasteTarget || isCoolerTarget ? 4 : 2}
          />
          <text x="340" y="115" fill="#94A3B8" fontSize="12" fontWeight="bold" textAnchor="middle">
            SOQUETE {selectedMotherboard.socket}
          </text>

          {/* Triângulo Dourado Indicador de Orientação no Canto */}
          <polygon points="252,102 268,102 252,118" fill="#F59E0B" />

          {/* Área de Pinos do Soquete ou CPU instalada */}
          {!assembly.cpuInstalled ? (
            <g>
              <rect x="260" y="125" width="160" height="160" rx="4" fill="#0F172A" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="4 2" />
              <text x="340" y="195" fill="#F59E0B" fontSize="12" fontWeight="black" textAnchor="middle">
                [ENCAIXAR CPU AQUI]
              </text>
              <text x="340" y="215" fill="#94A3B8" fontSize="9" textAnchor="middle">
                Alinhe o triângulo dourado
              </text>
            </g>
          ) : (
            <g>
              {/* CPU instalada desenhada com a mesma ilustração do inventário */}
              <HardwareImage component={assembly.cpuInstalled} svgProps={{ x: 252, y: 117, width: 176, height: 176 }} />

              {/* Camada de Pasta Térmica */}
              {assembly.thermalPasteApplied && !assembly.coolerInstalled && (
                <g>
                  <circle cx="340" cy="215" r="26" fill="#64748B" opacity="0.95" stroke="#CBD5E1" strokeWidth="2" />
                  <text x="340" y="219" fill="#F8FAFC" fontSize="9" fontWeight="bold" textAnchor="middle">PASTA APLICADA</text>
                </g>
              )}
            </g>
          )}

          {/* Alavanca de Retenção Metálica (Socket Lever) */}
          <g
            className={SVG_FOCUS_RING}
            onClick={(e) => { e.stopPropagation(); toggleSocketLever(); }}
            {...pressableProps(
              `Alavanca do soquete: ${assembly.socketLeverLocked ? 'travada, pressione para destravar' : 'destravada, pressione para travar'}`,
              toggleSocketLever
            )}
          >
            <line
              x1="445"
              y1={assembly.socketLeverLocked ? "290" : "110"}
              x2="455"
              y2={assembly.socketLeverLocked ? "290" : "110"}
              stroke="#CBD5E1"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <rect
              x="442"
              y={assembly.socketLeverLocked ? "105" : "90"}
              width="8"
              height="185"
              rx="4"
              fill={assembly.socketLeverLocked ? "#10B981" : "#F59E0B"}
            />
            <text x="440" y="317" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="end">
              {assembly.socketLeverLocked ? 'ALAVANCA: TRAVADA [OK]' : 'CLIQUE: TRAVAR ALAVANCA'}
            </text>
          </g>

          {/* Cooler Instalado por cima */}
          {assembly.coolerInstalled && (
            <g className="transition-all">
              <rect x="235" y="85" width="210" height="220" rx="16" fill="#1E293B" opacity="0.95" stroke="#38BDF8" strokeWidth="3" />
              <circle cx="340" cy="195" r="70" fill="#0F172A" stroke="#0284C7" strokeWidth="2" />
              <circle cx="340" cy="195" r="22" fill="#38BDF8" />
              <text x="340" y="199" fill="#0F172A" fontSize="9" fontWeight="bold" textAnchor="middle">FAN</text>

              {/* Pás da ventoinha girando se o PC ligou */}
              <g className={isPowerOn ? 'animate-spin origin-center' : ''} style={{ transformOrigin: '340px 195px' }}>
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <ellipse key={angle} cx="340" cy="155" rx="10" ry="24" fill="#64748B" transform={`rotate(${angle} 340 195)`} />
                ))}
              </g>
            </g>
          )}
        </g>

        {/* 3. SLOTS DE MEMÓRIA RAM (4 Slots) */}
        <g filter={isRamTarget ? 'url(#targetPulse)' : undefined}>
          <text x="560" y="80" fill={isRamTarget ? '#06B6D4' : '#94A3B8'} fontSize="12" fontWeight="bold" letterSpacing="1">
            SLOTS DE MEMÓRIA ({selectedMotherboard.supportedRam})
          </text>

          {[
            { id: 1, x: 480, isDual: false, installed: null },
            { id: 2, x: 520, isDual: true, installed: assembly.ramInstalledSlot2 },
            { id: 3, x: 560, isDual: false, installed: null },
            { id: 4, x: 600, isDual: true, installed: assembly.ramInstalledSlot4 },
          ].map((slot) => (
            <g
              key={slot.id}
              className={`cursor-pointer transition-transform hover:scale-102 ${SVG_FOCUS_RING}`}
              onClick={() => handleRamSlotClick(slot.id)}
              {...pressableProps(
                `Slot de memória ${slot.id}: ${slot.installed ? slot.installed.name : isRamTarget ? 'vazio, pressione para encaixar o pente' : 'vazio'}`,
                () => handleRamSlotClick(slot.id),
                slot.isDual
              )}
            >
              <rect
                x={slot.x}
                y="95"
                width="28"
                height="215"
                rx="4"
                fill={slot.installed ? 'url(#hw-alu-dark)' : '#0F172A'}
                stroke={slot.isDual ? (isRamTarget ? '#22C55E' : '#06B6D4') : '#334155'}
                strokeWidth={slot.isDual ? (isRamTarget ? 3 : 2) : 1}
              />

              {/* Pente instalado: dissipador escuro, faixa da geração e LEDs só se o kit for RGB */}
              {slot.installed && (
                <>
                  <rect x={slot.x + 21} y="100" width="3" height="205" rx="1.5" fill={slot.installed.ramType === 'DDR5' ? '#22D3EE' : '#F59E0B'} />
                  {/rgb/i.test(slot.installed.name) && <rect x={slot.x + 3} y="100" width="4" height="205" rx="2" fill="url(#hw-rgb)" />}
                </>
              )}

              <rect x={slot.x} y="200" width="28" height="6" fill="#1E293B" />
              <rect x={slot.x + 4} y="90" width="20" height="8" rx="2" fill={slot.installed ? '#10B981' : '#64748B'} />
              <rect x={slot.x + 4} y="307" width="20" height="8" rx="2" fill={slot.installed ? '#10B981' : '#64748B'} />

              {slot.installed ? (
                <text
                  x={slot.x + 14}
                  y="240"
                  fill="#F8FAFC"
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 ${slot.x + 14} 240)`}
                >
                  {slot.installed.capacityGb / slot.installed.moduleCount}GB {slot.installed.ramType}
                </text>
              ) : (
                <text
                  x={slot.x + 14}
                  y="160"
                  fill={slot.isDual ? '#06B6D4' : '#64748B'}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  transform={`rotate(-90 ${slot.x + 14} 160)`}
                >
                  SLOT {slot.id} {slot.isDual && '★ DUAL'}
                </text>
              )}
            </g>
          ))}
        </g>

        {/* Conector principal ATX de 24 pinos (lado direito) */}
        <BoardHeader targetId="ATX_PWR" x={662} y={110} w={46} h={184} rows={12} cols={2} wires="right" wireCount={8} />

        {/* Cabeçalho USB 3.0 de 19 pinos (o 20º é a chave) */}
        <BoardHeader targetId="USB3_HEADER" x={772} y={176} w={28} h={104} rows={10} cols={2} missing={[19]} shroud="#1E3A8A" wires="right" wireCount={2} />

        {/* Bateria CMOS: mantém o relógio e as configurações da BIOS */}
        <g>
          <circle cx="722" cy="384" r="22" fill="url(#hw-alu)" stroke="#CBD5E1" strokeWidth="1.5" />
          <circle cx="722" cy="384" r="15" stroke="#94A3B8" strokeWidth="1" />
          <text x="722" y="388" fill="#334155" fontSize="9" fontWeight="800" textAnchor="middle">CR2032</text>
        </g>

        {/* Portas SATA de dados */}
        <BoardHeader targetId="SATA_PORT" variant="sata" x={804} y={372} w={54} h={100} rows={4} cols={1} labelPos="below" wires="right" wireCount={2} />

        {/* Dissipador do chipset */}
        <g>
          <rect x="640" y="474" width="82" height="70" rx="6" fill="url(#heatsinkMetal)" stroke="#475569" strokeWidth="1.5" />
          {[488, 500, 512, 524].map((y) => (
            <line key={y} x1="648" y1={y} x2="714" y2={y} stroke="#334155" strokeWidth="2" />
          ))}
          <text x="681" y="538" fill="#94A3B8" fontSize="10" fontWeight="800" textAnchor="middle">{selectedMotherboard.chipset}</text>
        </g>

        {/* 4. SLOT M.2 NVMe (Abaixo do Soquete) */}
        <g
          className={`cursor-pointer transition-transform hover:scale-102 ${SVG_FOCUS_RING}`}
          onClick={handleM2SlotClick}
          {...pressableProps(
            `Slot M.2 NVMe: ${m2Storage ? m2Storage.name : isStorageTarget ? 'vazio, pressione para fixar o SSD' : 'vazio'}`,
            handleM2SlotClick
          )}
          filter={isStorageTarget ? 'url(#targetPulse)' : undefined}
        >
          <rect
            x="240"
            y="330"
            width="220"
            height="46"
            rx="6"
            fill="#1E293B"
            stroke={isStorageTarget ? '#06B6D4' : m2Storage ? '#14B8A6' : '#475569'}
            strokeWidth={isStorageTarget ? 3 : 2}
          />
          {m2Storage ? (
            <HardwareImage component={m2Storage} svgProps={{ x: 246, y: 330, width: 192, height: 46 }} />
          ) : (
            <text x="350" y="358" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
              {isStorageTarget ? 'CLIQUE P/ ENCAIXAR SSD M.2' : 'SLOT M.2 NVMe (PCIe 4.0 x4)'}
            </text>
          )}
          <circle cx="445" cy="353" r="6" fill="#94A3B8" stroke="#334155" strokeWidth="1.5" />
        </g>

        {/* 5. SLOTS PCIe x16 (Placa de Vídeo) */}
        <g
          className={`cursor-pointer transition-transform hover:scale-102 ${SVG_FOCUS_RING}`}
          onClick={handlePcieSlotClick}
          {...pressableProps(
            `Slot PCIe x16: ${assembly.gpuInstalled ? assembly.gpuInstalled.name : isGpuTarget ? 'vazio, pressione para encaixar a placa de vídeo' : 'vazio'}`,
            handlePcieSlotClick
          )}
          filter={isGpuTarget ? 'url(#targetPulse)' : undefined}
        >
          <rect
            x="80"
            y="410"
            width="580"
            height="34"
            rx="4"
            fill="#0F172A"
            stroke={isGpuTarget ? '#06B6D4' : assembly.gpuInstalled ? '#38BDF8' : '#64748B'}
            strokeWidth={isGpuTarget ? 3 : 2}
          />
          <line x1="160" y1="410" x2="160" y2="444" stroke="#334155" strokeWidth="2" />
          {!assembly.gpuInstalled && (
            <text x="370" y="432" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle">
              {isGpuTarget ? 'CLIQUE P/ ENCAIXAR PLACA DE VÍDEO' : 'SLOT PCIe 4.0 x16 (PLACA DE VÍDEO)'}
            </text>
          )}
          <rect x="662" y="414" width="16" height="26" rx="3" fill={assembly.gpuInstalled ? '#10B981' : '#F59E0B'} />
          {/* GPU instalada em escala real (1,6 px por mm): placas longas cobrem mais da placa-mãe */}
          {assembly.gpuInstalled && (
            <HardwareImage
              component={assembly.gpuInstalled}
              svgProps={{ x: 56, y: 384, width: 544, height: 208, preserveAspectRatio: 'xMinYMin meet', className: 'drop-shadow-2xl' }}
            />
          )}
        </g>

        {/* Entrada de energia da GPU (no topo da placa de vídeo, na mesma escala da ilustração) */}
        {assembly.gpuInstalled && assembly.gpuInstalled.powerPins !== 'none' && (
          <BoardHeader
            targetId="GPU_POWER"
            x={GPU_ART.x + (assembly.gpuInstalled.lengthMm - 24) * GPU_ART.scale}
            y={GPU_ART.y + 2}
            w={48}
            h={16}
            rows={2}
            cols={4}
            labelPos="left"
            label="PCIe 8P"
            wires="up"
          />
        )}

        {/* 6. DEBUG LEDs (Canto Superior Direito) */}
        <g>
          <rect x="750" y="35" width="115" height="110" rx="8" fill="#0F172A" stroke="#334155" strokeWidth="2" />
          <text x="807" y="55" fill="#94A3B8" fontSize="11" fontWeight="bold" textAnchor="middle">DEBUG LEDs</text>

          {[
            { label: 'CPU', y: 72, state: postResult?.debugLed.cpu || 'OFF' },
            { label: 'DRAM', y: 90, state: postResult?.debugLed.dram || 'OFF' },
            { label: 'VGA', y: 108, state: postResult?.debugLed.vga || 'OFF' },
            { label: 'BOOT', y: 126, state: postResult?.debugLed.boot || 'OFF' },
          ].map((led) => {
            const fillColor = led.state === 'GREEN' ? '#10B981' : led.state === 'RED' ? '#EF4444' : '#334155';
            const filterUrl = led.state === 'GREEN' ? 'url(#glowGreen)' : led.state === 'RED' ? 'url(#glowRed)' : undefined;
            return (
              <g key={led.label}>
                <circle cx="770" cy={led.y} r="5" fill={fillColor} filter={filterUrl} />
                <text x="785" y={led.y + 4} fill="#E2E8F0" fontSize="10" fontWeight="bold">{led.label}</text>
                <text x="830" y={led.y + 4} fill={fillColor} fontSize="9" fontWeight="bold">
                  {led.state === 'OFF' ? '—' : led.state}
                </text>
              </g>
            );
          })}
        </g>

        {/* Fileira inferior: cabeçalhos que recebem os cabos frontais do gabinete */}
        <BoardHeader targetId="HD_AUDIO" x={80} y={606} w={62} h={26} rows={2} cols={5} missing={[8]} wires="down" />
        <g>
          <rect x="164" y="608" width="24" height="24" rx="2" fill="#111827" stroke="#374151" />
          <text x="176" y="623" fill="#9CA3AF" fontSize="6" fontWeight="800" textAnchor="middle">ALC897</text>
        </g>
        <BoardHeader targetId="USB2_HEADER" x={250} y={606} w={62} h={26} rows={2} cols={5} missing={[9]} wires="down" />
        <g>
          <rect x="336" y="612" width="22" height="16" rx="1.5" fill="#111827" stroke="#374151" />
          <text x="347" y="623" fill="#9CA3AF" fontSize="5.5" fontWeight="800" textAnchor="middle">BIOS</text>
        </g>

        {/* Painel frontal (F_PANEL): abre o minigame de precisão dos 9 pinos */}
        <g
          role="button"
          tabIndex={0}
          aria-label={`F_PANEL: painel frontal, ${Object.values(fPanelConnections).filter(Boolean).length} de 4 fios ligados. Abrir minigame.`}
          onClick={openFrontPanelModal}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openFrontPanelModal();
            }
          }}
          className="cursor-pointer outline-none [&:focus-visible>.focus-ring]:opacity-100"
        >
          <rect className="focus-ring opacity-0" x="693" y="599" width="76" height="40" rx="6" stroke="#22D3EE" strokeWidth="2" />
          <rect
            x="700"
            y="606"
            width="62"
            height="26"
            rx="2.5"
            fill="#0B1220"
            stroke={assembly.frontPanelPowerSwConnected ? '#10B981' : '#F59E0B'}
            strokeWidth="1.5"
          />
          {[...Array(10)].map((_, i) => {
            if (i === 9) return null;
            const col = i % 5;
            const row = Math.floor(i / 5);
            return <rect key={i} x={706 + col * 11.2} y={611 + row * 9} width="5" height="5" rx="0.6" fill="url(#hw-gold)" />;
          })}
          {/* Fios finos já encaixados pelo minigame */}
          {Object.values(fPanelConnections).filter(Boolean).length > 0 && (
            <rect x="698" y="604" width="66" height="30" rx="3" fill="#0F172A" fillOpacity="0.55" stroke="#10B981" strokeWidth="1.2" />
          )}
          <text x="688" y="617" fill="#CBD5E1" fontSize="10" fontWeight="700" fontFamily="var(--font-mono)" textAnchor="end">
            F_PANEL
          </text>
          <text x="688" y="630" fill={assembly.frontPanelPowerSwConnected ? '#6EE7B7' : '#FBBF24'} fontSize="9" fontWeight="700" textAnchor="end">
            {Object.values(fPanelConnections).filter(Boolean).length}/4 fios · clique
          </text>
        </g>
      </svg>
    </div>
  );
};
