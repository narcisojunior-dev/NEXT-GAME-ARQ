'use client';

import React, { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useCableDragStore } from '@/components/workbench/cableDragStore';
import { CABLES, CableSpec, CableTargetId, cableTargetById } from '@/engine/cabling';
import { resolveWorkbenchModelId, workbenchModelRotation, workbenchModelUrl } from '@/engine/workbenchModels';
import type { HardwareComponent } from '@/engine/types';
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
  ZoomIn,
  ZoomOut,
  Fan,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { isWebGLAvailable } from './webglDetect';
export { isWebGLAvailable };

/* ====================================================================================
 * COORDENADAS PADRÃO CALIBRADAS DA BANCADA 3D (Escala Normalizada da Placa: ~7.2 x 7.6)
 * Espaçamento ergonômico nos quadrantes físicos reais da placa-mãe
 * ==================================================================================== */
const POSITIONS = {
  // Soquete da CPU (Centro exato do soquete AM4 da ASRock B550M entre os brackets)
  CPU_SOCKET: [0.38, 0.22, -0.08] as [number, number, number],
  // Conector de Ventoinha da CPU (Borda superior, acima do soquete)
  CPU_FAN_HEADER: [0.38, 0.22, -2.50] as [number, number, number],
  // Conector ATX 12V 8P (Borda superior esquerda, próximo ao VRM)
  ATX12V_HEADER: [-2.80, 0.22, -2.90] as [number, number, number],
  // Slots de Memória RAM (Dentro dos trilhos dos slots DIMM da placa)
  RAM_SLOT_2: [1.72, 0.22, -0.38] as [number, number, number],
  RAM_SLOT_4: [2.02, 0.22, -0.38] as [number, number, number],
  // Slot M.2 NVMe (Abaixo da CPU)
  M2_SLOT: [0.20, 0.22, 0.65] as [number, number, number],
  // Slot PCIe x16 da Placa de Vídeo (No slot longo horizontal)
  PCIE_SLOT: [-0.30, 0.22, 1.35] as [number, number, number],
  // Conector Principal ATX 24P (Borda direita da placa)
  ATX24P_HEADER: [3.10, 0.22, -0.38] as [number, number, number],
  // Painel Frontal F_PANEL (Canto inferior direito da placa)
  FPANEL_HEADER: [2.90, 0.22, 2.90] as [number, number, number],
  // LEDs de Diagnóstico EZ Debug (Canto superior direito)
  DEBUG_LEDS: [2.90, 0.22, -2.80] as [number, number, number],
};

/* ====================================================================================
 * COMPONENTE: Placa-Mãe Auto-Normalizada
 * Centraliza e nivela qualquer modelo GLB para o plano XZ em Y=0 com tamanho padrão ~7.2
 * ==================================================================================== */
const AutoNormalizedMotherboard: React.FC<{ modelUrl: string }> = ({ modelUrl }) => {
  const { scene } = useGLTF(modelUrl);

  const normalizedScene = useMemo(() => {
    const clone = scene.clone(true);
    // 1. Calcula a caixa delimitadora inicial
    let box = new THREE.Box3().setFromObject(clone);
    let size = box.getSize(new THREE.Vector3());

    // Se Z for a menor dimensão (como em modelos Z-Up estilo Sketchfab Z790), rotaciona -90° em X
    if (size.z < size.y && size.z < size.x) {
      clone.rotation.x = -Math.PI / 2;
      box = new THREE.Box3().setFromObject(clone);
      size = box.getSize(new THREE.Vector3());
    }

    // 2. Alinha a base em Y=0 e centraliza em X e Z
    const center = box.getCenter(new THREE.Vector3());
    clone.position.x = -center.x;
    clone.position.z = -center.z;
    clone.position.y = -box.min.y;

    // 3. Normaliza para a largura padrão do laboratório (7.2 unidades)
    const targetWidth = 7.2;
    const scaleFactor = targetWidth / Math.max(0.001, size.x);
    clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Ajusta materiais para aspecto limpo e sem estouro de brilho.
    // clone(true) compartilha materiais com o cache do useGLTF: clona antes de alterar,
    // senão a rugosidade vaza para a Vitrine 3D e para as próximas montagens.
    const ownedMaterials = new Map<THREE.Material, THREE.Material>();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const tune = (source: THREE.Material) => {
          let owned = ownedMaterials.get(source);
          if (!owned) {
            owned = source.clone();
            const standard = owned as THREE.MeshStandardMaterial;
            if (standard.isMeshStandardMaterial) standard.roughness = Math.max(0.3, standard.roughness ?? 0.5);
            ownedMaterials.set(source, owned);
          }
          return owned;
        };
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map(tune);
        else if (mesh.material) mesh.material = tune(mesh.material);
      }
    });

    return { clone, materials: [...ownedMaterials.values()] };
  }, [scene]);

  // Geometrias e texturas pertencem ao cache do useGLTF; só os materiais clonados aqui são nossos
  useEffect(
    () => () => normalizedScene.materials.forEach((material) => material.dispose()),
    [normalizedScene]
  );

  return <primitive object={normalizedScene.clone} />;
};

