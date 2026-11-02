'use client';

import React, { useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import {
  FPANEL_PINS,
  FPANEL_CONNECTORS,
  FPanelConnectorId,
  FPanelConnector,
} from '@/engine/frontPanel';
import {
  X,
  Maximize2,
  CheckCircle2,
  Sparkles,
  RotateCw,
  Power,
  RotateCcw,
  Activity,
  Zap,
} from 'lucide-react';

export const FrontPanelZoomModal: React.FC = () => {
  const {
    isFrontPanelModalOpen,
    closeFrontPanelModal,
    fPanelConnections,
    connectFPanelJumper,
    disconnectFPanelJumper,
  } = useAssemblyStore();

  const [selectedConnectorId, setSelectedConnectorId] = useState<FPanelConnectorId | null>('POWER_SW');
  const [isInvertedPolarity, setIsInvertedPolarity] = useState(false);

  if (!isFrontPanelModalOpen) return null;

  const selectedConnector = FPANEL_CONNECTORS.find((c) => c.id === selectedConnectorId) || null;

  // Conta quantos já foram conectados com sucesso
  const connectedCount = Object.values(fPanelConnections).filter(Boolean).length;
  const isComplete = connectedCount === 4;

  const handlePinPairClick = (pin1: number, pin2: number) => {
    if (!selectedConnectorId) return;

    const pinsToTry: [number, number] = isInvertedPolarity ? [pin2, pin1] : [pin1, pin2];
    const res = connectFPanelJumper(selectedConnectorId, pinsToTry);

    if (res.success) {
      // Avança automaticamente para o próximo conector não plugado
      const remaining = FPANEL_CONNECTORS.find((c) => !fPanelConnections[c.id]);
      if (remaining) {
        setSelectedConnectorId(remaining.id);
        setIsInvertedPolarity(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-950 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl overflow-hidden select-none">
        {/* Cabeçalho do Modal de Precisão */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Zoom Óptico 300%
                </span>
                <span className="text-xs text-slate-400">
                  Cabeçalho F_PANEL (Painel Frontal do Gabinete)
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                Alinhamento de Precisão dos 9 Pinos da Placa-Mãe
              </h2>
            </div>
          </div>

          <button
            onClick={closeFrontPanelModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banner Didático de Status */}
        <div className="mb-4">
          {isComplete ? (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold">
                  🎉 Todos os 4 conectores estão plugados com 100% de precisão! O botão de ligar e os LEDs do gabinete funcionarão perfeitamente.
                </span>
              </div>
              <button
                onClick={closeFrontPanelModal}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md"
              >
                Concluir
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <span>
                💡 <strong className="text-white">Dica Pedagógica:</strong> Botões de pulso (Power/Reset) não têm polaridade. LEDs de atividade (HDD/Power) exigem o polo positivo (+) no pino indicado pelo &quot;+&quot;.
              </span>
              <span className="font-mono text-cyan-400 font-bold shrink-0 ml-4">
                {connectedCount}/4 Conectados
              </span>
            </div>
          )}
        </div>

        {/* Área Central: Conectores do Gabinete e Visualização Zoom dos Pinos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Coluna 1: Gaveta de Cabos do Gabinete */}
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Cabos Finos do Gabinete:
            </div>

            <div className="space-y-2">
              {FPANEL_CONNECTORS.map((conn) => {
                const isPlugged = Boolean(fPanelConnections[conn.id]);
                const isSelected = selectedConnectorId === conn.id;

                return (
                  <div
                    key={conn.id}
                    onClick={() => {
                      setSelectedConnectorId(conn.id);
                      setIsInvertedPolarity(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30 text-white shadow-md'
                        : isPlugged
                        ? 'bg-slate-900/60 border-emerald-800/60 text-slate-300'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full border border-slate-700"
                        style={{ backgroundColor: conn.wireColor }}
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{conn.name}</span>
                          {isPlugged && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {conn.isPolaritySensitive ? 'Exige Polaridade (+/-)' : 'Sem Polaridade'}
                        </div>
                      </div>
                    </div>

                    {isPlugged && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          disconnectFPanelJumper(conn.id);
                        }}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-mono px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
                        title="Desconectar do pino"
                      >
                        Soltar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Controle de Inversão de Polaridade para LEDs */}
            {selectedConnector?.isPolaritySensitive && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Polaridade em Mãos:</span>
                  <span className="font-mono font-bold text-cyan-300">
                    {isInvertedPolarity ? '[-] Negativo Primeiro' : '[+] Positivo Primeiro'}
                  </span>
                </div>
                <button
                  onClick={() => setIsInvertedPolarity(!isInvertedPolarity)}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inverter Polaridade do Conector</span>
                </button>
              </div>
            )}
          </div>

          {/* Coluna 2 e 3: Cabeçalho F_PANEL com os Pinos Dourados */}
          <div className="md:col-span-2 flex flex-col items-center justify-center p-6 bg-slate-900/90 rounded-2xl border-2 border-slate-800 relative">
            <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-4">
              PLACA-MÃE PCB • CABEÇALHO F_PANEL
            </div>

            {/* Simulação dos Pinos e Serigrafia Branca */}
            <div className="relative p-8 rounded-2xl bg-[#0b1329] border border-cyan-900 shadow-inner w-full max-w-lg">
              {/* Serigrafia Branca da Placa */}
              <div className="flex justify-between text-[11px] font-mono text-slate-400 font-bold mb-4 px-2">
                <span className="text-emerald-400">+P_LED-</span>
                <span className="text-red-400">POWER_SW</span>
                <span className="text-slate-600">[KEY]</span>
              </div>

              {/* Matriz 2x5 dos 10 Pinos */}
              <div className="grid grid-rows-2 gap-8 my-4">
                {/* Linha Superior (Pinos Ímpares: 1, 3, 5, 7, 9) */}
                <div className="grid grid-cols-5 gap-4">
                  {[1, 3, 5, 7, 9].map((pinId) => {
                    const pin = FPANEL_PINS.find((p) => p.id === pinId)!;
                    return (
                      <div key={pinId} className="flex flex-col items-center gap-2">
                        {pin.isKeyOrNc ? (
                          // Pino ausente (KEY)
                          <div
                            className="w-8 h-8 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-600"
                            title="Pino Ausente (Chave Guia)"
                          >
                            X
                          </div>
                        ) : (
                          // Pino dourado saliente
                          <div
                            className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-amber-200 shadow-md shadow-amber-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 cursor-pointer hover:scale-110 transition-transform"
                            title={`${pin.name} (Pino ${pin.id})`}
                          >
                            {pin.id}
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-slate-400 font-bold">
                          {pin.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Linha Inferior (Pinos Pares: 2, 4, 6, 8, 10) */}
                <div className="grid grid-cols-5 gap-4">
                  {[2, 4, 6, 8, 10].map((pinId) => {
                    const pin = FPANEL_PINS.find((p) => p.id === pinId)!;
                    return (
                      <div key={pinId} className="flex flex-col items-center gap-2">
                        {pin.isKeyOrNc ? (
                          <div
                            className="w-8 h-8 rounded-full border border-dashed border-slate-800 flex items-center justify-center text-[9px] font-mono text-slate-700"
                            title="Sem Conexão"
                          >
                            NC
                          </div>
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-amber-200 shadow-md shadow-amber-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-slate-950 cursor-pointer hover:scale-110 transition-transform"
                            title={`${pin.name} (Pino ${pin.id})`}
                          >
                            {pin.id}
                          </div>
                        )}
                        <span className="text-[9px] font-mono text-slate-400 font-bold">
                          {pin.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Serigrafia Inferior */}
              <div className="flex justify-between text-[11px] font-mono text-slate-400 font-bold mt-4 px-2">
                <span className="text-orange-400">+HDD_LED-</span>
                <span className="text-blue-400">RESET_SW</span>
                <span className="text-slate-600">[NC]</span>
              </div>
            </div>

            {/* Botões de Ação de Encaixe Direto dos Jumpers */}
            <div className="mt-6 w-full max-w-lg space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 text-center font-bold">
                Encaixar {selectedConnector?.name} no Par de Pinos:
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePinPairClick(1, 3)}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Pinos [1, 3] (+P_LED-)
                </button>
                <button
                  onClick={() => handlePinPairClick(5, 7)}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Pinos [5, 7] (POWER_SW)
                </button>
                <button
                  onClick={() => handlePinPairClick(2, 4)}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-orange-500 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Pinos [2, 4] (+HDD_LED-)
                </button>
                <button
                  onClick={() => handlePinPairClick(6, 8)}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500 hover:bg-slate-800 text-xs font-mono font-bold text-slate-300 transition-all cursor-pointer"
                >
                  Pinos [6, 8] (RESET_SW)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

