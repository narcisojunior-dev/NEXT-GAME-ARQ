'use client';

import React, { Suspense, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useCableDragStore } from '@/components/workbench/cableDragStore';
import { CABLES, CableSpec, CableTargetId, cableTargetById } from '@/engine/cabling';
import { MotherboardComponent } from '@/engine/types';
import { workbenchModelUrl } from '@/engine/workbenchModels';
import { benchPartPlacements } from '@/engine/benchGeometry';
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
  Box,
  Layers as BoxLayers,
  CircuitBoard,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { isWebGLAvailable } from './webglDetect';
import { caseModelUrlFor } from './deskModels';
export { isWebGLAvailable };

/* ====================================================================================
 * COMPONENTE: Placa-Mãe Auto-Normalizada
 * Centraliza e nivela qualquer modelo GLB para o plano XZ em Y=0 com tamanho padrão ~7.2
 * Usa Group Wrapper para garantir centralização exata sem deriva de escala
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
      clone.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(clone);
      size = box.getSize(new THREE.Vector3());
    }

    // 2. Alinha a base em Y=0 e centraliza em X e Z de forma exata
    const center = box.getCenter(new THREE.Vector3());
    clone.position.x -= center.x;
    clone.position.y -= box.min.y;
    clone.position.z -= center.z;

    // 3. Normaliza para a largura padrão do laboratório (7.2 unidades) usando wrapper Group
    const targetWidth = 7.2;
    const scaleFactor = targetWidth / Math.max(0.001, size.x);

    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);
    wrapper.updateMatrixWorld(true);

    // Ajusta materiais para aspecto limpo e sem estouro de brilho. clone(true) compartilha os
    // materiais com o cache do useGLTF: clona antes de alterar, senão a rugosidade vaza para a
    // Vitrine 3D e para as próximas montagens (correção do PR #58)
    const ownedMaterials = new Map<THREE.Material, THREE.Material>();
    const tune = (source: THREE.Material) => {
      let owned = ownedMaterials.get(source);
      if (!owned) {
        owned = source.clone();
        if (owned instanceof THREE.MeshStandardMaterial) owned.roughness = Math.max(0.3, owned.roughness ?? 0.5);
        ownedMaterials.set(source, owned);
      }
      return owned;
    };
    wrapper.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = Array.isArray(child.material) ? child.material.map(tune) : tune(child.material);
      }
    });

    return { root: wrapper, materials: [...ownedMaterials.values()] };
  }, [scene]);

  // Geometrias e texturas pertencem ao cache do useGLTF; só os materiais clonados aqui são nossos
  useEffect(() => () => normalizedScene.materials.forEach((m) => m.dispose()), [normalizedScene]);

  return <primitive object={normalizedScene.root} />;
};

const NO_ROTATION: [number, number, number] = [0, 0, 0];

/* ====================================================================================
 * COMPONENTE: Peça Auto-Normalizada com Animação Opcional de Fan
 * Dimensiona peças para encaixe perfeito nas proporções físicas da placa
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
  rotation = NO_ROTATION,
  isSpinning = false,
}) => {
  const { scene } = useGLTF(modelUrl);
  const fanGroupRef = useRef<THREE.Group>(null);
  // Dependências escalares: um array literal novo a cada render (ex.: rotation={[0, x, 0]})
  // invalidava o useMemo e re-clonava o GLB em todo render da bancada.
  const [rx, ry, rz] = rotation;

  const preparedScene = useMemo(() => {
    const clone = scene.clone(true);

    // 1. Aplica a rotação ANTES de medir: assim a peça girada (ex.: pente de RAM em pé)
    //    continua com a face inferior assentada em Y=0, em vez de afundar metade na placa.
    const rotated = new THREE.Group();
    rotated.rotation.set(rx, ry, rz);
    rotated.add(clone);
    rotated.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(rotated);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // 2. Centraliza em X e Z e assenta a face inferior em Y=0 (espaço já rotacionado)
    rotated.position.set(-center.x, -box.min.y, -center.z);

    // 3. Normaliza para o tamanho alvo na maior dimensão
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = targetSize / Math.max(0.001, maxDim);

    const wrapper = new THREE.Group();
    wrapper.add(rotated);
    wrapper.scale.setScalar(scaleFactor);
    wrapper.updateMatrixWorld(true);

    wrapper.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return wrapper;
  }, [scene, targetSize, rx, ry, rz]);

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
 * COMPONENTE: Bloco da Bomba do Water Cooler (AIO)
 * O GLB cooler-aio-240 contém apenas um fragmento (placa de 0.03 × 0.39 × 0.12) e, normalizado,
 * virava uma lâmina fina em pé sobre a CPU. A bomba é procedural: base de cobre + corpo + rotor.
 * ==================================================================================== */
