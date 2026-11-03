'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAssemblyStore, selectDeskStage } from '@/store/useAssemblyStore';
import { DESK_SNAP_POINTS } from '@/engine/deskSetup';
import { EXTERNAL_CABLES } from '@/engine/externalCabling';
import { DeskStationScene } from './DeskStationScene';
import { useDeskPlacementStore } from './deskPlacementStore';
import { Eye, ArrowUpFromLine, Monitor, User, ZoomIn, ZoomOut, RotateCw, Wrench } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

/* ====================================================================================
 * PRESETS DE CÂMERA CANÔNICOS DA BATTLESTATION (Fase 4)
 * ==================================================================================== */
export type DeskCameraPreset = 'setup-wide' | 'setup-top' | 'setup-pc' | 'setup-seat';

export const DESK_CAMERA_PRESETS: Record<
  DeskCameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  // Metros (1 unidade = 1 m): mesa centrada na origem, tampo a 0,75 m, aluno em +Z
  'setup-wide': {
    pos: [1.9, 1.75, 2.1],
    target: [0, 0.72, 0],
  },
  'setup-top': {
    pos: [0, 2.6, 0.05],
    target: [0, 0.75, 0],
  },
  'setup-pc': {
    // Atrás e à direita: mostra o painel traseiro do gabinete e as tomadas da parede
    pos: [1.25, 1.25, -0.95],
    target: [0.5, 0.9, -0.2],
  },
  'setup-seat': {
    // Olhos do aluno sentado (~1,2 m), olhando para o monitor
    pos: [-0.1, 1.18, 0.58],
    target: [-0.1, 0.98, -0.2],
  },
};

/* ====================================================================================
 * CONTROLADOR SUAVE DE CÂMERA COM LERP E ORBITCONTROLS LIVRE
 * ==================================================================================== */
interface DeskCameraControllerProps {
  preset: DeskCameraPreset;
  /** Incrementado a cada clique: permite re-aplicar o mesmo preset (ex.: "Resetar Câmera" após orbitar) */
  requestId: number;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const DeskCameraController: React.FC<DeskCameraControllerProps> = ({ preset, requestId, controlsRef }) => {
  const { camera } = useThree();
  // Refs (e não estado): a transição roda no loop de frame sem provocar re-render do React
  const targetPos = useRef(new THREE.Vector3(...DESK_CAMERA_PRESETS[preset].pos));
  const targetLook = useRef(new THREE.Vector3(...DESK_CAMERA_PRESETS[preset].target));
  const isTransitioning = useRef(false);

  useEffect(() => {
    targetPos.current.set(...DESK_CAMERA_PRESETS[preset].pos);
    targetLook.current.set(...DESK_CAMERA_PRESETS[preset].target);
    isTransitioning.current = true;
  }, [preset, requestId]);

  useFrame((_, delta) => {
    if (!isTransitioning.current) return;

    const t = Math.min(1, delta * 5.0);
    camera.position.lerp(targetPos.current, t);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.lerp(targetLook.current, t);
      controls.update();
    }

    if (camera.position.distanceTo(targetPos.current) < 0.04) {
      camera.position.copy(targetPos.current);
      if (controls) {
        controls.target.copy(targetLook.current);
        controls.update();
      }
      isTransitioning.current = false;
    }
  });

  return null;
};

const PRESET_BUTTONS: {
  preset: DeskCameraPreset;
  label: string;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { preset: 'setup-wide', label: 'Panorâmica', title: 'Visão Panorâmica da Estação (setup-wide)', Icon: Eye },
  { preset: 'setup-top', label: 'Topo', title: 'Visão Superior dos Periféricos (setup-top)', Icon: ArrowUpFromLine },
  { preset: 'setup-pc', label: 'Conexões PC', title: 'Visão Traseira das Conexões do PC e GPU (setup-pc)', Icon: Monitor },
  { preset: 'setup-seat', label: 'Visão do Aluno', title: 'Visão em Primeira Pessoa do Aluno na Cadeira (setup-seat)', Icon: User },
];

/* ====================================================================================
 * COMPONENTE PRINCIPAL: DeskSetup3D
 * ==================================================================================== */
export interface DeskSetup3DProps {
  onBackToWorkbench?: () => void;
}

