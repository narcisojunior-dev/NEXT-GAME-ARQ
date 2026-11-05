'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AlertTriangle, Cable, CheckCircle2, Plug, Power } from 'lucide-react';
import { useAssemblyStore, selectCanPowerOnDesk, selectDeskStage, selectMonitorScreen } from '@/store/useAssemblyStore';
import {
  EXTERNAL_CABLES,
  EXTERNAL_CABLE_IDS,
  EXTERNAL_PORTS,
  ExternalCableId,
  getCableEndCandidates,
  getFixedCableEnd,
  getPortStatus,
  validateExternalCableConnection,
} from '@/engine/externalCabling';
import { pickCablePort, useDeskPlacementStore } from '@/components/three/deskPlacementStore';

const MONITOR_TONE: Record<string, string> = {
  NO_MONITOR: 'text-slate-400',
  OFF: 'text-slate-400',
  STANDBY: 'text-amber-300',
  NO_SIGNAL: 'text-amber-300',
  SIGNAL: 'text-emerald-300',
};

/** Escolha das pontas por botões: equivalente acessível aos pontos de conexão 3D */
const PortChooser: React.FC<{ cableId: ExternalCableId }> = ({ cableId }) => {
  const heldCable = useDeskPlacementStore((s) => s.heldCable);
  const { assembly, externalCabling, placedDeskItems } = useAssemblyStore(
    useShallow((s) => ({ assembly: s.assembly, externalCabling: s.externalCabling, placedDeskItems: s.deskSetup.placedDeskItems }))
  );
  if (!heldCable || heldCable.cableId !== cableId) return null;

  const fixedEnd = getFixedCableEnd(cableId);
  const candidates = getCableEndCandidates(cableId, heldCable.firstPort);
  const step = heldCable.firstPort ? 'Conectar em' : 'Primeira ponta';

  return (
    <div className="mt-2 rounded-lg border border-cyan-700/50 bg-cyan-950/20 p-2">
      <p className="text-[11px] font-mono text-cyan-200 mb-1.5">
        {heldCable.firstPort
          ? `Ponta escolhida: ${EXTERNAL_PORTS[heldCable.firstPort].name}. Agora escolha a outra ponta:`
          : 'Escolha uma das pontas do cabo:'}
      </p>
      <div className="flex flex-col gap-1">
        {candidates.map((port) => {
          const host = EXTERNAL_PORTS[port].hostSnapPoint;
          const hostMissing = host !== 'WALL' && !placedDeskItems[host];
          const status = getPortStatus(port, cableId, assembly, externalCabling);
          if (status.status === 'NOT_PRESENT') return null;
          const occupied = status.status === 'OCCUPIED';
          return (
            <button
              key={port}
              type="button"
              disabled={hostMissing}
              onClick={() => pickCablePort(port)}
              className="min-h-[36px] text-left px-2 rounded-md text-[11px] font-mono border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 cursor-pointer"
            >
              {step}: {EXTERNAL_PORTS[port].name}
              {occupied && <span className="text-amber-300"> — ocupada ({EXTERNAL_CABLES[status.occupiedBy].name})</span>}
              {hostMissing && <span className="text-slate-500"> — aparelho fora da mesa</span>}
            </button>
          );
        })}
        {heldCable.firstPort && heldCable.firstPort !== fixedEnd && (
          <button
            type="button"
            onClick={() => useDeskPlacementStore.getState().setFirstPort(null)}
            className="min-h-[32px] text-left px-2 rounded-md text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
          >
            Trocar a primeira ponta
          </button>
        )}
      </div>
    </div>
  );
};

