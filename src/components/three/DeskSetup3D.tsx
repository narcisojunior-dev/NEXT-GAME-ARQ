'use client';

import React, { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAssemblyStore, selectDeskStage } from '@/store/useAssemblyStore';
import {
  DeskSnapPointId,
  DeskStage,
  DESK_SNAP_POINTS,
} from '@/engine/deskSetup';
import {
  Eye,
  ArrowUpFromLine,
  Monitor,
  User,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Power,
  Layers,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

/* ====================================================================================
 * PRESETS DE CÂMERA CANÔNICOS DA BATTLESTATION (Fase 4)
 * ==================================================================================== */
export type DeskCameraPreset = 'setup-wide' | 'setup-top' | 'setup-pc' | 'setup-seat';

export const DESK_CAMERA_PRESETS: Record<
  DeskCameraPreset,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  'setup-wide': {
    pos: [3.8, 3.2, 4.2],
    target: [0, 0.8, 0],
  },
  'setup-top': {
    pos: [0, 5.5, 0.1],
    target: [0, 0.8, 0],
  },
  'setup-pc': {
    pos: [1.8, 1.4, -0.8],
    target: [1.35, 0.8, -0.2],
  },
  'setup-seat': {
    pos: [0, 1.25, 0.85],
    target: [0, 1.05, -0.4],
  },
};

/* ====================================================================================
 * CONTROLADOR SUAVE DE CÂMERA COM LERP E ORBITCONTROLS LIVRE
 * ==================================================================================== */
interface DeskCameraControllerProps {
  preset: DeskCameraPreset;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const DeskCameraController: React.FC<DeskCameraControllerProps> = ({ preset, controlsRef }) => {
  const { camera } = useThree();
  const [targetConfig, setTargetConfig] = useState(DESK_CAMERA_PRESETS[preset]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  React.useEffect(() => {
    setTargetConfig(DESK_CAMERA_PRESETS[preset]);
    setIsTransitioning(true);
  }, [preset]);

  useFrame((_, delta) => {
    if (!isTransitioning) return;

    const t = Math.min(1, delta * 5.0);
    const targetPos = new THREE.Vector3(...targetConfig.pos);
    const targetLook = new THREE.Vector3(...targetConfig.target);

    camera.position.lerp(targetPos, t);

    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook, t);
      controlsRef.current.update();
    }

    if (camera.position.distanceTo(targetPos) < 0.04) {
      camera.position.copy(targetPos);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLook);
        controlsRef.current.update();
      }
      setIsTransitioning(false);
    }
  });

  return null;
};

/* ====================================================================================
 * COMPONENTE: Mesa Gamer / Mobiliário da Battlestation
 * ==================================================================================== */
const DeskFurniture: React.FC = () => {
  const { scene } = useGLTF('/models/mesa-gamer.glb');

  const normalizedDesk = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Centraliza em X e Z, assentando a base dos pés no chão em Y=0
    clone.position.x -= center.x;
    clone.position.y -= box.min.y;
    clone.position.z -= center.z;

    // Normaliza para a largura padrão de 2.2 unidades de mundo
    const targetWidth = 2.2;
    const scaleFactor = targetWidth / Math.max(0.001, size.x);

    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);
    wrapper.updateMatrixWorld(true);

    wrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.roughness = Math.max(0.35, mat.roughness ?? 0.5);
          mat.metalness = Math.min(0.8, mat.metalness ?? 0.2);
        }
      }
    });

    return wrapper;
  }, [scene]);

  return <primitive object={normalizedDesk} />;
};

/* ====================================================================================
 * COMPONENTE: Cadeira Ergonômica do Aluno
 * ==================================================================================== */
