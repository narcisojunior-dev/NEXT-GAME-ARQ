'use client';

import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { MotherboardComponent } from '@/engine/types';
import { Cpu, Zap, HardDrive, Fan, AlertTriangle, CheckCircle2, ArrowDown, CircuitBoard, RefreshCw } from 'lucide-react';

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
    connectCoolerFan,
    installRam,
    installStorage,
    installGpu,
    connectCable,
    openFrontPanelModal,
  } = useAssemblyStore();

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

  const handleRamSlotClick = (slot: 2 | 4) => {
    if (selectedComponentForPlacement?.category === 'RAM') {
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

  // Indicadores de onde clicar com base na peça selecionada
  const isCpuTarget = selectedComponentForPlacement?.category === 'CPU';
  const isPasteTarget = selectedComponentForPlacement?.category === 'PASTE';
  const isCoolerTarget = selectedComponentForPlacement?.category === 'COOLER';
  const isRamTarget = selectedComponentForPlacement?.category === 'RAM';
  const isStorageTarget = selectedComponentForPlacement?.category === 'STORAGE';
  const isGpuTarget = selectedComponentForPlacement?.category === 'GPU';

  if (!selectedMotherboard) {
    const isMbInHand = selectedComponentForPlacement?.category === 'MOTHERBOARD';
    return (
      <div
        onClick={() => {
          if (isMbInHand) {
            installMotherboard(selectedComponentForPlacement as MotherboardComponent);
          }
        }}
        className={`relative w-full aspect-4/3 max-w-4xl mx-auto rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center p-8 text-center cursor-pointer select-none overflow-hidden ${
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
              👉 CLIQUE AQUI PARA POSICIONAR {selectedComponentForPlacement.name.toUpperCase()} NA BANCADA!
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
        <span className="font-mono text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
          {selectedMotherboard.socket}
        </span>
        <span className="font-mono text-purple-300 bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
          {selectedMotherboard.supportedRam}
        </span>
        <button
          onClick={() => selectMotherboard(null)}
          title="Substituir Placa-Mãe por outro modelo"
          className="ml-1 text-slate-400 hover:text-white flex items-center gap-1 hover:bg-slate-800 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="text-[10px]">Trocar</span>
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

        {/* Dissipador do VRM (Fases de Energia) */}
        <rect x="60" y="80" width="140" height="200" rx="8" fill="url(#heatsinkMetal)" stroke="#334155" strokeWidth="2" />
        <text x="130" y="180" fill="#64748B" fontSize="12" fontWeight="bold" textAnchor="middle" letterSpacing="2">VRM HEATSINK</text>
        {[100, 130, 160, 190, 220, 250].map((y) => (
          <line key={y} x1="75" y1={y} x2="185" y2={y} stroke="#475569" strokeWidth="2" />
        ))}

        {/* Conector EPS 12V da CPU (8 pinos - Canto Superior Esquerdo) */}
        <g
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => connectCable('CPU8')}
        >
          <rect x="70" y="32" width="70" height="34" rx="4" fill="#0F172A" stroke={assembly.cableCpu8PinConnected ? '#10B981' : '#EAB308'} strokeWidth="2" />
          <text x="105" y="54" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="middle">
            {assembly.cableCpu8PinConnected ? 'CPU 8P [OK]' : 'CLIQUE: CABO CPU 8P'}
          </text>
        </g>

        {/* Conector do Fan da CPU (CPU_FAN) */}
        <g
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={connectCoolerFan}
        >
          <rect x="360" y="45" width="55" height="20" rx="3" fill="#1E293B" stroke={assembly.coolerFanConnected ? '#10B981' : '#64748B'} strokeWidth="1.5" />
          <text x="387" y="59" fill={assembly.coolerFanConnected ? '#10B981' : '#94A3B8'} fontSize="9" fontWeight="bold" textAnchor="middle">
            {assembly.coolerFanConnected ? 'FAN [OK]' : 'CPU_FAN'}
          </text>
        </g>

        {/* Remover Cooler (necessário para reaplicar pasta térmica) */}
        {assembly.coolerInstalled && (
          <g className="cursor-pointer transition-transform hover:scale-105" onClick={removeCooler}>
            <rect x="240" y="45" width="110" height="20" rx="3" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
            <text x="295" y="59" fill="#FBBF24" fontSize="9" fontWeight="bold" textAnchor="middle">
              REMOVER COOLER
            </text>
          </g>
        )}

        {/* 2. SOQUETE DA CPU (LGA1700 / AM5) */}
        <g
          className="cursor-pointer transition-all"
          onClick={handleCpuAreaClick}
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
              {/* Chapa Metálica IHS da CPU Instalada */}
              <rect x="258" y="123" width="164" height="164" rx="8" fill="#94A3B8" stroke="#CBD5E1" strokeWidth="2.5" />
              <polygon points="262,127 274,127 262,139" fill="#F59E0B" />
              <text x="340" y="175" fill="#0F172A" fontSize="11" fontWeight="bold" textAnchor="middle">
                {assembly.cpuInstalled.name}
              </text>
              <text x="340" y="195" fill="#334155" fontSize="10" textAnchor="middle">
                {assembly.cpuInstalled.cores} Cores / TDP {assembly.cpuInstalled.tdpWatts}W
              </text>

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
          <g onClick={(e) => { e.stopPropagation(); toggleSocketLever(); }}>
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
            <text x="475" y="200" fill="#E2E8F0" fontSize="10" fontWeight="bold">
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
              className="cursor-pointer transition-transform hover:scale-102"
              onClick={() => handleRamSlotClick(slot.id as 2 | 4)}
            >
              <rect
                x={slot.x}
                y="95"
                width="28"
                height="215"
                rx="4"
                fill={slot.installed ? '#0284C7' : '#0F172A'}
                stroke={slot.isDual ? (isRamTarget ? '#22C55E' : '#06B6D4') : '#334155'}
                strokeWidth={slot.isDual ? (isRamTarget ? 3 : 2) : 1}
              />

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
                  {slot.installed.capacityGb}GB {slot.installed.ramType} [OK]
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

        {/* Conector ATX 24 Pinos da Placa-Mãe (Lado Direito) */}
        <g
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={() => connectCable('ATX24')}
        >
          <rect
            x="660"
            y="110"
            width="50"
            height="180"
            rx="6"
            fill="#0F172A"
            stroke={assembly.cableAtx24PinConnected ? '#10B981' : '#EAB308'}
            strokeWidth="3"
          />
          <text
            x="685"
            y="200"
            fill={assembly.cableAtx24PinConnected ? '#10B981' : '#E2E8F0'}
            fontSize="11"
            fontWeight="bold"
            textAnchor="middle"
            transform="rotate(-90 685 200)"
          >
            {assembly.cableAtx24PinConnected ? 'ATX 24-PIN [CONECTADO]' : 'CLIQUE: LIGAR CABO 24 PINOS'}
          </text>
        </g>

        {/* 4. SLOT M.2 NVMe (Abaixo do Soquete) */}
        <g
          className="cursor-pointer transition-transform hover:scale-102"
          onClick={handleM2SlotClick}
          filter={isStorageTarget ? 'url(#targetPulse)' : undefined}
        >
          <rect
            x="240"
            y="330"
            width="220"
            height="46"
            rx="6"
            fill={assembly.storageInstalled ? '#0F766E' : '#1E293B'}
            stroke={isStorageTarget ? '#06B6D4' : assembly.storageInstalled ? '#14B8A6' : '#475569'}
            strokeWidth={isStorageTarget ? 3 : 2}
          />
          <text x="350" y="358" fill="#F8FAFC" fontSize="11" fontWeight="bold" textAnchor="middle">
            {assembly.storageInstalled ? `M.2 NVMe: ${assembly.storageInstalled.name}` : isStorageTarget ? '👉 CLIQUE P/ ENCAIXAR SSD M.2' : 'SLOT M.2 NVMe (PCIe 4.0 x4)'}
          </text>
          <circle cx="445" cy="353" r="6" fill="#94A3B8" stroke="#334155" strokeWidth="1.5" />
        </g>

        {/* 5. SLOTS PCIe x16 (Placa de Vídeo) */}
        <g
          className="cursor-pointer transition-transform hover:scale-102"
          onClick={handlePcieSlotClick}
          filter={isGpuTarget ? 'url(#targetPulse)' : undefined}
        >
          <rect
            x="80"
            y="410"
            width="580"
            height="34"
            rx="4"
            fill={assembly.gpuInstalled ? '#0284C7' : '#0F172A'}
            stroke={isGpuTarget ? '#06B6D4' : assembly.gpuInstalled ? '#38BDF8' : '#64748B'}
            strokeWidth={isGpuTarget ? 3 : 2}
          />
          <line x1="160" y1="410" x2="160" y2="444" stroke="#334155" strokeWidth="2" />
          <text x="370" y="432" fill="#F8FAFC" fontSize="12" fontWeight="bold" textAnchor="middle">
            {assembly.gpuInstalled ? `GPU: ${assembly.gpuInstalled.name} [OK]` : isGpuTarget ? '👉 CLIQUE P/ ENCAIXAR PLACA DE VÍDEO' : 'SLOT PCIe 4.0 x16 (PLACA DE VÍDEO)'}
          </text>
          <rect x="662" y="414" width="16" height="26" rx="3" fill={assembly.gpuInstalled ? '#10B981' : '#F59E0B'} />
        </g>

        {/* Cabo PCIe da GPU (se instalada) */}
        {assembly.gpuInstalled && assembly.gpuInstalled.powerPins !== 'none' && (
          <g
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => connectCable('GPU_PCIE')}
          >
            <rect x="520" y="455" width="140" height="28" rx="4" fill="#0F172A" stroke={assembly.cableGpuPcieConnected ? '#10B981' : '#EAB308'} strokeWidth="2" />
            <text x="590" y="473" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="middle">
              {assembly.cableGpuPcieConnected ? 'CABO PCIe 8P [OK]' : 'CLIQUE: LIGAR CABO PCIe (8P)'}
            </text>
          </g>
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

        {/* 7. PAINEL FRONTAL (Front Panel Header - Canto Inferior Direito com Zoom de Precisão) */}
        <g
          className="cursor-pointer transition-transform hover:scale-105"
          onClick={openFrontPanelModal}
        >
          <rect
            x="680"
            y="560"
            width="180"
            height="70"
            rx="8"
            fill="#0F172A"
            stroke={assembly.frontPanelPowerSwConnected ? '#10B981' : '#EAB308'}
            strokeWidth="2"
          />
          <text x="770" y="582" fill="#94A3B8" fontSize="11" fontWeight="bold" textAnchor="middle">
            F_PANEL (PAINEL FRONTAL)
          </text>
          <text
            x="770"
            y="605"
            fill={assembly.frontPanelPowerSwConnected ? '#10B981' : '#F59E0B'}
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
          >
            {assembly.frontPanelPowerSwConnected
              ? 'POWER SW CONECTADO [OK]'
              : '🔍 CLIQUE P/ ZOOM 300% (9 PINOS)'}
          </text>
        </g>
      </svg>
    </div>
  );
};