/** Largura da base de cobre da bomba desenhada abaixo (a escala ajusta para 60 mm reais) */
const AIO_PUMP_BASE = 0.82;

const AioPumpBlock: React.FC<{ position: [number, number, number]; scale?: number; isRunning?: boolean }> = ({
  position,
  scale = 1,
  isRunning = false,
}) => {
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (isRunning && rotorRef.current) {
      rotorRef.current.rotation.y += delta * 6;
    }
  });

  return (
    <group position={position} scale={scale}>
      {/* Base de cobre (cold plate) em contato com a pasta */}
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.03, 0.82]} />
        <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Corpo da bomba */}
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.4, 0.28, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.45} />
      </mesh>
      {/* Tampa com anel de LED e rotor (gira apenas com o PC ligado) */}
      <group ref={rotorRef} position={[0, 0.315, 0]}>
        <mesh>
          <torusGeometry args={[0.28, 0.025, 12, 40]} />
          <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={isRunning ? 1.2 : 0.25} />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.42, 0.012, 0.06]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      {/* Mangueiras saindo para o radiador */}
      {[-0.14, 0.14].map((z) => (
        <mesh key={z} position={[0.42, 0.2, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, 0.22, 16]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

/* ====================================================================================
 * COMPONENTE: Chassi 3D do Gabinete (CaseEnclosure)
 * Envolve a montagem para visualizar os componentes dentro do gabinete
 * ==================================================================================== */
interface CaseEnclosureProps {
  modelUrl: string;
  isGlassOpen: boolean;
  isSpinning?: boolean;
}

const CaseEnclosure: React.FC<CaseEnclosureProps> = ({
  modelUrl,
  isGlassOpen,
  isSpinning = false,
}) => {
  const { scene } = useGLTF(modelUrl);
  const fanGroupRef = useRef<THREE.Group>(null);

  const preparedCase = useMemo(() => {
    const clone = scene.clone(true);

    // Rotação: Deita o gabinete na bancada com a abertura do vidro virada para cima (+Y)
    clone.rotation.set(0, Math.PI / 2, -Math.PI / 2);
    clone.updateMatrixWorld(true);

    let box = new THREE.Box3().setFromObject(clone);
    let size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Centraliza o chassi em X e Z, assentando a bandeja interna em Y=0
    clone.position.x -= center.x;
    clone.position.y -= box.min.y;
    clone.position.z -= center.z;

    const targetDimension = 11.6;
    const maxDim = Math.max(size.x, size.z);
    const scaleFactor = targetDimension / Math.max(0.001, maxDim);

    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);
    wrapper.updateMatrixWorld(true);

    wrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const nameLower = mesh.name.toLowerCase();
        // Painel lateral de vidro temperado
        if (nameLower.includes('glass')) {
          if (isGlassOpen) {
            mesh.visible = false;
          } else {
            mesh.visible = true;
            mesh.material = new THREE.MeshPhysicalMaterial({
              color: 0x111c2a,
              transparent: true,
              opacity: 0.32,
              roughness: 0.05,
              metalness: 0.1,
              transmission: 0.85,
              thickness: 0.8,
            });
          }
        }
      }
    });

    return wrapper;
  }, [scene, isGlassOpen]);

  useFrame((_, delta) => {
    if (isSpinning && fanGroupRef.current) {
      fanGroupRef.current.rotation.y += delta * 8;
    }
  });

  return (
    <group position={[0.2, -0.25, 0.1]}>
      <primitive object={preparedCase} />
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
  visible?: boolean;
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
  visible = true,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const detailId = useId();

  if (!visible) return null;

  const isTargeted = status === 'targeted';
  const isInstalled = status === 'installed';

  return (
    <group position={position}>
      <Html center distanceFactor={9} zIndexRange={[25, 0]}>
        {/* Aberto por hover OU por foco em qualquer elemento do pino (inclusive os botões do
            próprio tooltip), para que o Tab alcance "Remover Cooler" e as demais ações */}
        <div
          data-cable-target={dataCableTarget}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocus={() => setIsHovered(true)}
          onBlur={(e) => {
            const next = e.relatedTarget;
            if (!(next instanceof Node) || !e.currentTarget.contains(next)) setIsHovered(false);
          }}
          onKeyDown={(e) => {
            // WCAG 1.4.13: o conteúdo exibido no foco/hover pode ser dispensado sem mover o foco
            if (e.key === 'Escape') setIsHovered(false);
          }}
          className="relative flex items-center justify-center select-none"
        >
          {/* Botão circular tátil compacto (28x28px com hit-area de 44x44px) */}
          <button
            type="button"
            onClick={onAction}
            aria-label={label}
            aria-describedby={detailId}
            className={`relative flex items-center justify-center w-7 h-7 rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
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
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-slate-950 ${
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

          {/* Tooltip técnico: pb-2 (e não mb-2) mantém a área de hover contínua entre o pino e o
              cartão — com margem, o mouse "caía" no vão e o tooltip sumia antes do clique */}
          {isHovered && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-50 pb-2 pointer-events-auto">
            <div
              role="group"
              aria-label={`Ações: ${label}`}
              className="min-w-[180px] max-w-[230px] p-2 rounded-xl bg-slate-950/95 border border-cyan-500/50 shadow-2xl backdrop-blur-lg text-left animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between gap-1 pb-1 mb-1 border-b border-slate-800 font-mono text-[11px] font-bold text-cyan-300">
                <span className="truncate">{label}</span>
                {isInstalled && (
                  <span className="flex items-center gap-0.5 text-[11px] text-emerald-400 font-normal">
                    <CheckCircle2 className="w-3 h-3" />
                    OK
                  </span>
                )}
              </div>

              <p aria-hidden="true" className="text-[11px] font-mono text-slate-300 leading-tight mb-1.5">
                {detailText}
              </p>

              {badgeContent && <div className="mb-1.5">{badgeContent}</div>}

              {/* Botões de Ação Contextual dentro do Tooltip */}
              <div className="flex flex-col gap-1">
                {actionText && onAction && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction();
                    }}
                    className={`w-full py-1 px-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isTargeted
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md animate-pulse motion-reduce:animate-none'
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
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      secondaryAction.onClick();
                    }}
                    className="w-full py-0.5 px-2 rounded text-[11px] font-mono text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-800/60 transition-all cursor-pointer"
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
  visible?: boolean;
}> = ({ targetId, position, name, visible }) => {
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
  const isPinVisible = visible ?? Boolean(heldCableId || isDragging || !connectedCable);

  return (
    <WorkbenchPin
      visible={isPinVisible}
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
    pos: new THREE.Vector3(0, 11.2, 0.7),
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
  const [viewMode, setViewMode] = useState<'bench' | 'case'>('bench');
  const [isGlassOpen, setIsGlassOpen] = useState(true);
  const [transitionTarget, setTransitionTarget] = useState<CameraTransitionTarget | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const {
    selectedMotherboard,
    installMotherboard,
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
    // Seletor raso: sem ele a bancada 3D re-renderizava a cada tick do cronômetro (1 s)
    useShallow((s) => ({
      selectedMotherboard: s.selectedMotherboard,
      installMotherboard: s.installMotherboard,
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

  // Seleciona o modelo 3D e layout físico fiel à plataforma de cada placa-mãe
  const targetMb =
    selectedMotherboard ??
    (selectedComponentForPlacement?.category === 'MOTHERBOARD'
      ? (selectedComponentForPlacement as MotherboardComponent)
      : null);

  // Geometria da bancada vem do motor (engine/benchGeometry): a MESMA função que os testes de
  // encaixe percorrem em todas as montagens do catálogo — o que é desenhado é o que foi verificado
  const placements = useMemo(() => benchPartPlacements(assembly, targetMb), [assembly, targetMb]);
  const layout = placements.board.layout;
  const mbModelUrl = workbenchModelUrl(placements.board.modelId);
  const ihsTopY = placements.ihsTopY;

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
    const selected = selectedComponentForPlacement;
    if (selected?.category === 'CPU') {
      installCpu(selected);
    } else if (selected?.category === 'PASTE') {
      applyThermalPaste();
    } else if (selected?.category === 'COOLER') {
      // A ordem CPU → Pasta → Cooler é validada no motor (validateCoolerPrerequisites), igual na bancada 2D
      installCooler(selected);
    }
  };

  return (
    <div className="relative w-full h-[580px] rounded-2xl overflow-hidden border border-slate-800 bg-[#070b14] shadow-2xl flex flex-col select-none">
      {/* ==================================================================================
       * BARRA SUPERIOR DE FERRAMENTAS E CONTROLES DE CÂMERA
       * ================================================================================== */}
      <div className="absolute top-3 left-3 right-3 z-40 flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        {/* Identificador de Placa e Modo 3D */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
          <span className="text-slate-200 font-bold">Bancada 3D Interativa</span>
          <span className="text-slate-600">/</span>
          <span className="text-cyan-300 font-semibold truncate max-w-[200px]">
            {selectedMotherboard
              ? selectedMotherboard.name
              : selectedComponentForPlacement?.category === 'MOTHERBOARD'
              ? `${selectedComponentForPlacement.name} (Pronta para assentar)`
              : 'Bancada Vazia'}
          </span>
        </div>

        {/* Controles de Câmera e Modos */}
        <div className="flex flex-wrap items-center justify-end gap-2 pointer-events-auto">
          {/* Presets de Câmera */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              type="button"
              aria-pressed={activePreset === 'iso'}
              onClick={() => applyViewPreset('iso')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
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
              aria-pressed={activePreset === 'top'}
              onClick={() => applyViewPreset('top')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
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
              aria-pressed={activePreset === 'front'}
              onClick={() => applyViewPreset('front')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
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

          {/* Alternador Bancada Aberta / Montagem no Gabinete */}
          <button
            onClick={() => setViewMode((prev) => (prev === 'bench' ? 'case' : 'bench'))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-mono transition-all border shadow-lg cursor-pointer ${
              viewMode === 'case'
                ? 'bg-purple-950/90 border-purple-400 text-purple-200 ring-2 ring-purple-400/40'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/60'
            }`}
            title="Alternar entre visualização na Bancada Aberta e montado Dentro do Gabinete"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{viewMode === 'case' ? 'No Gabinete' : 'Levar ao Gabinete'}</span>
          </button>

          {viewMode === 'case' && (
            <button
              onClick={() => setIsGlassOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-xs font-mono text-slate-300 hover:text-white cursor-pointer shadow-lg"
              title={isGlassOpen ? 'Fechar Vidro Temperado' : 'Abrir Vidro Lateral'}
            >
              <span>{isGlassOpen ? 'Vidro: Aberto' : 'Vidro: Fechado'}</span>
            </button>
          )}

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
          <mesh
            position={[0, -0.01, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={() => {
              if (selectedComponentForPlacement?.category === 'MOTHERBOARD') {
                installMotherboard(selectedComponentForPlacement as never);
              }
            }}
          >
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#0a101f" roughness={0.85} metalness={0.1} />
          </mesh>
          <gridHelper args={[18, 36, '#1e293b', '#0f172a']} position={[0, 0, 0]} />

          <Suspense
            fallback={
              <Html center>
                <div className="bg-slate-900/90 border border-cyan-500/50 text-cyan-300 font-mono text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando Bancada 3D…</span>
                </div>
              </Html>
            }
          >
            {/* 0. Gabinete 3D Envolvente (Quando em modo No Gabinete) */}
            {viewMode === 'case' && (
              <CaseEnclosure
                modelUrl={caseModelUrlFor(assembly.caseInstalled)}
                isGlassOpen={isGlassOpen}
                isSpinning={Boolean(postResult?.bootSuccess)}
              />
            )}

            {/* Quando a Bancada ainda não possui placa-mãe assentada */}
            {!selectedMotherboard ? (
              <group position={[0, 0.02, 0]}>
                {/* Holograma demarcador de área no tapete antiestático */}
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  onClick={() => {
                    if (selectedComponentForPlacement?.category === 'MOTHERBOARD') {
                      installMotherboard(selectedComponentForPlacement as never);
                    }
                  }}
                >
                  <planeGeometry args={[7.2, 7.2]} />
                  <meshStandardMaterial
                    color={selectedComponentForPlacement?.category === 'MOTHERBOARD' ? '#06b6d4' : '#334155'}
                    transparent
                    opacity={selectedComponentForPlacement?.category === 'MOTHERBOARD' ? 0.3 : 0.12}
                    wireframe
                  />
                </mesh>

                {/* Card Didático 3D Flutuante no centro da bancada */}
                <Html center position={[0, 0.35, 0]} distanceFactor={9}>
                  {selectedComponentForPlacement?.category === 'MOTHERBOARD' ? (
                    <button
                      onClick={() => installMotherboard(selectedComponentForPlacement as never)}
                      className="px-5 py-3 rounded-2xl bg-cyan-950/95 border-2 border-cyan-400 text-cyan-200 font-mono shadow-2xl shadow-cyan-500/50 hover:bg-cyan-900 transition-all cursor-pointer animate-pulse flex flex-col items-center gap-1.5 min-w-[280px]"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <CircuitBoard className="w-5 h-5 text-cyan-400 animate-spin" />
                        <span>CLIQUE PARA ASSENTAR NA BANCADA</span>
                      </div>
                      <span className="text-xs text-cyan-300 font-semibold">{selectedComponentForPlacement.name}</span>
                      <span className="text-[11px] text-cyan-400/80">
                        {(selectedComponentForPlacement as MotherboardComponent).socket} • {(selectedComponentForPlacement as MotherboardComponent).supportedRam} • {(selectedComponentForPlacement as MotherboardComponent).formFactor}
                      </span>
                    </button>
                  ) : (
                    <div className="px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-300 font-mono text-xs shadow-xl flex items-center gap-2 pointer-events-none">
                      <CircuitBoard className="w-4 h-4 text-cyan-400" />
                      <span>Bancada Pronta: Selecione uma Placa-Mãe no menu lateral</span>
                    </div>
                  )}
                </Html>
              </group>
            ) : (
              <>
                {/* 1. Placa-Mãe Auto-Normalizada (remount limpo com key) */}
                <AutoNormalizedMotherboard key={mbModelUrl} modelUrl={mbModelUrl} />

                {/* Botão de substituição rápida caso o usuário selecione outra placa no menu lateral */}
                {selectedComponentForPlacement?.category === 'MOTHERBOARD' &&
                  selectedComponentForPlacement.id !== selectedMotherboard.id && (
                    <Html center position={[0, 1.4, 0]} distanceFactor={9}>
                      <button
                        onClick={() => installMotherboard(selectedComponentForPlacement as never)}
                        className="px-4 py-2 rounded-xl bg-amber-950/95 border-2 border-amber-400 text-amber-200 font-mono shadow-xl hover:bg-amber-900 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
                      >
                        <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>Substituir Placa por {selectedComponentForPlacement.name}</span>
                      </button>
                    </Html>
                  )}

            {/* 2. Peças Físicas Instaladas (posições, tamanhos reais e rotações do motor) */}
            {placements.parts.map((p) =>
              p.modelId ? (
                <AutoNormalizedPart
                  key={p.part}
                  modelUrl={workbenchModelUrl(p.modelId)}
                  targetSize={p.targetSize}
                  position={p.position}
                  rotation={p.rotation}
                />
              ) : (
                <AioPumpBlock
                  key={p.part}
                  position={p.position}
                  scale={(p.box.max[0] - p.box.min[0]) / AIO_PUMP_BASE}
                  isRunning={Boolean(postResult?.bootSuccess)}
                />
              )
            )}

            {/* Pasta Térmica: gota do tamanho de uma ervilha exatamente sobre o IHS da CPU */}
            {assembly.cpuInstalled && assembly.thermalPasteApplied && !assembly.coolerInstalled && (
              <mesh
                position={[layout.CPU_SOCKET[0], ihsTopY, layout.CPU_SOCKET[2]]}
                scale={[1, 0.4, 1]}
                castShadow
              >
                <sphereGeometry args={[0.13, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#c4c4cc" roughness={0.3} metalness={0.7} />
              </mesh>
            )}
              </>
            )}
          </Suspense>

          {/* ==============================================================================
           * HOTSPOTS TÁTEIS (PINS) NOS QUADRANTES FÍSICOS DA PLACA (Apenas com placa assentada)
           * ============================================================================== */}
          {selectedMotherboard && (
            <>
              {/* 1. Hotspot: Soquete CPU */}
              <WorkbenchPin
              position={layout.CPU_SOCKET}
              icon={<Cpu className="w-4 h-4" />}
              label="Soquete CPU"
              visible={!assembly.coolerInstalled || isCpuTarget || isPasteTarget || isCoolerTarget}
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

            {/* 2. Hotspots: Slots de Memória RAM (Contextuais para zero sobreposição) */}
            <WorkbenchPin
              position={layout.RAM_SLOT_2}
              icon={<Layers className="w-3.5 h-3.5" />}
              label="DIMM A2 (Slot 2)"
              visible={!assembly.ramInstalledSlot2 || isRamTarget}
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
              position={layout.RAM_SLOT_4}
              icon={<Layers className="w-3.5 h-3.5" />}
              label="DIMM B2 (Slot 4)"
              visible={(!assembly.ramInstalledSlot4 && Boolean(assembly.ramInstalledSlot2)) || isRamTarget}
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
              position={layout.M2_SLOT}
              icon={<HardDrive className="w-3.5 h-3.5" />}
              label="Slot M.2 NVMe"
              visible={!assembly.storageInstalled || isStorageTarget}
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
              position={layout.PCIE_SLOT}
              icon={<Zap className="w-3.5 h-3.5" />}
              label="PCIe 4.0 x16"
              visible={!assembly.gpuInstalled || isGpuTarget}
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
              position={layout.ATX24P_HEADER}
              name="ATX 24P"
            />
            <CableTargetPin
              targetId="ATX12V"
              position={layout.ATX12V_HEADER}
              name="CPU 8P"
            />
            <CableTargetPin
              targetId="CPU_FAN"
              position={layout.CPU_FAN_HEADER}
              name="CPU_FAN"
            />

            {/* Conector de Energia PCIe 8P da GPU (Obrigatório para placas de vídeo dedicadas) */}
            {assembly.gpuInstalled && assembly.gpuInstalled.powerPins !== 'none' && (
              <CableTargetPin
                targetId="GPU_POWER"
                position={placements.gpuPowerAnchor ?? layout.PCIE_SLOT}
                name="PCIe 8P (GPU)"
              />
            )}

            {/* 6. Painel Frontal (F_PANEL) */}
            <WorkbenchPin
              position={layout.FPANEL_HEADER}
              icon={<Power className="w-3.5 h-3.5" />}
              label="Painel Frontal"
              visible={!assembly.frontPanelPowerSwConnected}
              status={assembly.frontPanelPowerSwConnected ? 'installed' : 'empty'}
              detailText={
                assembly.frontPanelPowerSwConnected
                  ? 'POWER SW e pinos do painel frontal devidamente conectados e verificados.'
                  : 'Conecte os pinos minúsculos do botão liga/desliga (POWER SW).'
              }
              actionText={
                assembly.frontPanelPowerSwConnected
                  ? 'Painel Frontal Conectado ✓'
                  : 'Ligar Painel Frontal (F_PANEL)'
              }
              onAction={openFrontPanelModal}
            />
          </>
        )}
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
                    className={`text-[11px] ${
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