const ChairFurniture: React.FC = () => {
  const { scene } = useGLTF('/models/cadeira-escritorio.glb');

  const normalizedChair = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    clone.position.x -= center.x;
    clone.position.y -= box.min.y;
    clone.position.z -= center.z;

    const targetHeight = 1.25;
    const scaleFactor = targetHeight / Math.max(0.001, size.y);

    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.scale.set(scaleFactor, scaleFactor, scaleFactor);
    // Vira a cadeira de frente para a mesa
    wrapper.rotation.y = Math.PI;
    wrapper.updateMatrixWorld(true);

    wrapper.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return wrapper;
  }, [scene]);

  return (
    <group position={DESK_SNAP_POINTS.CHAIR.nominalPosition}>
      <primitive object={normalizedChair} />
    </group>
  );
};

/* ====================================================================================
 * COMPONENTE: Sala e Chão do Laboratório Cyber-Industrial
 * ==================================================================================== */
const LaboratoryEnvironment: React.FC = () => {
  return (
    <group>
      {/* Piso Antiestático Escuro com Grade */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#070c18" roughness={0.7} metalness={0.2} />
      </mesh>
      <gridHelper args={[14, 28, '#0891b2', '#1e293b']} position={[0, 0.001, 0]} />

      {/* Parede de Fundo Técnica */}
      <mesh position={[0, 3.5, -2.5]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#090d16" roughness={0.9} />
      </mesh>

      {/* Régua de Tomadas e Rede na Parede */}
      <group position={[1.0, 0.25, -2.48]}>
        <mesh receiveShadow>
          <boxGeometry args={[1.2, 0.2, 0.03]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
};

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
  const activePreset = deskSetup.deskCameraPreset;

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
    setDeskCameraPreset('setup-wide');
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
      <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between pointer-events-none">
        {/* Indicador de Estágio da Mesa */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 shadow-lg text-xs font-mono">
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
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Botões de Preset com nomes exatos */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setDeskCameraPreset('setup-wide')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'setup-wide'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Visão Panorâmica da Estação (setup-wide)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Panorâmica</span>
            </button>

            <button
              onClick={() => setDeskCameraPreset('setup-top')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'setup-top'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Visão Superior Ortográfica dos Periféricos (setup-top)"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Topo</span>
            </button>

            <button
              onClick={() => setDeskCameraPreset('setup-pc')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'setup-pc'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Visão Traseira das Conexões do PC e GPU (setup-pc)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Conexões PC</span>
            </button>

            <button
              onClick={() => setDeskCameraPreset('setup-seat')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activePreset === 'setup-seat'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="Visão em Primeira Pessoa do Aluno na Cadeira (setup-seat)"
            >
              <User className="w-3.5 h-3.5" />
              <span>Visão do Aluno</span>
            </button>
          </div>

          {/* Zoom e Reset */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-700/80 p-1 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => handleZoom(0.85)}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Aproximar (+)"
              aria-label="Aproximar Câmera"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(1.15)}
              className="p-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-all cursor-pointer"
              title="Afastar (-)"
              aria-label="Afastar Câmera"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
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
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-xs font-mono text-cyan-300 hover:text-cyan-200 shadow-lg transition-all cursor-pointer"
            title="Voltar para a bancada técnica de montagem"
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
          camera={{ position: DESK_CAMERA_PRESETS['setup-wide'].pos, fov: 42 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          shadows
        >
          {/* Luzes do Laboratório de Engenharia (RNF07 5500K) */}
          <ambientLight color="#0f172a" intensity={0.8} />
          <directionalLight
            position={[5, 8, 4]}
            intensity={1.4}
            color="#f8fafc"
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-4, 5, -3]} intensity={0.7} color="#cbd5e1" />
          <pointLight position={[0, 2, -2]} color="#38bdf8" intensity={1.2} distance={8} />

          {/* Gerenciador de Câmera */}
          <DeskCameraController preset={activePreset} controlsRef={controlsRef} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            minDistance={1.2}
            maxDistance={8.5}
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
            {/* Ambiente e Chão */}
            <LaboratoryEnvironment />

            {/* Mesa Gamer Base */}
            <DeskFurniture />

            {/* Cadeira do Aluno (quando posicionada) */}
            {Boolean(deskSetup.placedDeskItems.CHAIR) && <ChairFurniture />}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default DeskSetup3D;

