'use client';

import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { MotherboardSvg } from './MotherboardSvg';
import { CableTray } from './CableTray';
import { CableTargetBox } from './CableTargets';
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  RotateCcw,
  Layers,
  Wrench,
  CheckCircle2,
  ArrowDown,
  Maximize2,
  Server,
  HardDrive,
  Zap,
} from 'lucide-react';
import { HardwareComponent } from '@/engine/types';
import { HardwareImage } from '@/components/common/HardwareImage';
import dynamic from 'next/dynamic';
import { Box } from 'lucide-react';
import { isWebGLAvailable } from '@/components/three/webglDetect';

const Workbench3D = dynamic(() => import('@/components/three/Workbench3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[540px] rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center font-mono text-xs text-cyan-300">
      <div className="flex items-center gap-2">
        <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span>Carregando Bancada 3D…</span>
      </div>
    </div>
  ),
});

/** Miniatura do compartimento: mostra a peça instalada ou o ícone do encaixe vazio */
const SlotThumb: React.FC<{ component: HardwareComponent | null; icon: React.ReactNode }> = ({ component, icon }) => (
  <div className="w-14 h-14 shrink-0 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 text-slate-500">
    {component ? <HardwareImage component={component} className="w-full h-full" /> : icon}
  </div>
);

export const WorkbenchMat: React.FC = () => {
  const [is3DMode, setIs3DMode] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return isWebGLAvailable();
  });

  const {
    assembly,
    dischargeEsd,
    installIoShield,
    installStandoffs,
    installPsu,
    installCase,
    installStorage,
    cableConnections,
    screwMotherboard,
    togglePsuSwitch,
    triggerPostBoot,
    resetAssembly,
    openFrontPanelModal,
    selectedComponentForPlacement,
  } = useAssemblyStore();

  const handlePsuAreaClick = () => {
    if (selectedComponentForPlacement?.category === 'PSU') {
      installPsu(selectedComponentForPlacement as never);
    }
  };

  const handleCaseAreaClick = () => {
    if (selectedComponentForPlacement?.category === 'CASE') {
      installCase(selectedComponentForPlacement);
    }
  };

  const handleSataBayClick = () => {
    if (selectedComponentForPlacement?.category === 'STORAGE') {
      installStorage(selectedComponentForPlacement, 'SATA');
    }
  };

  const isPsuTarget = selectedComponentForPlacement?.category === 'PSU';
  const isCaseTarget = selectedComponentForPlacement?.category === 'CASE';
  const isSataTarget = selectedComponentForPlacement?.category === 'STORAGE';
  const sataStorage =
    assembly.storageInstalled && assembly.storageInstalled.storageType !== 'NVMe_M2' ? assembly.storageInstalled : null;

  return (
    <div className="relative w-full rounded-3xl bg-slate-900 border-2 border-slate-800 p-6 shadow-2xl overflow-hidden">
      {/* Grade Milimetrada do Tapete Antiestático */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Barra de Ações Rápidas de Bancada */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Descarga Estática (Fase 1) */}
          <button
            onClick={dischargeEsd}
            disabled={assembly.esdDischarged}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              assembly.esdDischarged
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-bounce'
            }`}
          >
            {assembly.esdDischarged ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>1. ESD Protegido [OK]</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>1. Toque para Descarregar Estática (ESD)</span>
              </>
            )}
          </button>

          {/* Espaçadores (Standoffs) */}
          <button
            onClick={installStandoffs}
            disabled={assembly.standoffsInstalled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.standoffsInstalled
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{assembly.standoffsInstalled ? 'Espaçadores Dourados [OK]' : 'Fixar Espaçadores de Latão'}</span>
          </button>

          {/* Espelho Traseiro */}
          <button
            onClick={installIoShield}
            disabled={assembly.ioShieldInstalled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.ioShieldInstalled
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{assembly.ioShieldInstalled ? 'Espelho I/O Traseiro [OK]' : 'Instalar Espelho Traseiro'}</span>
          </button>

          {/* Minigame Zoom F_PANEL (Painel Frontal) */}
          <button
            onClick={openFrontPanelModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.frontPanelPowerSwConnected
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 animate-pulse'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>{assembly.frontPanelPowerSwConnected ? 'Painel Frontal F_PANEL [OK]' : 'Ligar Painel Frontal (F_PANEL)'}</span>
          </button>
        </div>

        {/* Controles de Ligar e Resetar */}
        <div className="flex items-center gap-3">
          {/* Chave I/O da Fonte */}
          {assembly.psuInstalled && (
            <button
              onClick={togglePsuSwitch}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                assembly.psuSwitchOn
                  ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-700 text-rose-300 animate-pulse'
              }`}
            >
              <span>Chave Fonte:</span>
              <span className="font-mono">{assembly.psuSwitchOn ? '[I] LIGADA [OK]' : '[O] DESLIGADA'}</span>
            </button>
          )}

          {/* Botão de Ligar o PC (Momento do Boot / POST) */}
          <button
            onClick={triggerPostBoot}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>LIGAR O PC (TESTE DE BOOT)</span>
          </button>

          {/* Alternador 3D / 2D da Bancada */}
          <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-1 flex items-center gap-1">
            <button
              onClick={() => setIs3DMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                is3DMode
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Modo 3D da Bancada com placa-mãe interativa"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D</span>
            </button>
            <button
              onClick={() => setIs3DMode(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                !is3DMode
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Modo 2D Leve da Bancada (gráfico vetorial)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2D</span>
            </button>
          </div>

          <button
            onClick={resetAssembly}
            title="Reiniciar Montagem da Bancada"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área Central da Bancada: placa-mãe e, ao lado, a bandeja de cabos (fixa ao rolar a página) */}
      <div className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
        {is3DMode ? (
          <Workbench3D onToggle2D={() => setIs3DMode(false)} />
        ) : (
          <MotherboardSvg />
        )}
        <div className="xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
          <CableTray />
        </div>
      </div>

      {/* Área Inferior do Gabinete: Gabinete, Baia SATA, Compartimento da Fonte (PSU) e Fixações */}
      <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gabinete */}
        <div
          onClick={handleCaseAreaClick}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
            assembly.caseInstalled
              ? 'bg-slate-950/90 border-emerald-500/50 text-emerald-300 shadow-md'
              : isCaseTarget
              ? 'bg-cyan-950 border-cyan-400 animate-pulse text-cyan-200 ring-4 ring-cyan-400/30'
              : 'bg-slate-950/40 border-slate-800 border-dashed text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <SlotThumb component={assembly.caseInstalled} icon={<Server className="w-6 h-6" />} />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Gabinete</div>
              <div className="text-sm font-bold text-white">
                {assembly.caseInstalled
                  ? assembly.caseInstalled.name
                  : isCaseTarget
                  ? 'CLIQUE AQUI PARA PREPARAR O GABINETE!'
                  : 'Escolha um gabinete na aba Gabinete do inventário'}
              </div>
            </div>
          </div>
          {assembly.caseInstalled && (
            <div className="text-xs font-mono font-bold bg-emerald-950 px-2.5 py-1 rounded-md text-emerald-400 border border-emerald-800 text-right">
              GPU até {assembly.caseInstalled.maxGpuLengthMm}mm
            </div>
          )}
        </div>

        {/* Baia SATA (SSD 2,5" / HD 3,5") */}
        <div
          onClick={handleSataBayClick}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
            sataStorage
              ? 'bg-slate-950/90 border-emerald-500/50 text-emerald-300 shadow-md'
              : isSataTarget
              ? 'bg-cyan-950 border-cyan-400 animate-pulse text-cyan-200 ring-4 ring-cyan-400/30'
              : 'bg-slate-950/40 border-slate-800 border-dashed text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <SlotThumb component={sataStorage} icon={<HardDrive className="w-6 h-6" />} />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Baia SATA (SSD 2,5&quot; / HD 3,5&quot;)</div>
              <div className="text-sm font-bold text-white">
                {sataStorage
                  ? sataStorage.name
                  : isSataTarget
                  ? 'CLIQUE AQUI PARA FIXAR O DISCO NA BAIA!'
                  : 'SSDs SATA e HDs ficam aqui, ligados por cabo'}
              </div>
            </div>
          </div>
          {sataStorage && (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {/* Entrada de energia do disco: recebe o cabo SATA de 15 pinos da fonte */}
              <CableTargetBox targetId="DRIVE_POWER" title="Energia" hint="arraste o cabo da fonte" />
              <span className={`text-[11px] font-semibold ${cableConnections.SATA_DATA ? 'text-emerald-300' : 'text-slate-400'}`}>
                Dados: {cableConnections.SATA_DATA ? 'ligado na placa ✓' : 'porta SATA6G da placa'}
              </span>
            </div>
          )}
        </div>

        {/* Slot da Fonte de Alimentação */}
        <div
          onClick={handlePsuAreaClick}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
            assembly.psuInstalled
              ? 'bg-slate-950/90 border-emerald-500/50 text-emerald-300 shadow-md'
              : isPsuTarget
              ? 'bg-cyan-950 border-cyan-400 animate-pulse text-cyan-200 ring-4 ring-cyan-400/30'
              : 'bg-slate-950/40 border-slate-800 border-dashed text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <SlotThumb component={assembly.psuInstalled} icon={<Zap className="w-6 h-6" />} />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Compartimento da Fonte (PSU)
              </div>
              <div className="text-sm font-bold text-white">
                {assembly.psuInstalled
                  ? assembly.psuInstalled.name
                  : isPsuTarget
                  ? 'CLIQUE AQUI PARA ENCAIXAR A FONTE!'
                  : 'Clique para instalar Fonte de Alimentação'}
              </div>
            </div>
          </div>
          {assembly.psuInstalled && (
            <div className="text-xs font-mono font-bold bg-emerald-950 px-2.5 py-1 rounded-md text-emerald-400 border border-emerald-800">
              {assembly.psuInstalled.wattage}W [OK]
            </div>
          )}
        </div>

        {/* Parafusar Placa no Gabinete */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Fixação da Placa-Mãe no Gabinete
            </div>
            <div className="text-xs font-medium text-slate-300 mt-0.5">
              {assembly.motherboardScrewed
                ? 'Placa parafusada com segurança sobre os espaçadores'
                : 'Aperto em cruz com parafusos M3'}
            </div>
          </div>
          <button
            onClick={screwMotherboard}
            disabled={assembly.motherboardScrewed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.motherboardScrewed
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
            }`}
          >
            {assembly.motherboardScrewed ? 'Fixada [OK]' : 'Apertar Parafusos M3'}
          </button>
        </div>
      </div>
    </div>
  );
};