/* ====================================================================================
 * COMPONENTE: Peça Auto-Normalizada com Animação Opcional de Fan
 * Dimensiona peças arbitrariamente baixadas para encaixe perfeito nas proporções da placa
 * ==================================================================================== */
interface AutoNormalizedPartProps {
  modelUrl: string;
  targetSize: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  isSpinning?: boolean;
}

const AutoNormalizedPart: React.FC<AutoNormalizedPartProps> = ({
  modelUrl,
  targetSize,
  position,
  rotation = [0, 0, 0],
  isSpinning = false,
}) => {
  const { scene } = useGLTF(modelUrl);
  const fanGroupRef = useRef<THREE.Group>(null);
  // Depende dos ângulos (primitivos), não da referência do array: um literal novo a cada
  // render faria o clone + Box3 da cena inteira rodar de novo em toda atualização da store
  const [rotX, rotY, rotZ] = rotation;

  const preparedScene = useMemo(() => {
    const clone = scene.clone(true);

    // 1. Aplica a rotação pretendida internamente no clone ANTES de medir a caixa delimitadora
    clone.rotation.set(rotX, rotY, rotZ);
    clone.updateMatrixWorld(true);

    // 2. Calcula o bounding box real do objeto já devidamente rotacionado
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 3. Centraliza a base em X e Z e assenta a face inferior em Y=0
    clone.position.x = -center.x;
    clone.position.z = -center.z;
    clone.position.y = -box.min.y;

    // 4. Normaliza para o tamanho alvo na maior dimensão
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = targetSize / Math.max(0.001, maxDim);
    clone.scale.set(scaleFactor, scaleFactor, scaleFactor);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [scene, targetSize, rotX, rotY, rotZ]);

  useFrame((_, delta) => {
    if (isSpinning && fanGroupRef.current) {
      fanGroupRef.current.rotation.y += delta * 12;
    }
  });

  return (
    <group position={position}>
      <group ref={fanGroupRef}>
        <primitive object={preparedScene} />
      </group>
    </group>
  );
};

/* ====================================================================================
 * COMPONENTE: Hotspot Tátil de Engenharia (WorkbenchPin)
 * Marcador circular compacto com tooltip expansível no hover/foco para zero sobreposição
 * ==================================================================================== */
interface WorkbenchPinProps {
  position: [number, number, number];
  icon: React.ReactNode;
  label: string;
  status: 'empty' | 'installed' | 'targeted';
  detailText: string;
  actionText?: string;
  onAction?: () => void;
  dataCableTarget?: CableTargetId;
  badgeContent?: React.ReactNode;
  secondaryAction?: {
    text: string;
    onClick: () => void;
  };
}

const WorkbenchPin: React.FC<WorkbenchPinProps> = ({
  position,
  icon,
  label,
  status,
  detailText,
  actionText,
  onAction,
  dataCableTarget,
  badgeContent,
  secondaryAction,
}) => {
  // Aberto por hover OU por foco em qualquer elemento do pino (inclusive os botões do próprio
  // tooltip), para que Tab alcance "Remover Cooler" e as demais ações secundárias
  const [isHovered, setIsHovered] = useState(false);
  const detailId = useId();

  const isTargeted = status === 'targeted';
  const isInstalled = status === 'installed';

  return (
    <group position={position}>
      <Html center distanceFactor={14} zIndexRange={[20, 0]}>
        <div
          data-cable-target={dataCableTarget}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsHovered(false);
          }}
          onKeyDown={(e) => {
            // WCAG 1.4.13: conteúdo exibido no foco/hover pode ser dispensado sem mover o foco
            if (e.key === 'Escape') setIsHovered(false);
          }}
          className="relative flex items-center justify-center select-none"
        >
          {/* Botão circular tátil compacto (32x32px com hit-area de 44x44px) */}
          <button
            type="button"
            onClick={onAction}
            aria-label={label}
            aria-describedby={detailId}
            className={`relative flex items-center justify-center w-8 h-8 rounded-full border shadow-xl backdrop-blur-md transition-all duration-200 cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/80 ${
              isTargeted
                ? 'bg-amber-950/95 border-amber-400 text-amber-200 ring-4 ring-amber-400/50 animate-bounce motion-reduce:animate-none scale-110 shadow-amber-500/50'
                : isInstalled
                ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 hover:border-emerald-400 hover:scale-105 shadow-emerald-900/40'
                : isHovered
                ? 'bg-cyan-950/95 border-cyan-400 text-cyan-200 scale-110 shadow-cyan-500/40'
                : 'bg-slate-900/85 border-slate-700/80 text-slate-300 hover:border-cyan-400 hover:text-cyan-200 hover:scale-105'
            }`}
          >
            {icon}

            {/* Micro-indicador de status no topo direito do pino */}
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                isTargeted
                  ? 'bg-amber-400 animate-ping motion-reduce:animate-none'
                  : isInstalled
                  ? 'bg-emerald-400'
                  : 'bg-slate-600'
              }`}
            />
          </button>

          {/* Descrição sempre presente para leitores de tela (o tooltip visual só existe no hover/foco) */}
          <span id={detailId} className="sr-only">
            {isInstalled ? 'Instalado. ' : isTargeted ? 'Pronto para encaixe. ' : ''}
            {detailText}
          </span>

          {/* Tooltip técnico que expande suavemente apenas no hover / foco.
              pb-2 (e não mb-2) mantém a área de hover contínua entre o pino e o cartão:
              com margem, o mouse "caía" no vão e o tooltip sumia antes do clique. */}
          {isHovered && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-50 pb-2 pointer-events-auto">
            <div
              role="group"
              aria-label={`Ações: ${label}`}
              className="min-w-[190px] max-w-[240px] p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/50 shadow-2xl backdrop-blur-lg text-left animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between gap-1 pb-1 mb-1.5 border-b border-slate-800 font-mono text-[11px] font-bold text-cyan-300">
                <span className="truncate">{label}</span>
                {isInstalled && (
                  <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 font-normal">
                    <CheckCircle2 className="w-3 h-3" />
                    OK
                  </span>
                )}
              </div>

              <p aria-hidden="true" className="text-[10px] font-mono text-slate-300 leading-tight mb-2">
                {detailText}
              </p>

              {badgeContent && <div className="mb-2">{badgeContent}</div>}

              {/* Botões de Ação Contextual dentro do Tooltip */}
              <div className="flex flex-col gap-1">
                {actionText && onAction && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction();
                    }}
                    className={`w-full py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isTargeted
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md animate-pulse'
                        : isInstalled
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md'
                    }`}
                  >
                    <span>{actionText}</span>
                  </button>
                )}

                {secondaryAction && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      secondaryAction.onClick();
                    }}
                    className="w-full py-0.5 px-2 rounded text-[9px] font-mono text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-800/60 transition-all cursor-pointer"
                  >
                    {secondaryAction.text}
                  </button>
                )}
              </div>
            </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
};

/* ====================================================================================
 * COMPONENTE: Conector de Cabo Integrado ao CableDragStore
 * ==================================================================================== */
const CableTargetPin: React.FC<{
  targetId: CableTargetId;
  position: [number, number, number];
  name: string;
}> = ({ targetId, position, name }) => {
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
  const targetSpec = cableTargetById(targetId);

  const handleActivate = () => {
    if (heldCableId) {
      tryConnect(heldCableId, targetId);
    } else if (connectedCable) {
      setFeedback({
        tone: 'info',
        text: `${targetSpec.label}: ${connectedCable.name} já conectado com sucesso.`,
      });
    } else {
      setFeedback({
        tone: 'info',
        text: `${targetSpec.label}: ${targetSpec.description}. Selecione o cabo correto na bandeja.`,
      });
    }
  };

  const status = connectedCable ? 'installed' : showAffordance ? 'targeted' : 'empty';

  return (
    <WorkbenchPin
      position={position}
      dataCableTarget={targetId}
      icon={<Zap className="w-3.5 h-3.5" />}
      label={name}
      status={status}
      detailText={
        connectedCable
          ? `Conectado: ${connectedCable.name}`
          : showAffordance
          ? `Clique para conectar o cabo ${heldCableId}`
          : targetSpec.description
      }
      actionText={
        showAffordance
          ? 'Conectar Cabo Aqui'
          : connectedCable
          ? 'Conectado ✓'
          : 'Instruções do Cabo'
      }
      onAction={handleActivate}
    />
  );
};

/* ====================================================================================
 * GERENCIADOR DE CÂMERA SUAVE (Permite OrbitControls livre sem lerp forçado permanente)
 * ==================================================================================== */
interface CameraTransitionTarget {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const PRESET_VIEWS: Record<'iso' | 'top' | 'front', CameraTransitionTarget> = {
  iso: {
    pos: new THREE.Vector3(6.2, 8.2, 7.2),
    target: new THREE.Vector3(0, 0, 0),
  },
  top: {
    pos: new THREE.Vector3(0, 11.2, 0.001),
    target: new THREE.Vector3(0, 0, 0),
  },
  front: {
    pos: new THREE.Vector3(0, 3.8, 9.2),
    target: new THREE.Vector3(0, 0, 0),
  },
};

const SmoothCameraController: React.FC<{
  transitionTarget: CameraTransitionTarget | null;
  onTransitionEnd: () => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ transitionTarget, onTransitionEnd, controlsRef }) => {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!transitionTarget) return;

    const t = Math.min(1, delta * 5.5);
    camera.position.lerp(transitionTarget.pos, t);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(transitionTarget.target, t);
      controlsRef.current.update();
    }

    if (camera.position.distanceTo(transitionTarget.pos) < 0.05) {
      camera.position.copy(transitionTarget.pos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(transitionTarget.target);
        controlsRef.current.update();
      }
      onTransitionEnd();
    }
  });

  return null;
};

/* ====================================================================================
 * COMPONENTE PRINCIPAL: Workbench3D
 * ==================================================================================== */
export interface Workbench3DProps {
  onToggle2D?: () => void;
}

export const Workbench3D: React.FC<Workbench3DProps> = ({ onToggle2D }) => {
  const [activePreset, setActivePreset] = useState<'iso' | 'top' | 'front'>('iso');
  const [transitionTarget, setTransitionTarget] = useState<CameraTransitionTarget | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

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
  } = useAssemblyStore(
    // Seleção rasa: sem ela o cronômetro (1 Hz) re-renderizava a cena e todos os pinos <Html>
    useShallow((s) => ({
      selectedMotherboard: s.selectedMotherboard,
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
    }))
  );

  // Modelo 3D da mesma família física da peça (soquete, geração de memória, refrigeração)
  // e a rotação calibrada para os eixos daquele GLB
  const partModel = (component: HardwareComponent, fallbackId: string) => {
    const modelId = resolveWorkbenchModelId(component) ?? fallbackId;
    return { modelUrl: workbenchModelUrl(modelId), rotation: workbenchModelRotation(modelId) };
  };
  const mbModelUrl = workbenchModelUrl(
    (selectedMotherboard && resolveWorkbenchModelId(selectedMotherboard)) ?? 'mb-generica'
  );

  // Aciona preset de câmera
  const applyViewPreset = (view: 'iso' | 'top' | 'front') => {
    setActivePreset(view);
    setTransitionTarget(PRESET_VIEWS[view]);
  };

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
    applyViewPreset('iso');
  };

  // Interações de instalação de peças
  const isCpuTarget = selectedComponentForPlacement?.category === 'CPU';
  const isPasteTarget = selectedComponentForPlacement?.category === 'PASTE';
  const isCoolerTarget = selectedComponentForPlacement?.category === 'COOLER';
  const isRamTarget = selectedComponentForPlacement?.category === 'RAM';
  const isStorageTarget = selectedComponentForPlacement?.category === 'STORAGE';
  const isGpuTarget = selectedComponentForPlacement?.category === 'GPU';

  const handleCpuAreaClick = () => {
    if (isCpuTarget) {
      installCpu(selectedComponentForPlacement as never);
    } else if (isPasteTarget) {
      applyThermalPaste();
    } else if (isCoolerTarget) {
      // CPU e pasta térmica são validadas no motor (validateCoolerPrerequisites), igual ao modo 2D
      installCooler(selectedComponentForPlacement as never);
    }
  };

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-800 bg-[#070b14] shadow-2xl flex flex-col select-none">
      {/* ==================================================================================
       * BARRA SUPERIOR DE FERRAMENTAS E CONTROLES DE CÂMERA
       * ================================================================================== */}
      <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between pointer-events-none">
        {/* Identificador de Placa e Modo 3D */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          <span className="text-slate-200 font-bold">Bancada 3D Interativa</span>
          <span className="text-slate-600">/</span>
          <span className="text-cyan-300 font-semibold truncate max-w-[200px]">
            {selectedMotherboard ? selectedMotherboard.name : 'Placa-Mãe ATX'}
          </span>
        </div>

        {/* Controles de Câmera e Modos */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Presets de Câmera */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              type="button"
              onClick={() => applyViewPreset('iso')}
              aria-pressed={activePreset === 'iso'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'iso'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Vista Isométrica técnica em 45 graus"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Isométrica</span>
            </button>

            <button
              type="button"
              onClick={() => applyViewPreset('top')}
              aria-pressed={activePreset === 'top'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'top'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Vista superior ortográfica para alinhamento de cabos e pinos"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Topo</span>
            </button>

            <button
              type="button"
              onClick={() => applyViewPreset('front')}
              aria-pressed={activePreset === 'front'}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'front'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Vista frontal em perfil"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Frente</span>
            </button>
          </div>

          {/* Botões de Zoom e Reset */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => handleZoom(0.85)}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Aproximar Câmera (+)"
              aria-label="Aproximar Câmera"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleZoom(1.18)}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Afastar Câmera (-)"
              aria-label="Afastar Câmera"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetCamera}
              className="px-2 py-1 rounded-lg text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Recentralizar Enquadramento da Placa"
            >
              Reset
            </button>
          </div>

          {/* Alternador 2D */}
          {onToggle2D && (
            <button
              onClick={onToggle2D}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-cyan-300 shadow-lg transition-all cursor-pointer"
              title="Alternar para o modo 2D leve (ideal para economia de bateria)"
            >
              Modo 2D Leve
            </button>
          )}
        </div>
      </div>

      {/* ==================================================================================
       * CENA THREE.JS COM ORBIT CONTROLS LIVRE E ENQUADRAMENTO AUTOMÁTICO
       * ================================================================================== */}
      <div className="flex-1 w-full h-full relative">
        <Canvas
          camera={{ position: [6.2, 8.2, 7.2], fov: 42 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          // Telas Retina/4K em PCs escolares: limita a 1.5x para manter 60 FPS com sombras ativas
          dpr={[1, 1.5]}
          shadows
        >
          <color attach="background" args={['#070b14']} />

          {/* OrbitControls do Drei: Livre, suave e com limites de segurança */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.08}
            minDistance={3.5}
            maxDistance={22}
            maxPolarAngle={Math.PI / 2.05}
            minPolarAngle={0.05}
            onStart={() => setTransitionTarget(null)}
          />

          <SmoothCameraController
            transitionTarget={transitionTarget}
            onTransitionEnd={() => setTransitionTarget(null)}
            controlsRef={controlsRef}
          />

          {/* Iluminação Técnica de Laboratório Cyber-Industrial */}
          <ambientLight intensity={1.1} color="#94a3b8" />
          <directionalLight
            position={[8, 14, 8]}
            intensity={1.8}
            color="#ffffff"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-8, 10, -8]} intensity={0.6} color="#38bdf8" />
          <pointLight position={[0, 4, 0]} intensity={1.4} color="#38bdf8" distance={10} />

          {/* Tapete Antiestático Escuro com Grade Milimetrada Subtil */}
          <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0a101f" roughness={0.85} metalness={0.1} />
          </mesh>
          <gridHelper args={[18, 36, '#1e293b', '#0f172a']} position={[0, 0, 0]} />

          <Suspense
            fallback={
              <Html center>
                <div className="bg-slate-900/90 border border-cyan-500/50 text-cyan-300 font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando Placa-Mãe 3D…</span>
                </div>
              </Html>
            }
          >
            {/* 1. Placa-Mãe Auto-Normalizada */}
            <AutoNormalizedMotherboard modelUrl={mbModelUrl} />

            {/* 2. Peças Físicas Instaladas */}
            {/* CPU Instalada no Soquete */}
            {assembly.cpuInstalled && (
              <AutoNormalizedPart
                {...partModel(assembly.cpuInstalled, 'cpu-intel-lga1700')}
                targetSize={1.15}
                position={POSITIONS.CPU_SOCKET}
              />
            )}

            {/* Pasta Térmica aplicada sobre o IHS da CPU */}
            {assembly.cpuInstalled && assembly.thermalPasteApplied && !assembly.coolerInstalled && (
              <group position={[POSITIONS.CPU_SOCKET[0], 0.28, POSITIONS.CPU_SOCKET[2]]}>
                {/* Gota tridimensional de composto térmico prateado metálico */}
                <mesh position={[0, 0.015, 0]}>
                  <cylinderGeometry args={[0.22, 0.28, 0.03, 32]} />
                  <meshStandardMaterial
                    color="#a1a1aa"
                    roughness={0.25}
                    metalness={0.75}
                  />
                </mesh>
                <mesh position={[0, 0.03, 0]}>
                  <sphereGeometry args={[0.12, 16, 16]} />
                  <meshStandardMaterial
                    color="#d4d4d8"
                    roughness={0.2}
                    metalness={0.85}
                  />
                </mesh>
              </group>
            )}

            {/* Cooler Instalado Assentado sobre a CPU e Pasta Térmica */}
            {assembly.coolerInstalled && (
              <AutoNormalizedPart
                {...partModel(assembly.coolerInstalled, 'cooler-torre')}
                targetSize={2.4}
                position={[POSITIONS.CPU_SOCKET[0], 0.31, POSITIONS.CPU_SOCKET[2]]}
                isSpinning={Boolean(postResult?.bootSuccess)}
              />
            )}

            {/* Pentes de Memória RAM na VERTICAL */}
            {assembly.ramInstalledSlot2 && (
              <AutoNormalizedPart
                {...partModel(assembly.ramInstalledSlot2, 'ram-ddr4-crucial')}
                targetSize={1.9}
                position={POSITIONS.RAM_SLOT_2}
              />
            )}
            {assembly.ramInstalledSlot4 && (
              <AutoNormalizedPart
                {...partModel(assembly.ramInstalledSlot4, 'ram-ddr4-crucial')}
                targetSize={1.9}
                position={POSITIONS.RAM_SLOT_4}
              />
            )}

            {/* Armazenamento SSD M.2 */}
            {assembly.storageInstalled && assembly.storageInstalled.storageType.includes('M2') && (
              <AutoNormalizedPart
                {...partModel(assembly.storageInstalled, 'ssd-nvme-990pro')}
                targetSize={1.3}
                position={POSITIONS.M2_SLOT}
              />
            )}

            {/* Placa de Vídeo (GPU) */}
            {assembly.gpuInstalled && (
              <AutoNormalizedPart
                {...partModel(assembly.gpuInstalled, 'gpu-rx-6700xt')}
                targetSize={4.2}
                position={POSITIONS.PCIE_SLOT}
                isSpinning={Boolean(postResult?.bootSuccess)}
              />
            )}
          </Suspense>

          {/* ==============================================================================
           * HOTSPOTS TÁTEIS (PINS) NOS QUADRANTES FÍSICOS DA PLACA (Sempre ativos)
           * ============================================================================== */}
            {/* 1. Hotspot: Soquete CPU */}
            <WorkbenchPin
              position={POSITIONS.CPU_SOCKET}
              icon={<Cpu className="w-4 h-4" />}
              label="Soquete CPU"
              status={
                assembly.coolerInstalled
                  ? 'installed'
                  : isCpuTarget || isPasteTarget || (isCoolerTarget && assembly.thermalPasteApplied)
                  ? 'targeted'
                  : assembly.cpuInstalled
                  ? 'installed'
                  : 'empty'
              }
              detailText={
                assembly.coolerInstalled
                  ? `Cooler ${assembly.coolerInstalled.name} fixado sobre a CPU e pasta térmica.`
                  : assembly.thermalPasteApplied
                  ? 'Pasta térmica aplicada sobre o processador. Pronto para o cooler!'
                  : assembly.cpuInstalled && !assembly.socketLeverLocked
                  ? `${assembly.cpuInstalled.name} no soquete. Trave a alavanca para prender os pinos.`
                  : assembly.cpuInstalled
                  ? `${assembly.cpuInstalled.name} preso no soquete. Aplique pasta térmica antes de fixar o cooler.`
                  : 'Soquete vazio. Selecione uma CPU compatível para encaixar.'
              }
              actionText={
                isCpuTarget
                  ? 'Encaixar CPU'
                  : isPasteTarget
                  ? 'Aplicar Pasta Térmica'
                  : isCoolerTarget && !assembly.thermalPasteApplied
                  ? 'Pasta Térmica Obrigatória ⚠'
                  : isCoolerTarget
                  ? 'Instalar Cooler sobre a CPU'
                  : assembly.cpuInstalled && !assembly.coolerInstalled && !assembly.socketLeverLocked
                  ? 'Destravada: Travar Alavanca ⚠'
                  : assembly.cpuInstalled && !assembly.coolerInstalled && !assembly.thermalPasteApplied
                  ? 'Aplicar Pasta Térmica'
                  : undefined
              }
              onAction={
                isCpuTarget || isPasteTarget || isCoolerTarget
                  ? handleCpuAreaClick
                  : assembly.cpuInstalled && !assembly.coolerInstalled && !assembly.socketLeverLocked
                  ? toggleSocketLever
                  : undefined
              }
              secondaryAction={
                assembly.coolerInstalled
                  ? {
                      text: 'Remover Cooler',
                      onClick: removeCooler,
                    }
                  : undefined
              }
            />

            {/* 2. Hotspots: Slots de Memória RAM */}
            <WorkbenchPin
              position={POSITIONS.RAM_SLOT_2}
              icon={<Layers className="w-3.5 h-3.5" />}
              label="DIMM A2 (Slot 2)"
              status={
                assembly.ramInstalledSlot2 ? 'installed' : isRamTarget ? 'targeted' : 'empty'
              }
              detailText={
                assembly.ramInstalledSlot2
                  ? `${assembly.ramInstalledSlot2.name} (Slot Recomendado)`
                  : 'Slot primário recomendado para canal duplo.'
              }
              actionText={
                isRamTarget
                  ? 'Encaixar no Slot 2'
                  : assembly.ramInstalledSlot2
                  ? 'Instalado ✓'
                  : undefined
              }
              onAction={() => {
                if (isRamTarget) installRam(2, selectedComponentForPlacement as never);
              }}
            />

            <WorkbenchPin
              position={POSITIONS.RAM_SLOT_4}
              icon={<Layers className="w-3.5 h-3.5" />}
              label="DIMM B2 (Slot 4)"
              status={
                assembly.ramInstalledSlot4 ? 'installed' : isRamTarget ? 'targeted' : 'empty'
              }
              detailText={
                assembly.ramInstalledSlot4
                  ? `${assembly.ramInstalledSlot4.name} (Dual Channel Ativo)`
                  : 'Slot secundário para completar o Dual Channel.'
              }
              actionText={
                isRamTarget
                  ? 'Encaixar no Slot 4'
                  : assembly.ramInstalledSlot4
                  ? 'Instalado ✓'
                  : undefined
              }
              onAction={() => {
                if (isRamTarget) installRam(4, selectedComponentForPlacement as never);
              }}
            />

            {/* 3. Hotspot: Slot M.2 NVMe SSD */}
            <WorkbenchPin
              position={POSITIONS.M2_SLOT}
              icon={<HardDrive className="w-3.5 h-3.5" />}
              label="Slot M.2 NVMe"
              status={
                assembly.storageInstalled?.storageType.includes('M2')
                  ? 'installed'
                  : isStorageTarget && selectedComponentForPlacement?.storageType.includes('M2')
                  ? 'targeted'
                  : 'empty'
              }
              detailText={
                assembly.storageInstalled?.storageType.includes('M2')
                  ? `${assembly.storageInstalled.name} fixado`
                  : 'Slot PCIe 4.0 para SSDs NVMe velozes.'
              }
              actionText={
                isStorageTarget && selectedComponentForPlacement?.storageType.includes('M2')
                  ? 'Fixar SSD M.2'
                  : undefined
              }
              onAction={() => {
                if (isStorageTarget) installStorage(selectedComponentForPlacement as never, 'M2');
              }}
            />

            {/* 4. Hotspot: Slot PCIe x16 (Placa de Vídeo) */}
            <WorkbenchPin
              position={POSITIONS.PCIE_SLOT}
              icon={<Zap className="w-3.5 h-3.5" />}
              label="PCIe 4.0 x16"
              status={assembly.gpuInstalled ? 'installed' : isGpuTarget ? 'targeted' : 'empty'}
              detailText={
                assembly.gpuInstalled
                  ? `${assembly.gpuInstalled.name} travada no slot`
                  : 'Slot principal reforçado para Placas de Vídeo (GPU).'
              }
              actionText={
                isGpuTarget
                  ? 'Encaixar GPU no Slot'
                  : assembly.gpuInstalled
                  ? 'Placa Instalada ✓'
                  : undefined
              }
              onAction={() => {
                if (isGpuTarget) installGpu(selectedComponentForPlacement as never);
              }}
            />

            {/* 5. Conectores de Cabos com Alvos Físicos Separados */}
            <CableTargetPin
              targetId="ATX_PWR"
              position={POSITIONS.ATX24P_HEADER}
              name="ATX 24P"
            />
            <CableTargetPin
              targetId="ATX12V"
              position={POSITIONS.ATX12V_HEADER}
              name="CPU 8P"
            />
            <CableTargetPin
              targetId="CPU_FAN"
              position={POSITIONS.CPU_FAN_HEADER}
              name="CPU_FAN"
            />

            {/* 6. Painel Frontal (F_PANEL) */}
            <WorkbenchPin
              position={POSITIONS.FPANEL_HEADER}
              icon={<Power className="w-3.5 h-3.5" />}
              label="Painel Frontal"
              status={assembly.frontPanelPowerSwConnected ? 'installed' : 'empty'}
              detailText={
                assembly.frontPanelPowerSwConnected
                  ? 'POWER SW e LEDs do gabinete devidamente conectados.'
                  : 'Conecte os pinos minúsculos do botão liga/desliga (POWER SW).'
              }
              actionText="Abrir Zoom F_PANEL"
              onAction={openFrontPanelModal}
            />
        </Canvas>
      </div>

      {/* ==================================================================================
       * BARRA INFERIOR HUD: LEDS EZ DEBUG E GUIA DE ATALHOS DA BANCADA
       * ================================================================================== */}
      <div className="relative z-40 px-4 py-2 bg-slate-950/90 border-t border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Painel EZ Debug LEDs de Hardware */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-slate-400">EZ Debug:</span>
          <div className="flex items-center gap-2.5">
            {[
              { id: 'cpu', label: 'CPU', state: postResult?.debugLed.cpu },
              { id: 'dram', label: 'DRAM', state: postResult?.debugLed.dram },
              { id: 'vga', label: 'VGA', state: postResult?.debugLed.vga },
              { id: 'boot', label: 'BOOT', state: postResult?.debugLed.boot },
            ].map(({ id, label, state }) => {
              const isGreen = state === 'GREEN';
              const isRed = state === 'RED';
              return (
                <div key={id} className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full transition-all ${
                      isGreen
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                        : isRed
                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse'
                        : 'bg-slate-700'
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      isGreen
                        ? 'text-emerald-300 font-bold'
                        : isRed
                        ? 'text-rose-400 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Guia de Navegação Tátil */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <span>🖱️ <strong className="text-slate-300">Arrastar:</strong> Girar</span>
          <span>•</span>
          <span>📜 <strong className="text-slate-300">Scroll:</strong> Zoom</span>
          <span>•</span>
          <span>✨ <strong className="text-slate-300">Clique no Pino:</strong> Interagir</span>
        </div>
      </div>
    </div>
  );
};

export default Workbench3D;
