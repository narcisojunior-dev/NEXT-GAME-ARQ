'use client';

import React, { Suspense, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useCableDragStore } from '@/components/workbench/cableDragStore';
import { CABLES, CableSpec, CableTargetId, cableTargetById } from '@/engine/cabling';
import { AssemblyState, MotherboardComponent } from '@/engine/types';
import { workbenchModelUrl } from '@/engine/workbenchModels';
import { AIO_PUMP_MM, BenchPartId, benchPartPlacements } from '@/engine/benchGeometry';
import { calculateBenchmark } from '@/engine/benchmark';
import { CutawayPartId, SUBSYSTEM_LABELS as SUBSYSTEM_LABELS_3D, poseCutaway } from '@/engine/cutaway';
import { QUALITY_LABELS, QUALITY_SETTINGS, QualityPreference, resolveQualityTier } from '@/engine/qualityTier';
import { useProgressStore } from '@/store/useProgressStore';
import { useCutawayStore } from './cutawayStore';
import { CutawayPanel } from '@/components/workbench/CutawayPanel';
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
  Lock,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

import { getWebGLRenderer, isWebGLAvailable } from './webglDetect';
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
  /** Identificador da peça na sonda de geometria (testes E2E de encaixe) */
  benchPart?: string;
  /** Opacidade (modo "Abrir o PC": peças fora do subsistema isolado ficam esmaecidas) */
  opacity?: number;
}