export const DeskCablingPanel: React.FC = () => {
  const { connections, assembly, isPoweredOn, setDeskPower, disconnectExternalCable } = useAssemblyStore(
    useShallow((s) => ({
      connections: s.externalCabling.connections,
      assembly: s.assembly,
      isPoweredOn: s.deskSetup.isDeskPoweredOn,
      setDeskPower: s.setDeskPower,
      disconnectExternalCable: s.disconnectExternalCable,
    }))
  );
  const stage = useAssemblyStore(selectDeskStage);
  const power = useAssemblyStore(useShallow((s) => selectCanPowerOnDesk(s)));
  const monitor = useAssemblyStore(useShallow((s) => {
    const i = selectMonitorScreen(s);
    return { state: i.state, title: i.title, message: i.message };
  }));
  const heldCable = useDeskPlacementStore((s) => s.heldCable);
  const holdCable = useDeskPlacementStore((s) => s.holdCable);

  const requiredIds = EXTERNAL_CABLE_IDS.filter((id) => EXTERNAL_CABLES[id].isRequiredForBoot);
  const requiredDone = requiredIds.filter((id) => connections[id]).length;
  const postFailed = isPoweredOn && stage === 'READY_TO_BOOT';

  return (
    <section aria-label="Cabeamento externo e energia" className="flex flex-col gap-3">
      {/* Energia e monitor */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Power className="w-3.5 h-3.5 text-cyan-400" /> Energia da estação
          </h3>
          <button
            type="button"
            aria-pressed={isPoweredOn}
            disabled={!isPoweredOn && !power.allowed}
            onClick={() => setDeskPower(!isPoweredOn)}
            className={`min-h-[40px] px-3.5 rounded-lg text-[11px] font-mono font-bold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
              isPoweredOn ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isPoweredOn ? 'Desligar o PC' : 'Ligar o PC'}
          </button>
        </div>
        {!isPoweredOn && !power.allowed && power.message && (
          <p className="mt-1.5 text-[11px] leading-snug text-amber-300/90">{power.message}</p>
        )}
        <p role="status" aria-live="polite" className={`mt-2 text-[11px] leading-snug font-mono ${MONITOR_TONE[monitor.state]}`}>
          <b>Monitor: {monitor.title}.</b> {monitor.message}
        </p>
        {stage === 'RUNNING' && (
          <p className="mt-1 text-[11px] font-mono text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> AcademyOS em execução — estação montada com sucesso!
          </p>
        )}
        {postFailed && (
          <p className="mt-1 text-[11px] font-mono text-rose-300">O PC ligou, mas travou no POST: veja o erro na tela do monitor.</p>
        )}
      </div>

      {/* Cabos */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Cable className="w-3.5 h-3.5 text-cyan-400" /> Cabos externos
          </h3>
          <span className="text-[11px] font-mono text-cyan-300">
            {requiredDone}/{requiredIds.length} obrigatórios
          </span>
        </div>
        <ul className="mt-2 flex flex-col gap-2">
          {EXTERNAL_CABLE_IDS.map((id) => {
            const spec = EXTERNAL_CABLES[id];
            const conn = connections[id];
            const isHeld = heldCable?.cableId === id;
            const validation = conn ? validateExternalCableConnection(id, conn.sourcePort, conn.destPort, assembly) : null;
            const warning = validation && (!validation.allowed || !validation.isPedagogicallyValid) ? validation.title : null;
            return (
              <li key={id} className={`rounded-lg border p-2 ${isHeld ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-950/40'}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-2.5 h-2.5 rounded-full shrink-0" style={{ background: spec.color, boxShadow: '0 0 0 1px #475569' }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-slate-100">
                      {spec.name}
                      {spec.isRequiredForBoot && <span className="ml-1 font-mono text-cyan-500">• obrigatório</span>}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {conn ? (
                        <span className={warning ? 'text-amber-300' : 'text-emerald-300'}>
                          {warning ? <AlertTriangle className="inline w-3 h-3 mr-0.5" /> : <Plug className="inline w-3 h-3 mr-0.5" />}
                          {EXTERNAL_PORTS[conn.sourcePort].name} → {EXTERNAL_PORTS[conn.destPort].name}
                          {warning && ` — ${warning}`}
                        </span>
                      ) : (
                        'Desconectado'
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      aria-pressed={isHeld}
                      onClick={() => holdCable(isHeld ? null : id)}
                      className={`min-h-[32px] px-2.5 rounded-md text-[11px] font-mono font-bold cursor-pointer ${
                        isHeld ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-cyan-300'
                      }`}
                      aria-label={isHeld ? `Cancelar: soltar ${spec.name}` : `${conn ? 'Reconectar' : 'Conectar'} ${spec.name}`}
                    >
                      {isHeld ? 'Em mãos' : conn ? 'Mover' : 'Conectar'}
                    </button>
                    {conn && !isHeld && (
                      <button
                        type="button"
                        onClick={() => disconnectExternalCable(id)}
                        className="min-h-[28px] px-2 rounded-md text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                        aria-label={`Desconectar ${spec.name}`}
                      >
                        Desconectar
                      </button>
                    )}
                  </div>
                </div>
                <PortChooser cableId={id} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default DeskCablingPanel;
