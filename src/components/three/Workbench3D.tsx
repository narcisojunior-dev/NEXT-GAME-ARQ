'use client';

import React, { Suspense, useRef, useState, useTransition } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useCableDragStore } from '@/components/workbench/cableDragStore';
import { CABLES, CableSpec, CableTargetId, cableTargetById } from '@/engine/cabling';
import {
  Cpu,
  Layers,
  Zap,
  HardDrive,
  Eye,
  ArrowUpFromLine,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Maximize2,
  Wrench,
  Power,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { isWebGLAvailable } from './webglDetect';
export { isWebGLAvailable };

/** Hook de alvo de cabo compatível com a máquina de estados do workbench */
function useCableTarget3D(targetId: CableTargetId) {
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

  const connectedCable: CableSpec | null =
    CABLES.find((c) => cableConnections[c.id] === targetId) ?? null;
  const isHovered = hoverTargetId === targetId;
  const showAffordance = Boolean(heldCableId) && !connectedCable;
  const label = cableTargetById(targetId).label;

  const activate = () => {
    if (heldCableId) {
      tryConnect(heldCableId, targetId);
    } else if (connectedCable) {
      setFeedback({
        tone: 'info',
        text: `${label}: ${connectedCable.name} conectado. Para soltar, utilize a bandeja de cabos.`,
      });
    } else {
      setFeedback({
        tone: 'info',
        text: `${label}: ${cableTargetById(targetId).description}. Pegue o cabo na bandeja lateral.`,
      });
    }
  };

  return { connectedCable, isHovered, showAffordance, label, activate };
}

/** Conector de cabo projetado em 3D sobre a placa */
const CableAnchorNode: React.FC<{
  targetId: CableTargetId;
  position: [number, number, number];
  name: string;
}> = ({ targetId, position, name }) => {
  const { connectedCable, isHovered, showAffordance, label, activate } = useCableTarget3D(targetId);

  return (
    <group position={position}>
      <Html center distanceFactor={14}>
        <div
          data-cable-target={targetId}
          onClick={activate}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              activate();
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`Conector ${name}: ${connectedCable ? connectedCable.name : 'desconectado'}`}
          className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer border transition-all select-none shadow-md ${
            connectedCable
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 shadow-emerald-900/40'
              : showAffordance
              ? 'bg-amber-500/30 text-amber-200 border-amber-400 animate-pulse ring-2 ring-amber-400/50'
              : isHovered
              ? 'bg-cyan-500/40 text-cyan-200 border-cyan-400 ring-2 ring-cyan-400/50'
              : 'bg-slate-900/80 text-slate-300 border-slate-700/80 hover:border-cyan-400 hover:text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span className="font-semibold">{name}</span>
          </div>
          {connectedCable && <div className="text-[8px] text-emerald-400 truncate max-w-[80px]">{connectedCable.name}</div>}
        </div>
      </Html>
    </group>
  );
};

/** Modelo GLB da placa-mãe */
const MotherboardMesh: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  const { scene } = useGLTF(modelUrl);
  return (
    <primitive
      object={scene.clone()}
      scale={[2.8, 2.8, 2.8]}
      position={[0, -0.05, 0]}
      rotation={[0, 0, 0]}
    />
  );
};

/** Componente de Peça Encaixada sobre a Placa (CPU, Cooler, GPU, RAM) */
const InstalledPartMesh: React.FC<{
  modelUrl: string;
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}> = ({ modelUrl, position, scale = [1, 1, 1], rotation = [0, 0, 0] }) => {
  const { scene } = useGLTF(modelUrl);
  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
};

/** Controlador suave de câmera entre vista Superior e Isométrica */
const CameraController: React.FC<{ view: 'top' | 'iso' }> = ({ view }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (view === 'top') {
      targetPos.current.set(0, 9.5, 0.001);
    } else {
      targetPos.current.set(4.8, 6.2, 5.2);
    }
    camera.position.lerp(targetPos.current, Math.min(1, delta * 7));
    camera.lookAt(targetLook.current);
  });

  return null;
};

export interface Workbench3DProps {
  onToggle2D?: () => void;
}