const AutoNormalizedPart: React.FC<AutoNormalizedPartProps> = ({
  modelUrl,
  targetSize,
  position,
  rotation = NO_ROTATION,
  isSpinning = false,
  benchPart,
  opacity = 1,
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

  // Esmaecer clona os materiais (os do cache do useGLTF são compartilhados) e devolve os originais ao sair
  useEffect(() => {
    if (opacity >= 1) return;
    const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const fade = (m: THREE.Material) => {
      const faded = m.clone();
      faded.transparent = true;
      faded.opacity = opacity;
      faded.depthWrite = false;
      return faded;
    };
    preparedScene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originals.set(child, child.material);
        child.material = Array.isArray(child.material) ? child.material.map(fade) : fade(child.material);
      }
    });
    return () => {
      originals.forEach((material, mesh) => {
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
        mesh.material = material;
      });
    };
  }, [preparedScene, opacity]);

  useFrame((_, delta) => {
    if (isSpinning && fanGroupRef.current) {
      fanGroupRef.current.rotation.y += delta * 12;
    }
  });

  return (
    <group position={position} userData={{ benchPart }}>
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
/** Altura total da bomba na mesma escala: 40 mm reais para 60 mm de base (AIO_PUMP_MM do motor) */
const AIO_PUMP_HEIGHT = (AIO_PUMP_BASE * AIO_PUMP_MM[1]) / AIO_PUMP_MM[0];
/** Topo do corpo, onde ficam a tampa iluminada e as conexões das mangueiras */
const AIO_PUMP_BODY_TOP = 0.43;

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

  // Tudo cabe na caixa física da bomba (60 × 40 × 60 mm): o teste E2E compara a caixa desenhada com a do motor
  const fittingHeight = AIO_PUMP_HEIGHT - AIO_PUMP_BODY_TOP;
  return (
    <group position={position} scale={scale}>
      {/* Base de cobre (cold plate) em contato com a pasta */}
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[AIO_PUMP_BASE, 0.03, AIO_PUMP_BASE]} />
        <meshStandardMaterial color="#b87333" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* Corpo da bomba */}
      <mesh position={[0, (0.03 + AIO_PUMP_BODY_TOP) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.4, AIO_PUMP_BODY_TOP - 0.03, 40]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.45} />
      </mesh>
      {/* Tampa com anel de LED deitado e rotor (gira apenas com o PC ligado) */}
      <group ref={rotorRef} position={[0, AIO_PUMP_BODY_TOP + 0.01, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.24, 0.02, 12, 40]} />
          <meshStandardMaterial color="#22d3ee" emissive="#0891b2" emissiveIntensity={isRunning ? 1.2 : 0.25} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.38, 0.012, 0.06]} />
          <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      {/* Conexões das mangueiras no topo (as mangueiras seguem até o radiador, fora da placa) */}
      {[-0.14, 0.14].map((z) => (
        <mesh key={z} position={[0.3, AIO_PUMP_BODY_TOP + fittingHeight / 2, z]} castShadow>
          <cylinderGeometry args={[0.045, 0.045, fittingHeight, 16]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
};

/* ====================================================================================
 * COMPONENTE: Disco SATA (SSD 2,5" ou HD 3,5") deitado no tapete, no tamanho real do motor
 * ==================================================================================== */
const SataDriveBlock: React.FC<{ box: { min: [number, number, number]; max: [number, number, number] }; isHdd: boolean }> = ({
  box,
  isHdd,
}) => {
  const size: [number, number, number] = [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]];
  const center: [number, number, number] = [(box.min[0] + box.max[0]) / 2, box.min[1] + size[1] / 2, (box.min[2] + box.max[2]) / 2];
  return (
    <group position={center}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={isHdd ? '#9ca3af' : '#1f2937'} metalness={isHdd ? 0.7 : 0.3} roughness={0.45} />
      </mesh>
      {/* Etiqueta no topo (fica dentro da caixa física: 0,1 % da altura acima não conta) */}
      <mesh position={[0, size[1] / 2 - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size[0] * 0.6, size[2] * 0.55]} />
        <meshStandardMaterial color={isHdd ? '#1e3a8a' : '#0e7490'} />
      </mesh>
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

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
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
/** prefers-reduced-motion (RNF09): mola vira corte, ventoinhas param, câmera não se desloca */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Encaixe com mola (#38): a peça recém-instalada desce até o slot e assenta com um leve quique */
const SpringDrop: React.FC<{ animate: boolean; children: React.ReactNode }> = ({ animate, children }) => {
  const ref = useRef<THREE.Group>(null);
  const state = useRef({ y: animate ? 1.4 : 0, v: 0 });
  useFrame((_, delta) => {
    const s = state.current;
    if (Math.abs(s.y) < 1e-4 && Math.abs(s.v) < 1e-4) return;
    const dt = Math.min(delta, 1 / 30);
    s.v += (-220 * s.y - 18 * s.v) * dt;
    s.y += s.v * dt;
    if (Math.abs(s.y) < 1e-4 && Math.abs(s.v) < 1e-3) {
      s.y = 0;
      s.v = 0;
    }
    if (ref.current) ref.current.position.y = s.y;
  });
  return (
    <group ref={ref} position={[0, state.current.y, 0]}>
      {children}
    </group>
  );
};

/** Hélice girando sobre a face frontal (+Z) de uma peça: ventoinhas no teste de boot (#38) */
const FanRotor: React.FC<{ position: [number, number, number]; radius: number; spinning: boolean }> = ({ position, radius, spinning }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (spinning && ref.current) ref.current.rotation.z -= delta * 18;
  });
  return (
    <group position={position}>
      <group ref={ref}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 7]} position={[0, 0, 0.004]}>
            <boxGeometry args={[radius * 0.32, radius * 0.92, 0.008]} />
            <meshStandardMaterial color="#334155" transparent opacity={spinning ? 0.55 : 0} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** LEDs de diagnóstico (EZ Debug) na própria placa: acendem no teste de boot (#38) */
const DebugLeds3D: React.FC<{ position: [number, number, number]; states: ('GREEN' | 'RED' | 'OFF' | undefined)[] }> = ({ position, states }) => (
  <group position={position}>
    {states.map((state, i) => (
      <mesh key={i} position={[0, 0.03, i * 0.16 - 0.24]}>
        <boxGeometry args={[0.1, 0.05, 0.08]} />
        <meshStandardMaterial
          color={state === 'GREEN' ? '#34d399' : state === 'RED' ? '#f43f5e' : '#1e293b'}
          emissive={state === 'GREEN' ? '#10b981' : state === 'RED' ? '#e11d48' : '#000000'}
          emissiveIntensity={state === 'GREEN' || state === 'RED' ? 2.2 : 0}
        />
      </mesh>
    ))}
  </group>
);

/** Fonte ATX no tamanho real: só aparece na vista explodida (#60) */
const PsuBlock: React.FC<{ box: { min: [number, number, number]; max: [number, number, number] } }> = ({ box }) => {
  const size: [number, number, number] = [box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]];
  return (
    <group position={[(box.min[0] + box.max[0]) / 2, box.min[1] + size[1] / 2, (box.min[2] + box.max[2]) / 2]}>
      <mesh castShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[Math.min(size[0], size[2]) * 0.38, 32]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
  );
};

/**
 * Anima o número de abertura com mola e aplica a pose do motor (poseCutaway) a cada peça:
 * a vista explodida (#38) e o modo "Abrir o PC" (#61) leem a MESMA pose.
 */
const CutawayRig: React.FC<{
  groups: React.MutableRefObject<Map<CutawayPartId, THREE.Group>>;
  assembly: AssemblyState;
  motherboard: MotherboardComponent | null;
  reducedMotion: boolean;
}> = ({ groups, assembly, motherboard, reducedMotion }) => {
  const mode = useCutawayStore((s) => s.mode);
  const selection = useCutawayStore((s) => s.selection);
  const benchmark = useMemo(() => calculateBenchmark(assembly, motherboard), [assembly, motherboard]);
  const anim = useRef({ opening: 0, v: 0 });
  const last = useRef<{ key: string; assembly: AssemblyState | null }>({ key: '', assembly: null });

  useFrame((_, delta) => {
    const target = mode === 'OFF' ? 0 : 1;
    const a = anim.current;
    if (reducedMotion) {
      a.opening = target;
      a.v = 0;
    } else if (a.opening !== target || a.v !== 0) {
      const dt = Math.min(delta, 1 / 30);
      a.v += (-90 * (a.opening - target) - 17 * a.v) * dt;
      a.opening += a.v * dt;
      if (Math.abs(a.opening - target) < 1e-3 && Math.abs(a.v) < 1e-3) {
        a.opening = target;
        a.v = 0;
      }
    }
    const isolated = mode === 'OPEN' ? selection : null;
    const key = `${a.opening.toFixed(4)}|${isolated}`;
    if (key === last.current.key && last.current.assembly === assembly) return;
    last.current = { key, assembly };
    const pose = poseCutaway(assembly, motherboard, benchmark, isolated, Math.max(0, a.opening));
    pose.parts.forEach((p) => {
      const group = groups.current.get(p.part);
      if (group) group.position.set(p.position[0] - p.basePosition[0], p.position[1] - p.basePosition[1], p.position[2] - p.basePosition[2]);
    });
    const psu = groups.current.get('PSU');
    if (psu) psu.visible = a.opening > 0.02;
  });
  return null;
};

/**
 * Sonda de geometria (apenas fora de produção): expõe as caixas REAIS das peças desenhadas na
 * cena, medidas pelo three.js, para o teste E2E comparar com a física de encaixe do motor.
 */
const BenchSceneProbe: React.FC = () => {
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const readBoxes = () => {
      const boxes: Record<string, { min: number[]; max: number[] }> = {};
      scene.updateMatrixWorld(true);
      scene.traverse((object) => {
        const id: unknown = object.userData.benchPart;
        if (typeof id !== 'string') return;
        const box = new THREE.Box3().setFromObject(object);
        if (!box.isEmpty()) boxes[id] = { min: box.min.toArray(), max: box.max.toArray() };
      });
      return boxes;
    };
    Object.assign(window, { __pcbaBenchBoxes: readBoxes });
    return () => {
      Reflect.deleteProperty(window, '__pcbaBenchBoxes');
    };
  }, [scene]);
  return null;
};

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
    screwGpu,
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
      screwGpu: s.screwGpu,
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

  // Vista explodida (#38) e modo "Abrir o PC" (#61): mesma pose do motor (poseCutaway)
  const reducedMotion = usePrefersReducedMotion();
  const cutawayMode = useCutawayStore((s) => s.mode);
  const cutawaySelection = useCutawayStore((s) => s.selection);
  const setCutawayMode = useCutawayStore((s) => s.setMode);
  const benchmark = useMemo(() => calculateBenchmark(assembly, targetMb), [assembly, targetMb]);
  const openPose = useMemo(
    () => poseCutaway(assembly, targetMb, benchmark, cutawayMode === 'OPEN' ? cutawaySelection : null, 1),
    [assembly, targetMb, benchmark, cutawayMode, cutawaySelection]
  );
  const psuBox = useMemo(
    () => poseCutaway(assembly, targetMb, benchmark, null, 0).parts.find((p) => p.part === 'PSU')?.box ?? null,
    [assembly, targetMb, benchmark]
  );
  const partGroups = useRef(new Map<CutawayPartId, THREE.Group>());
  const registerPart = (id: CutawayPartId) => (group: THREE.Group | null) => {
    if (group) partGroups.current.set(id, group);
    else partGroups.current.delete(id);
  };
  const opacityOf = (id: CutawayPartId) => (cutawayMode === 'OPEN' ? openPose.parts.find((p) => p.part === id)?.opacity ?? 1 : 1);

  // Encaixe com mola só para peças instaladas depois do primeiro render (recarregar a página não faz tudo cair)
  const seenParts = useRef<Set<BenchPartId> | null>(null);
  if (seenParts.current === null) seenParts.current = new Set(placements.parts.map((p) => p.part));
  useEffect(() => {
    seenParts.current = new Set(placements.parts.map((p) => p.part));
  }, [placements]);

  // Nível de qualidade (#63): pelo renderer do WebGL ou pela escolha do aluno (salva no progresso)
  const qualityPreference = useProgressStore((s) => s.qualityPreference);
  const setQualityPreference = useProgressStore((s) => s.setQualityPreference);
  const renderer = useMemo(() => getWebGLRenderer(), []);
  const qualityTier = resolveQualityTier(renderer, qualityPreference);
  const quality = QUALITY_SETTINGS[qualityTier];
  const isSpinning = Boolean(postResult?.bootSuccess) && !reducedMotion;
  const mbModelUrl = workbenchModelUrl(placements.board.modelId);
  const ihsTopY = placements.ihsTopY;

  // Câmera acompanha o modo "Abrir o PC" (sem deslocamento com movimento reduzido)
  const previousCutawayMode = useRef(cutawayMode);
  useEffect(() => {
    const leaving = cutawayMode === 'OFF' && previousCutawayMode.current !== 'OFF';
    previousCutawayMode.current = cutawayMode;
    if (reducedMotion) return;
    if (cutawayMode === 'OFF') {
      // Sair do modo devolve o enquadramento da bancada
      if (leaving) setTransitionTarget(PRESET_VIEWS.iso);
      return;
    }
    setTransitionTarget(
      cutawaySelection
        ? { pos: new THREE.Vector3(7.2, 7.6, 9.4), target: new THREE.Vector3(0, 2, 0) }
        : { pos: new THREE.Vector3(8.6, 10.2, 9.6), target: new THREE.Vector3(0, 1.2, 0) }
    );
  }, [cutawayMode, cutawaySelection, reducedMotion]);

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

          {/* Vista explodida para estudar a ordem de montagem (#38) */}
          <button
            type="button"
            aria-pressed={cutawayMode === 'EXPLODED'}
            disabled={placements.parts.length === 0 || cutawayMode === 'OPEN'}
            onClick={() => setCutawayMode(cutawayMode === 'EXPLODED' ? 'OFF' : 'EXPLODED')}
            className={`px-3 py-1.5 rounded-xl backdrop-blur-md text-xs font-mono border shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              cutawayMode === 'EXPLODED'
                ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/40'
                : 'bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-cyan-300'
            }`}
            title="Separa as peças na ordem de montagem (de cima para baixo)"
          >
            Vista Explodida
          </button>

          {/* Nível de qualidade (#63) */}
          <label className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-slate-300 shadow-lg">
            <span>Qualidade</span>
            <select
              value={qualityPreference}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'AUTO' || value === 'LEVE' || value === 'ALTA') setQualityPreference(value);
              }}
              className="bg-slate-950 text-slate-200 rounded-md px-1 py-0.5 border border-slate-700"
              aria-describedby="nivel-qualidade-ativo"
            >
              {(Object.keys(QUALITY_LABELS) as QualityPreference[]).map((key) => (
                <option key={key} value={key}>
                  {QUALITY_LABELS[key]}
                </option>
              ))}
            </select>
            <span id="nivel-qualidade-ativo" className="sr-only">
              Nível ativo: {qualityTier === 'LEVE' ? 'leve' : 'alta'}
            </span>
          </label>

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
        {cutawayMode === 'OPEN' && (
          <div className="absolute right-3 top-28 z-40">
            <CutawayPanel variant="3d" />
          </div>
        )}
        <Canvas
          // Antialias é atributo do contexto WebGL: trocar de nível recria o Canvas
          key={qualityTier}
          camera={{ position: [6.2, 8.2, 7.2], fov: 42 }}
          gl={{ antialias: quality.antialias, alpha: false, powerPreference: 'high-performance' }}
          // Nível leve (vídeo integrado): pixel ratio 1; alto: até 1,5 (Retina/4K)
          dpr={quality.dpr}
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

          <BenchSceneProbe />
          {selectedMotherboard && (
            <CutawayRig groups={partGroups} assembly={assembly} motherboard={targetMb} reducedMotion={reducedMotion} />
          )}

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
            shadow-mapSize={[quality.shadowMapSize, quality.shadowMapSize]}
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
                <group userData={{ benchPart: 'BOARD' }}>
                  <AutoNormalizedMotherboard key={mbModelUrl} modelUrl={mbModelUrl} />
                </group>

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
            {placements.parts.map((p) => {
              const width = p.box.max[0] - p.box.min[0];
              const height = p.box.max[1] - p.box.min[1];
              const centerY = (p.box.min[1] + p.box.max[1]) / 2;
              const frontZ = p.box.max[2] + 0.012;
              return (
                // Grupo externo: deslocamento da vista explodida (CutawayRig); interno: mola do encaixe
                <group key={p.part} ref={registerPart(p.part)}>
                  <SpringDrop animate={!reducedMotion && !seenParts.current?.has(p.part)}>
                    {p.modelId ? (
                      <AutoNormalizedPart
                        modelUrl={workbenchModelUrl(p.modelId)}
                        targetSize={p.targetSize}
                        position={p.position}
                        rotation={p.rotation}
                        benchPart={p.part}
                        opacity={opacityOf(p.part)}
                      />
                    ) : p.part === 'SATA_DRIVE' ? (
                      <group userData={{ benchPart: p.part }}>
                        <SataDriveBlock box={p.box} isHdd={assembly.storageInstalled?.storageType === 'SATA_HDD'} />
                      </group>
                    ) : (
                      <group userData={{ benchPart: p.part }}>
                        <AioPumpBlock position={p.position} scale={width / AIO_PUMP_BASE} isRunning={isSpinning} />
                      </group>
                    )}
                    {/* Ventoinhas girando no teste de boot (face frontal do cooler e da GPU) */}
                    {p.part === 'COOLER' && p.modelId && (
                      <FanRotor position={[p.position[0], centerY, frontZ]} radius={Math.min(width, height) * 0.45} spinning={isSpinning} />
                    )}
                    {p.part === 'GPU' &&
                      [0.27, 0.7].map((f) => (
                        <FanRotor key={f} position={[p.box.min[0] + width * f, centerY, frontZ]} radius={height * 0.36} spinning={isSpinning} />
                      ))}
                  </SpringDrop>
                </group>
              );
            })}

            {/* Fonte: só na vista explodida, no tamanho real */}
            {psuBox && (
              <group ref={registerPart('PSU')} visible={false}>
                <PsuBlock box={psuBox} />
              </group>
            )}

            {/* LEDs EZ Debug na placa: acendem com o resultado do POST */}
            <DebugLeds3D
              position={layout.DEBUG_LEDS}
              states={[postResult?.debugLed.cpu, postResult?.debugLed.dram, postResult?.debugLed.vga, postResult?.debugLed.boot]}
            />

            {/* Callout do subsistema isolado: nome e leituras da mesma pose que posiciona as peças */}
            {cutawayMode === 'OPEN' && openPose.selection && (() => {
              const focused = openPose.parts.filter((x) => x.focus);
              if (focused.length === 0) return null;
              const top = Math.max(...focused.map((x) => x.box.max[1]));
              return (
                <Html position={[0, top + 0.6, 0]} center distanceFactor={5} zIndexRange={[20, 0]}>
                  <div role="note" className="pointer-events-none min-w-[180px] rounded-xl border border-cyan-500/60 bg-slate-950/95 p-2 text-[11px] font-mono text-slate-200 shadow-2xl">
                    <div className="font-bold text-cyan-300">{SUBSYSTEM_LABELS_3D[openPose.selection]}</div>
                    {(openPose.readings[openPose.selection] ?? []).map((r) => (
                      <div key={r.key}>
                        {r.label}: <strong>{r.key === 'dualChannel' ? (r.value ? 'Sim' : 'Não') : `${r.value.toLocaleString('pt-BR')} ${r.unit}`}</strong>
                      </div>
                    ))}
                  </div>
                </Html>
              );
            })()}

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
          {selectedMotherboard && cutawayMode === 'OFF' && (
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

            {/* 1b. Alavanca de retenção do soquete (antes só era possível travá-la pela bancada 2D ou
                pelo tooltip do soquete, difícil de descobrir) */}
            <WorkbenchPin
              position={layout.SOCKET_LEVER}
              icon={<Lock className="w-3.5 h-3.5" />}
              label="Alavanca do Soquete"
              visible={!assembly.coolerInstalled}
              status={assembly.socketLeverLocked ? 'installed' : assembly.cpuInstalled ? 'targeted' : 'empty'}
              detailText={
                assembly.socketLeverLocked
                  ? 'Alavanca abaixada e travada: a CPU está presa no soquete.'
                  : assembly.cpuInstalled
                  ? 'Alavanca aberta: abaixe e trave para prender a CPU nos contatos.'
                  : 'Alavanca aberta, aguardando o processador.'
              }
              actionText={
                assembly.socketLeverLocked
                  ? 'Alavanca Travada ✓'
                  : assembly.cpuInstalled
                  ? 'Abaixar e Travar Alavanca'
                  : undefined
              }
              onAction={assembly.cpuInstalled && !assembly.socketLeverLocked ? toggleSocketLever : undefined}
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
              visible={!assembly.gpuInstalled || !assembly.gpuScrewed || isGpuTarget}
              status={assembly.gpuScrewed ? 'installed' : isGpuTarget ? 'targeted' : 'empty'}
              detailText={
                assembly.gpuInstalled && assembly.gpuScrewed
                  ? `${assembly.gpuInstalled.name} travada no slot e parafusada no gabinete`
                  : assembly.gpuInstalled
                  ? `${assembly.gpuInstalled.name} travada no slot. Parafuse o suporte traseiro para ela não envergar o PCIe.`
                  : 'Slot principal reforçado para Placas de Vídeo (GPU).'
              }
              actionText={
                isGpuTarget
                  ? 'Encaixar GPU no Slot'
                  : assembly.gpuInstalled && !assembly.gpuScrewed
                  ? 'Parafusar Suporte da GPU'
                  : assembly.gpuInstalled
                  ? 'Placa Instalada ✓'
                  : undefined
              }
              onAction={() => {
                if (isGpuTarget) installGpu(selectedComponentForPlacement as never);
                else if (assembly.gpuInstalled && !assembly.gpuScrewed) screwGpu();
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

            {/* Cabos do gabinete e do disco SATA (os mesmos alvos da bancada 2D) */}
            {assembly.caseInstalled && (
              <>
                {assembly.caseInstalled.fansIncluded > 0 && (
                  <CableTargetPin targetId="SYS_FAN" position={layout.SYS_FAN_HEADER} name="SYS_FAN1" />
                )}
                <CableTargetPin targetId="USB3_HEADER" position={layout.USB3_HEADER} name="USB3 (19 pinos)" />
                <CableTargetPin targetId="USB2_HEADER" position={layout.USB2_HEADER} name="USB2 (9 pinos)" />
                <CableTargetPin targetId="HD_AUDIO" position={layout.HD_AUDIO_HEADER} name="HD_AUDIO" />
              </>
            )}
            {assembly.storageInstalled && assembly.storageInstalled.storageType !== 'NVMe_M2' && (
              <CableTargetPin targetId="SATA_PORT" position={layout.SATA_PORTS} name="SATA6G" />
            )}
            {placements.drivePowerAnchor && (
              <CableTargetPin targetId="DRIVE_POWER" position={placements.drivePowerAnchor} name="Energia SATA do disco (15 pinos)" />
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
