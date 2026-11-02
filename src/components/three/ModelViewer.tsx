'use client';

import React, { Component, Suspense, useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { RotateCw, Eye, ArrowUpFromLine, MoveHorizontal, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react';

interface ModelViewerProps {
  url: string;
  label: string;
  onError: () => void;
}

/** Distância da câmera que enquadra o modelo inteiro (calculada ao carregar) */
interface Framing {
  distance: number;
}

const DEFAULT_VIEW = new THREE.Vector3(0.75, 0.5, 1);
const VIEWS: { id: string; label: string; icon: React.ReactNode; dir: THREE.Vector3 }[] = [
  { id: 'iso', label: 'Perspectiva', icon: <Eye className="w-3.5 h-3.5" />, dir: DEFAULT_VIEW },
  { id: 'front', label: 'Frente', icon: <MoveHorizontal className="w-3.5 h-3.5" />, dir: new THREE.Vector3(0, 0.05, 1) },
  { id: 'top', label: 'Cima', icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, dir: new THREE.Vector3(0, 1, 0.001) },
  { id: 'side', label: 'Lado', icon: <RotateCw className="w-3.5 h-3.5" />, dir: new THREE.Vector3(1, 0.05, 0) },
];

class ViewerErrorBoundary extends Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const LoadingLabel: React.FC = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <span className="whitespace-nowrap rounded-lg bg-slate-950/90 px-3 py-1.5 font-mono text-xs text-cyan-300">
        Carregando modelo… {Math.round(progress)}%
      </span>
    </Html>
  );
};

/** Centraliza o modelo na origem e posiciona a câmera para enquadrá-lo inteiro */
const ModelScene: React.FC<{ url: string; framing: React.MutableRefObject<Framing> }> = ({ url, framing }) => {
  // Sem Draco (decodificador viria de CDN); meshopt é embutido e funciona offline
  const { scene } = useGLTF(url, false, true);
  const { camera, controls, invalidate } = useThree();

  useLayoutEffect(() => {
    if (!scene.userData.centered) {
      const center = new THREE.Box3().setFromObject(scene).getCenter(new THREE.Vector3());
      scene.position.sub(center);
      scene.userData.centered = true;
    }
    const sphere = new THREE.Box3().setFromObject(scene).getBoundingSphere(new THREE.Sphere());
    const fov = THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov);
    // A esfera envolvente superestima peças achatadas (placas, teclados): 0,75 enquadra sem cortar
    const distance = (sphere.radius / Math.sin(fov / 2)) * 0.75;
    framing.current.distance = distance;

    camera.position.copy(DEFAULT_VIEW.clone().normalize().multiplyScalar(distance));
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    const orbit = controls as unknown as OrbitControlsImpl | null;
    if (orbit) {
      orbit.target.set(0, 0, 0);
      orbit.minDistance = distance * 0.35;
      orbit.maxDistance = distance * 2.5;
      orbit.update();
    }
    invalidate();
  }, [scene, camera, controls, framing, invalidate]);

  return <primitive object={scene} />;
};

/**
 * Visualizador 3D de uma peça: girar, aproximar e vistas prontas, por mouse, toque ou teclado.
 * Carregado sob demanda (next/dynamic) para não pesar a primeira carga do jogo.
 */
const ModelViewer: React.FC<ModelViewerProps> = ({ url, label, onError }) => {
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [autoRotate, setAutoRotate] = useState(!prefersReducedMotion);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const framing = useRef<Framing>({ distance: 5 });

  const withCamera = (fn: (camera: THREE.Camera, controls: OrbitControlsImpl) => void) => {
    const controls = controlsRef.current;
    if (!controls) return;
    fn(controls.object, controls);
    controls.update();
  };

  const setView = (dir: THREE.Vector3) =>
    withCamera((camera, controls) => {
      controls.target.set(0, 0, 0);
      camera.position.copy(dir.clone().normalize().multiplyScalar(framing.current.distance));
    });

  const orbit = (deltaAzimuth: number, deltaPolar: number) =>
    withCamera((camera, controls) => {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += deltaAzimuth;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + deltaPolar, 0.05, Math.PI - 0.05);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    });

  const zoom = (factor: number) =>
    withCamera((camera, controls) => {
      const offset = camera.position.clone().sub(controls.target);
      const length = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(length));
    });

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = Math.PI / 12;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => orbit(-step, 0),
      ArrowRight: () => orbit(step, 0),
      ArrowUp: () => orbit(0, -step),
      ArrowDown: () => orbit(0, step),
      '+': () => zoom(0.85),
      '=': () => zoom(0.85),
      '-': () => zoom(1.18),
      '0': () => setView(DEFAULT_VIEW),
    };
    const action = actions[e.key];
    if (action) {
      e.preventDefault();
      setAutoRotate(false);
      action();
    }
  };

  const buttonClass =
    'flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-cyan-400 cursor-pointer';

  return (
    <div className="flex h-full flex-col gap-2">
      <div
        tabIndex={0}
        role="img"
        aria-label={`Modelo 3D: ${label}. Setas giram, + e − aproximam, 0 volta à vista inicial.`}
        onKeyDown={onKeyDown}
        className="relative min-h-[260px] flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_50%_35%,#16233b,#070b14_70%)] focus-visible:outline-2 focus-visible:outline-cyan-400 touch-none"
      >
        <ViewerErrorBoundary onError={onError}>
          <Canvas
            // Ocupa o contêiner inteiro: altura percentual não funciona com min-height
            style={{ position: 'absolute', inset: 0 }}
            dpr={[1, 1.5]}
            frameloop={autoRotate ? 'always' : 'demand'}
            camera={{ fov: 40, position: [3, 2, 4] }}
            gl={{ antialias: true, powerPreference: 'low-power' }}
          >
            <hemisphereLight args={['#dbeafe', '#0f172a', 0.9]} />
            {/* Luz principal vinda de cima e da esquerda, como nas ilustrações 2D */}
            <directionalLight position={[-4, 6, 4]} intensity={2.2} />
            <directionalLight position={[5, 2, -3]} intensity={0.6} color="#7dd3fc" />
            <Suspense fallback={<LoadingLabel />}>
              <ModelScene url={url} framing={framing} />
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping={!prefersReducedMotion}
              autoRotate={autoRotate}
              autoRotateSpeed={1.2}
              enablePan={false}
              onStart={() => setAutoRotate(false)}
            />
          </Canvas>
        </ViewerErrorBoundary>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Controles da câmera">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => {
              setAutoRotate(false);
              setView(view.dir);
            }}
            className={buttonClass}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
        <button onClick={() => zoom(0.85)} aria-label="Aproximar" className={buttonClass}>
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => zoom(1.18)} aria-label="Afastar" className={buttonClass}>
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setAutoRotate((v) => !v)} aria-pressed={autoRotate} className={buttonClass}>
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {autoRotate ? 'Parar giro' : 'Girar'}
        </button>
      </div>
    </div>
  );
};

export default ModelViewer;