export const Workbench3D: React.FC<Workbench3DProps> = ({ onToggle2D }) => {
  const [view, setView] = useState<'top' | 'iso'>('iso');
  const {
    selectedMotherboard,
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
  } = useAssemblyStore();

  // Escolhe o modelo 3D correspondente à placa instalada
  const mbModelUrl =
    selectedMotherboard?.formFactor === 'Micro-ATX'
      ? '/models/mb-b550m.glb'
      : selectedMotherboard?.formFactor === 'ATX'
      ? '/models/mb-z790-atx.glb'
      : '/models/mb-generica.glb';

  // Lógica de clique na área do Soquete da CPU
  const handleCpuAreaClick = () => {
    if (selectedComponentForPlacement?.category === 'CPU') {
      installCpu(selectedComponentForPlacement as never);
    } else if (selectedComponentForPlacement?.category === 'PASTE') {
      applyThermalPaste();
    } else if (selectedComponentForPlacement?.category === 'COOLER') {
      installCooler(selectedComponentForPlacement as never);
    }
  };

  const handleRamClick = (slot: 2 | 4) => {
    if (selectedComponentForPlacement?.category === 'RAM') {
      installRam(slot, selectedComponentForPlacement as never);
    }
  };

  const handleM2Click = () => {
    if (selectedComponentForPlacement?.category === 'STORAGE') {
      installStorage(selectedComponentForPlacement as never, 'M2');
    }
  };

  const handleGpuClick = () => {
    if (selectedComponentForPlacement?.category === 'GPU') {
      installGpu(selectedComponentForPlacement as never);
    }
  };

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl flex flex-col">
      {/* Barra de Ferramentas Superior da Bancada 3D */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-200 font-bold">Bancada 3D Interativa</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-400">
            {selectedMotherboard ? selectedMotherboard.name : 'Placa de Teste'}
          </span>
        </div>

        {/* Controles de Câmera e Alternância 2D */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setView('top')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                view === 'top'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Vista superior ortográfica para montagem e cabos"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Topo</span>
            </button>
            <button
              onClick={() => setView('iso')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                view === 'iso'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Vista isométrica técnica para visualização em profundidade"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Isométrica</span>
            </button>
          </div>

          {onToggle2D && (
            <button
              onClick={onToggle2D}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-cyan-300 shadow-lg transition-all"
              title="Alternar para o modo 2D leve (ideal para economia de bateria)"
            >
              Modo 2D Leve
            </button>
          )}
        </div>
      </div>

      {/* Cena 3D Three.js */}
      <div className="flex-1 w-full h-full">
        <Canvas
          camera={{ position: [4.8, 6.2, 5.2], fov: 42 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <color attach="background" args={['#070b14']} />
          <CameraController view={view} />

          {/* Iluminação de Bancada de Laboratório */}
          <ambientLight intensity={1.2} color="#94a3b8" />
          <directionalLight position={[6, 12, 6]} intensity={1.8} color="#ffffff" castShadow />
          <directionalLight position={[-6, 8, -6]} intensity={0.6} color="#38bdf8" />
          <pointLight position={[0, 3, 0]} intensity={1.5} color="#38bdf8" distance={8} />

          {/* Tapete Antiestático Escuro com Grade Subtil */}
          <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[16, 16]} />
            <meshStandardMaterial color="#0b1324" roughness={0.8} metalness={0.1} />
          </mesh>
          <gridHelper args={[14, 28, '#1e293b', '#0f172a']} position={[0, -0.14, 0]} />

          <Suspense
            fallback={
              <Html center>
                <div className="bg-slate-900/90 border border-cyan-500/50 text-cyan-300 font-mono text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando Bancada 3D…</span>
                </div>
              </Html>
            }
          >
            {/* Modelo 3D da Placa-Mãe */}
            <MotherboardMesh modelUrl={mbModelUrl} />

            {/* Peças Instaladas Renderizadas na Cena 3D */}
            {assembly.cpuInstalled && (
              <InstalledPartMesh
                modelUrl="/models/cpu-intel-lga1700.glb"
                position={[-0.2, 0.12, -0.25]}
                scale={[0.8, 0.8, 0.8]}
              />
            )}

            {/* Pasta Térmica aplicada sobre a CPU */}
            {assembly.thermalPasteApplied && !assembly.coolerInstalled && (
              <mesh position={[-0.2, 0.16, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.22, 16]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.6} />
              </mesh>
            )}

            {/* Cooler Instalado */}
            {assembly.coolerInstalled && (
              <InstalledPartMesh
                modelUrl={
                  assembly.coolerInstalled.coolerType === 'Water'
                    ? '/models/cooler-aio-240.glb'
                    : '/models/cooler-torre.glb'
                }
                position={[-0.2, 0.2, -0.25]}
                scale={[1.1, 1.1, 1.1]}
              />
            )}

            {/* Módulos de RAM nos Slots */}
            {assembly.ramInstalledSlot2 && (
              <InstalledPartMesh
                modelUrl="/models/ram-ddr4-crucial.glb"
                position={[0.7, 0.15, -0.1]}
                scale={[0.8, 0.8, 0.8]}
                rotation={[0, Math.PI / 2, 0]}
              />
            )}
            {assembly.ramInstalledSlot4 && (
              <InstalledPartMesh
                modelUrl="/models/ram-ddr4-crucial.glb"
                position={[1.0, 0.15, -0.1]}
                scale={[0.8, 0.8, 0.8]}
                rotation={[0, Math.PI / 2, 0]}
              />
            )}

            {/* Placa de Vídeo (GPU) no Slot PCIe */}
            {assembly.gpuInstalled && (
              <InstalledPartMesh
                modelUrl="/models/gpu-rx-6700xt.glb"
                position={[-0.2, 0.45, 1.1]}
                scale={[0.85, 0.85, 0.85]}
                rotation={[0, 0, 0]}
              />
            )}

            {/* Âncora Projetada: Soquete da CPU */}
            <group position={[-0.2, 0.15, -0.25]}>
              <Html center distanceFactor={12}>
                <div
                  onClick={handleCpuAreaClick}
                  role="button"
                  tabIndex={0}
                  className={`p-2 rounded-xl font-mono text-[11px] cursor-pointer border shadow-lg backdrop-blur select-none transition-all ${
                    assembly.coolerInstalled
                      ? 'bg-slate-900/90 border-cyan-500/80 text-cyan-300'
                      : assembly.thermalPasteApplied
                      ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                      : assembly.cpuInstalled
                      ? 'bg-indigo-950/90 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950/90 border-dashed border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>
                      {assembly.coolerInstalled
                        ? 'Cooler Instalado'
                        : assembly.thermalPasteApplied
                        ? 'Pasta Aplicada'
                        : assembly.cpuInstalled
                        ? 'CPU no Soquete'
                        : 'Soquete CPU'}
                    </span>
                  </div>
                  {assembly.cpuInstalled && !assembly.coolerInstalled && (
                    <div className="mt-1 flex items-center gap-1 text-[9px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSocketLever();
                        }}
                        className={`px-1.5 py-0.5 rounded border ${
                          assembly.socketLeverLocked
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                            : 'bg-amber-950 text-amber-300 border-amber-600 animate-pulse'
                        }`}
                      >
                        {assembly.socketLeverLocked ? 'Alavanca Travada ✓' : 'Travar Alavanca ⚠'}
                      </button>
                    </div>
                  )}
                </div>
              </Html>
            </group>

            {/* Âncoras Projetadas: Slots de Memória RAM */}
            <group position={[0.7, 0.15, -0.1]}>
              <Html center distanceFactor={12}>
                <button
                  onClick={() => handleRamClick(2)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border shadow backdrop-blur transition-all ${
                    assembly.ramInstalledSlot2
                      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/90 border-dashed border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold">
                    <Layers className="w-3 h-3" />
                    <span>DIMM A2 (Slot 2)</span>
                  </div>
                </button>
              </Html>
            </group>

            <group position={[1.0, 0.15, -0.1]}>
              <Html center distanceFactor={12}>
                <button
                  onClick={() => handleRamClick(4)}
                  className={`px-2 py-1 rounded text-[10px] font-mono border shadow backdrop-blur transition-all ${
                    assembly.ramInstalledSlot4
                      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/90 border-dashed border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold">
                    <Layers className="w-3 h-3" />
                    <span>DIMM B2 (Slot 4)</span>
                  </div>
                </button>
              </Html>
            </group>

            {/* Âncora Projetada: Slot PCIe x16 (GPU) */}
            <group position={[-0.2, 0.15, 1.1]}>
              <Html center distanceFactor={12}>
                <button
                  onClick={handleGpuClick}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono border shadow backdrop-blur transition-all ${
                    assembly.gpuInstalled
                      ? 'bg-indigo-950/90 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900/90 border-dashed border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-1 font-semibold">
                    <Zap className="w-3 h-3" />
                    <span>PCIe x16: {assembly.gpuInstalled ? assembly.gpuInstalled.name : 'Vazio'}</span>
                  </div>
                </button>
              </Html>
            </group>

            {/* Âncora Projetada: Slot M.2 SSD */}
            <group position={[-0.2, 0.12, 0.4]}>
              <Html center distanceFactor={12}>
                <button
                  onClick={handleM2Click}
                  className={`px-2 py-1 rounded text-[10px] font-mono border shadow backdrop-blur transition-all ${
                    assembly.storageInstalled?.storageType.includes('NVME')
                      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900/90 border-dashed border-slate-700 text-slate-400 hover:border-cyan-400 hover:text-cyan-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    <span>M.2 NVMe</span>
                  </div>
                </button>
              </Html>
            </group>

            {/* Âncoras Projetadas de Conectores de Cabos com data-cable-target */}
            <CableAnchorNode
              targetId="ATX_PWR"
              position={[1.35, 0.12, 0.35]}
              name="ATX 24P"
            />
            <CableAnchorNode
              targetId="ATX12V"
              position={[-1.15, 0.12, -1.05]}
              name="CPU 8P"
            />
            <CableAnchorNode
              targetId="CPU_FAN"
              position={[0.3, 0.12, -0.85]}
              name="CPU_FAN"
            />

            {/* Âncora do Painel Frontal (F_PANEL) */}
            <group position={[1.2, 0.12, 1.35]}>
              <Html center distanceFactor={12}>
                <button
                  onClick={openFrontPanelModal}
                  className="px-2 py-1 rounded text-[10px] font-mono border border-slate-700 bg-slate-900/90 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 shadow backdrop-blur transition-all flex items-center gap-1"
                >
                  <Power className="w-3 h-3 text-cyan-400" />
                  <span>F_PANEL</span>
                </button>
              </Html>
            </group>

            {/* LEDs de Diagnóstico do POST (Debug LEDs) */}
            <group position={[1.35, 0.12, -0.9]}>
              <Html center distanceFactor={14}>
                <div className="px-2 py-1 rounded bg-slate-950/90 border border-slate-800 text-[8px] font-mono text-slate-400 flex items-center gap-1.5 shadow">
                  <div className="flex items-center gap-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        postResult?.debugLed.cpu === 'GREEN'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                          : postResult?.debugLed.cpu === 'RED'
                          ? 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse'
                          : 'bg-slate-700'
                      }`}
                    />
                    <span>CPU</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        postResult?.debugLed.dram === 'GREEN'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                          : postResult?.debugLed.dram === 'RED'
                          ? 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse'
                          : 'bg-slate-700'
                      }`}
                    />
                    <span>DRAM</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        postResult?.debugLed.vga === 'GREEN'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                          : postResult?.debugLed.vga === 'RED'
                          ? 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse'
                          : 'bg-slate-700'
                      }`}
                    />
                    <span>VGA</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        postResult?.debugLed.boot === 'GREEN'
                          ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                          : postResult?.debugLed.boot === 'RED'
                          ? 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse'
                          : 'bg-slate-700'
                      }`}
                    />
                    <span>BOOT</span>
                  </div>
                </div>
              </Html>
            </group>
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};
export default Workbench3D;