export const DeskSetup3D: React.FC<DeskSetup3DProps> = ({ onBackToWorkbench }) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const {
    deskSetup,
    setDeskCameraPreset,
    setActiveWorkbenchView,
  } = useAssemblyStore(
    useShallow((s) => ({
      deskSetup: s.deskSetup,
      setDeskCameraPreset: s.setDeskCameraPreset,
      setActiveWorkbenchView: s.setActiveWorkbenchView,
    }))
  );

  const deskStage = useAssemblyStore(selectDeskStage);
  const isDragging = useDeskPlacementStore((s) => s.isDragging);
  const heldItem = useDeskPlacementStore((s) => s.heldItem);
  const holdItem = useDeskPlacementStore((s) => s.holdItem);
  const heldCable = useDeskPlacementStore((s) => s.heldCable);
  const holdCable = useDeskPlacementStore((s) => s.holdCable);
  const isPoweredOn = useAssemblyStore((s) => s.deskSetup.isDeskPoweredOn);
  const postFailed = isPoweredOn && deskStage === 'READY_TO_BOOT';
  const inspectedSnap = useDeskPlacementStore((s) => s.inspectedSnap);
  const inspect = useDeskPlacementStore((s) => s.inspect);
  const inspectedItem = useAssemblyStore((s) => (inspectedSnap ? s.deskSetup.placedDeskItems[inspectedSnap] : undefined));
  const removeDeskItem = useAssemblyStore((s) => s.removeDeskItem);
  const activePreset = deskSetup.deskCameraPreset;
  const [cameraRequestId, setCameraRequestId] = useState(0);

  const applyPreset = (preset: DeskCameraPreset) => {
    setDeskCameraPreset(preset);
    setCameraRequestId((id) => id + 1);
  };

  // Com um cabo em mãos, a câmera vai para a traseira do PC, onde ficam as portas
  const heldCableId = heldCable?.cableId ?? null;
  useEffect(() => {
    if (heldCableId && activePreset !== 'setup-pc') applyPreset('setup-pc');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só a pegar um cabo novo
  }, [heldCableId]);

  const handleZoom = (factor: number) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object as THREE.PerspectiveCamera;
    const offset = camera.position.clone().sub(controls.target);
    const length = THREE.MathUtils.clamp(
      offset.length() * factor,
      controls.minDistance,
      controls.maxDistance
    );
    camera.position.copy(controls.target).add(offset.setLength(length));
    controls.update();
  };

  const handleResetCamera = () => {
    applyPreset('setup-wide');
  };

  const handleBack = () => {
    if (onBackToWorkbench) {
      onBackToWorkbench();
    } else {
      setActiveWorkbenchView('bench');
    }
  };

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-800 bg-[#050811] shadow-2xl flex flex-col select-none">
      {/* ==================================================================================
       * BARRA SUPERIOR: CONTROLES DE CÂMERA E ESTÁGIO DA MESA
       * ================================================================================== */}
      <div className="absolute top-3 left-3 right-3 z-40 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        {/* Indicador de Estágio da Mesa (anunciado a leitores de tela a cada mudança) */}
        <div role="status" aria-live="polite" className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-mono">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              deskStage === 'RUNNING'
                ? 'bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400'
                : deskStage === 'READY_TO_BOOT'
                ? 'bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400'
                : deskStage === 'CABLING'
                ? 'bg-amber-400 shadow-sm shadow-amber-400'
                : deskStage === 'FURNISHING'
                ? 'bg-indigo-400'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-200 font-bold">Mesa & Battlestation 3D</span>
          <span className="text-slate-600">/</span>
          <span
            className={`font-semibold ${
              deskStage === 'RUNNING'
                ? 'text-emerald-300'
                : deskStage === 'READY_TO_BOOT'
                ? 'text-cyan-300'
                : deskStage === 'CABLING'
                ? 'text-amber-300'
                : deskStage === 'FURNISHING'
                ? 'text-indigo-300'
                : 'text-slate-400'
            }`}
          >
            {deskStage === 'RUNNING'
              ? 'AcademyOS em Execução ✓'
              : postFailed
              ? 'Falha no POST'
              : isPoweredOn
              ? 'Ligado — verifique os cabos'
              : deskStage === 'READY_TO_BOOT'
              ? 'Pronto para o Boot'
              : deskStage === 'CABLING'
              ? 'Conectando Cabos'
              : deskStage === 'FURNISHING'
              ? 'Posicionando Periféricos'
              : 'Montagem Bloqueada'}
          </span>
        </div>

        {/* Presets de Câmera e Ações */}
        <div className="flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
          {/* Botões de Preset com nomes exatos */}
          <div
            role="group"
            aria-label="Presets de câmera da mesa"
            className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg"
          >
            {PRESET_BUTTONS.map(({ preset, label, title, Icon }) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                aria-pressed={activePreset === preset}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                  activePreset === preset
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={title}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Zoom e Reset */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              type="button"
              onClick={() => handleZoom(0.85)}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Aproximar (+)"
              aria-label="Aproximar Câmera"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleZoom(1.15)}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Afastar (-)"
              aria-label="Afastar Câmera"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetCamera}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Resetar Câmera"
              aria-label="Resetar Câmera"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão de Retorno à Bancada */}
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-xs font-mono text-cyan-300 hover:text-cyan-200 shadow-lg transition-all cursor-pointer"
            title="Voltar para a bancada técnica de montagem"
            aria-label="Voltar à bancada de montagem"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Voltar à Bancada</span>
          </button>
        </div>
      </div>

      {/* ==================================================================================
       * CENA 3D R3F
       * ================================================================================== */}
      <div className="flex-1 w-full h-full relative">
        <Canvas
          camera={{ position: DESK_CAMERA_PRESETS['setup-wide'].pos, fov: 42, near: 0.03, far: 40 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          shadows
        >
          {/* Luzes do laboratório (~5500K) em escala métrica, sombra recortada na área da estação */}
          <hemisphereLight args={['#e0f2fe', '#1e293b', 1.1]} />
          <ambientLight intensity={0.25} />
          <directionalLight
            position={[1.6, 2.8, 1.8]}
            intensity={2.4}
            color="#f8fafc"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-1.6}
            shadow-camera-right={1.6}
            shadow-camera-top={1.6}
            shadow-camera-bottom={-1.6}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-2, 2, 1.5]} intensity={0.9} color="#cbd5e1" />
          <pointLight position={[0, 1.6, -0.45]} color="#38bdf8" intensity={0.8} distance={3} />

          {/* Gerenciador de Câmera */}
          <DeskCameraController preset={activePreset} requestId={cameraRequestId} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            enabled={!isDragging}
            minDistance={0.5}
            maxDistance={4.5}
            maxPolarAngle={Math.PI / 2 - 0.05}
          />

          <Suspense
            fallback={
              <Html center>
                <div className="px-4 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/50 text-cyan-300 text-xs font-mono flex items-center gap-2 shadow-2xl">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando Battlestation 3D...</span>
                </div>
              </Html>
            }
          >
            {/* Sala, mesa, itens posicionados, hologramas de encaixe e item em mãos */}
            <DeskStationScene isRunning={deskStage === 'RUNNING'} />
          </Suspense>
        </Canvas>

        {/* Item em mãos: instrução de encaixe (anunciada a leitores de tela) */}
        {heldItem && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/60 text-xs font-mono text-cyan-200 shadow-xl backdrop-blur-md flex items-center gap-3"
          >
            <span>
              Em mãos: <b className="text-white">{heldItem.name}</b> — arraste até o holograma ou clique nele. <kbd className="px-1 rounded bg-slate-800">Esc</kbd> cancela.
            </span>
            <button
              type="button"
              onClick={() => holdItem(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Cabo em mãos: instrução de conexão */}
        {heldCable && (
          <div
            role="status"
            aria-live="polite"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 px-3.5 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/60 text-xs font-mono text-cyan-200 shadow-xl backdrop-blur-md flex items-center gap-3"
          >
            <span>
              Cabo em mãos: <b className="text-white">{EXTERNAL_CABLES[heldCable.cableId].name}</b> —{' '}
              {heldCable.firstPort ? 'clique na porta de destino.' : 'clique na primeira ponta.'}{' '}
              <kbd className="px-1 rounded bg-slate-800">Esc</kbd> cancela.
            </span>
            <button
              type="button"
              onClick={() => holdCable(null)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Item posicionado selecionado com o mouse: retirar da mesa */}
        {!heldItem && inspectedSnap && inspectedItem && (
          <div className="absolute bottom-3 left-3 z-40 w-[260px] p-3 rounded-xl bg-slate-950/95 border border-slate-700 text-xs font-mono shadow-xl backdrop-blur-md">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{DESK_SNAP_POINTS[inspectedSnap].label}</div>
            <div className="text-slate-100 font-bold mt-0.5">{inspectedItem.name}</div>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (removeDeskItem(inspectedSnap)) inspect(null);
                }}
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Retirar da mesa
              </button>
              <button
                type="button"
                onClick={() => inspect(null)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeskSetup3D;

