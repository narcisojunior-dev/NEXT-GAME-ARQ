'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useRoomDecorStore } from '@/store/useRoomDecorStore';
import { DecorItem, DecorZone, MUSEUM_TIMELINE, findDecorItem, isProcedural } from '@/engine/roomDecor';
import {
  DecorPlacement,
  PlacedDecor,
  SHELF_LAYOUTS,
  boxAt,
  canPlace,
  isAnimatedPlacement,
  shelfPlacement,
  shelfSlots,
  snapToZone,
  suggestPlacements,
} from '@/engine/roomPlacement';
import { ROOM_HEIGHT, ROOM_MAX_Z, ROOM_MIN_X, ROOM_MIN_Z, ROOM_SIZE, RoomContext, WallId } from '@/engine/roomLayout';
import { freeShelfSlots } from '@/engine/roomDecorState';
import { showcaseTrophies } from '@/engine/decorUnlocks';
import { calculateBenchmark } from '@/engine/benchmark';
import { totalRamGb } from '@/engine/campaign';
import { AVAILABLE_MODELS_INDEX } from '@/engine/models3dIndex';
import { FittedModel } from '@/components/three/FittedModel';
import { ROOM_PALETTES } from './RoomShell';
import { Prim, shapeFor } from './decorShapes';
import { PosterData, drawNeon, drawPlaque, drawPoster } from './posterArt';
import { PhotoAngle, ROOM_VIEWS, useDecorModeStore } from './decorModeStore';
import { commitHeld, pickPlaced, prepareRoom, useRoomContext } from './decorActions';

/* ====================================================================================
 * Utilidades: movimento reduzido, cache de geometrias e materiais (liberados ao sair)
 * ==================================================================================== */
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

const geometryCache = new Map<string, THREE.BufferGeometry>();
const materialCache = new Map<string, THREE.Material>();

function geometryFor(p: Prim): THREE.BufferGeometry {
  const key = `${p.kind}:${p.size.map((n) => n.toFixed(4)).join(',')}`;
  let g = geometryCache.get(key);
  if (!g) {
    const [a, b = a, c = a] = p.size;
    g =
      p.kind === 'box'
        ? new THREE.BoxGeometry(a, b, c)
        : p.kind === 'cyl'
          ? new THREE.CylinderGeometry(a, c, b, 16)
          : p.kind === 'sphere'
            ? new THREE.SphereGeometry(a, 16, 12)
            : p.kind === 'cone'
              ? new THREE.ConeGeometry(a, b, 16)
              : new THREE.TorusGeometry(a, b, 8, 24);
    geometryCache.set(key, g);
  }
  return g;
}

function materialFor(p: Prim): THREE.Material {
  const key = `${p.color}:${p.emissive ? 1 : 0}:${p.metal ?? 0.1}:${p.rough ?? 0.6}`;
  let m = materialCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: p.color,
      roughness: p.rough ?? 0.6,
      metalness: p.metal ?? 0.1,
      ...(p.emissive ? { emissive: new THREE.Color(p.color), emissiveIntensity: 1.2 } : {}),
    });
    materialCache.set(key, m);
  }
  return m;
}

/** Modelos de decoração já baixados (o índice leve, não o manifesto inteiro) */
const AVAILABLE_DECOR = new Set(AVAILABLE_MODELS_INDEX.map((e) => e.id));

const GHOST_OK = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.45, depthWrite: false });
const GHOST_BAD = new THREE.MeshBasicMaterial({ color: '#f43f5e', transparent: true, opacity: 0.45, depthWrite: false });

function disposeCaches() {
  geometryCache.forEach((g) => g.dispose());
  materialCache.forEach((m) => m.dispose());
  geometryCache.clear();
  materialCache.clear();
}

/** Textura de <canvas> recriada só quando a arte muda, e liberada ao sair */
function useCanvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, key: string): THREE.CanvasTexture | null {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    draw(ctx, w, h);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 2;
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a chave resume o que muda na arte
  }, [key, w, h]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/* ====================================================================================
 * Dados do aluno para pôsteres e certificado
 * ==================================================================================== */
function usePosterData(): PosterData {
  const { teamName, assembly, mb, setup } = useAssemblyStore(
    useShallow((s) => ({ teamName: s.teamName, assembly: s.assembly, mb: s.selectedMotherboard, setup: s.studentSetup }))
  );
  const missionResults = useProgressStore((s) => s.missionResults);
  return useMemo(() => {
    const hasPc = Boolean(assembly.cpuInstalled && mb);
    const fps = hasPc
      ? (['1080p', '1440p', '4K'] as const).map((r) => ({ label: r, fps: Math.round(calculateBenchmark(assembly, mb, r).avgFps) }))
      : [];
    return {
      teamName,
      cpu: assembly.cpuInstalled?.name ?? 'Processador',
      gpu: assembly.gpuInstalled?.name ?? 'Vídeo integrado',
      ramGb: totalRamGb(assembly),
      avgFps: fps[0]?.fps ?? null,
      fpsByResolution: fps,
      threeStarMissions: Object.values(missionResults).filter((r) => r.stars === 3).length,
      setupLines: [setup.monitor.name, setup.keyboard.name, setup.mouse.name].map((n) => `· ${n}`),
      date: new Date().toLocaleDateString('pt-BR'),
    };
  }, [teamName, assembly, mb, setup, missionResults]);
}

/* ====================================================================================
 * Peças por código (#88)
 * ==================================================================================== */
const NEON_COLORS: Record<string, string> = { ciano: '#22d3ee', magenta: '#e879f9', verde: '#4ade80', ambar: '#fbbf24' };

const LedStrip: React.FC<{ item: DecorItem; variant?: string; accent: string; animate: boolean }> = ({ item, variant = 'tema', accent, animate }) => {
  const { w, d, h } = item.footprint;
  const strip = useRef<THREE.MeshStandardMaterial>(null);
  const color = useMemo(() => new THREE.Color(accent), [accent]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const c = color.set(accent);
    let intensity = 2;
    if (animate && variant === 'arco-iris') c.setHSL((t * 0.12) % 1, 0.9, 0.55);
    if (animate && variant === 'onda') c.offsetHSL(Math.sin(t * 1.2) * 0.12, 0, 0);
    if (animate && variant === 'respirar') intensity = 0.6 + (Math.sin(t * 2) + 1) * 0.9;
    if (strip.current) {
      strip.current.color.copy(c);
      strip.current.emissive.copy(c);
      strip.current.emissiveIntensity = intensity;
    }
  });
  return (
    <group>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial ref={strip} color={accent} emissive={accent} emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
};

const HEX_POSITIONS: [number, number][] = (() => {
  const out: [number, number][] = [];
  const r = 0.09;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) out.push([(col - 1.5) * r * 1.8 + (row % 2) * r * 0.9, (row - 1) * r * 1.56]);
  }
  return out;
})();

const HexPanels: React.FC<{ item: DecorItem; variant?: string; accent: string; animate: boolean }> = ({ item, variant = 'ciano-magenta', accent, animate }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.CylinderGeometry(0.085, 0.085, item.footprint.d, 6).rotateX(Math.PI / 2).rotateZ(Math.PI / 6), [item.footprint.d]);
  // Luz própria: material sem iluminação, a cor de cada painel vem da instância
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );
  const color = useMemo(() => new THREE.Color(), []);
  const paint = (t: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    HEX_POSITIONS.forEach((_, i) => {
      if (variant === 'arco-iris') color.setHSL(((i / HEX_POSITIONS.length) + t * 0.08) % 1, 0.9, 0.55);
      else if (variant === 'tema') color.set(accent);
      else color.set(i % 2 ? '#e879f9' : '#22d3ee');
      mesh.setColorAt(i, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    HEX_POSITIONS.forEach(([x, y], i) => mesh.setMatrixAt(i, m.makeTranslation(x, item.footprint.h / 2 + y, 0)));
    mesh.instanceMatrix.needsUpdate = true;
    paint(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- repinta quando a variante ou o tema mudam
  }, [variant, accent, item.footprint.h]);
  useFrame(({ clock }) => {
    if (animate && variant === 'arco-iris') paint(clock.elapsedTime);
  });
  return <instancedMesh ref={ref} args={[geometry, material, HEX_POSITIONS.length]} />;
};

const NeonText: React.FC<{ item: DecorItem; text?: string; variant?: string }> = ({ item, text = 'PC ACADEMY', variant = 'ciano' }) => {
  const { w, h, d } = item.footprint;
  const color = NEON_COLORS[variant] ?? NEON_COLORS.ciano;
  const texture = useCanvasTexture((ctx, cw, ch) => drawNeon(ctx, text, color, cw, ch), 512, 144, `${text}|${color}`);
  return (
    <group>
      <mesh position={[0, h / 2, -d / 2 + 0.004]}>
        <boxGeometry args={[w, h, 0.008]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.6} roughness={0.1} />
      </mesh>
      <mesh position={[0, h / 2, 0.002]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
};

const ArtPlane: React.FC<{ variant?: string; width: number; height: number; z: number; y: number; maxTexture: number }> = ({ variant = 'pixel-cpu', width, height, z, y, maxTexture }) => {
  const data = usePosterData();
  const tw = Math.min(maxTexture, 512);
  const th = Math.round((tw * height) / width);
  const texture = useCanvasTexture((ctx, cw, ch) => drawPoster(ctx, variant, cw, ch, data), tw, Math.min(th, maxTexture), `${variant}|${JSON.stringify(data)}`);
  return (
    <mesh position={[0, y, z]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} roughness={0.8} />
    </mesh>
  );
};

/* ====================================================================================
 * Item: modelo baixado ou versão por código
 * ==================================================================================== */
const PrimMesh: React.FC<{ prim: Prim; ghost?: THREE.Material; animate: boolean; castShadow: boolean }> = ({ prim, ghost, animate, castShadow }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, delta) => {
    const m = ref.current;
    if (!m || !animate || !prim.anim) return;
    if (prim.anim === 'spin') m.rotation.y += delta * 1.6;
    if (prim.anim === 'bob') m.position.y = prim.pos[1] + Math.sin(clock.elapsedTime * 2) * 0.01;
    if (prim.anim === 'wave') m.rotation.z = Math.sin(clock.elapsedTime * 4) * 0.35;
    if (prim.anim === 'blink') m.visible = Math.sin(clock.elapsedTime * 3 + prim.pos[1] * 20) > -0.6;
  });
  return (
    <mesh
      ref={ref}
      position={prim.pos}
      rotation={prim.rot ?? [0, 0, 0]}
      geometry={geometryFor(prim)}
      material={ghost ?? materialFor(prim)}
      castShadow={castShadow && !ghost}
      receiveShadow={!ghost}
      raycast={ghost ? () => null : undefined}
    />
  );
};

const ART_ITEMS = new Set(['decor-moldura-poster', 'decor-poster-branco', 'decor-quadro', 'proc-poster']);

const DecorModel: React.FC<{
  item: DecorItem;
  variant?: string;
  text?: string;
  accent: string;
  animate: boolean;
  ghost?: THREE.Material;
  maxTexture: number;
}> = ({ item, variant, text, accent, animate, ghost, maxTexture }) => {
  const { w, d, h } = item.footprint;
  if (!ghost) {
    if (item.id === 'proc-fita-led') return <LedStrip item={item} variant={variant} accent={accent} animate={animate} />;
    if (item.id === 'proc-hexagonos') return <HexPanels item={item} variant={variant} accent={accent} animate={animate} />;
    if (item.id === 'proc-neon-texto') return <NeonText item={item} text={text} variant={variant} />;
  }
  const art = ART_ITEMS.has(item.id) && !ghost;
  // Modelo do Sketchfab já baixado e otimizado: ajustado à pegada medida
  if (!isProcedural(item.id) && AVAILABLE_DECOR.has(item.id) && !ghost) {
    return (
      <group>
        <Suspense fallback={null}>
          <FittedModel url={`/models/${item.id}.glb`} fitAxis={item.zones[0] === 'WALL' ? 'x' : 'y'} size={item.zones[0] === 'WALL' ? w : h} />
        </Suspense>
        {art && <ArtPlane variant={variant} width={w * 0.86} height={h * 0.86} y={h / 2} z={d / 2 + 0.003} maxTexture={maxTexture} />}
      </group>
    );
  }
  const prims = item.id === 'proc-poster' ? [] : shapeFor(item);
  const ghostBox = item.id === 'proc-poster' || item.id === 'proc-fita-led' || item.id === 'proc-hexagonos' || item.id === 'proc-neon-texto';
  return (
    <group>
      {prims.map((p, i) => (
        <PrimMesh key={i} prim={p} ghost={ghost} animate={animate} castShadow={item.zones[0] !== 'WALL'} />
      ))}
      {ghost && ghostBox && (
        <mesh position={[0, h / 2, 0]} material={ghost} raycast={() => null}>
          <boxGeometry args={[w, h, Math.max(d, 0.01)]} />
        </mesh>
      )}
      {item.id === 'proc-poster' && !ghost && (
        <mesh position={[0, h / 2, -d / 2 + 0.002]}>
          <boxGeometry args={[w + 0.02, h + 0.02, 0.004]} />
          <meshStandardMaterial color="#e2e8f0" />
        </mesh>
      )}
      {art && <ArtPlane variant={variant} width={w * (item.id === 'proc-poster' ? 1 : 0.86)} height={h * (item.id === 'proc-poster' ? 1 : 0.86)} y={h / 2} z={d / 2 + 0.003} maxTexture={maxTexture} />}
    </group>
  );
};

/* ====================================================================================
 * Peça posicionada: mola ao soltar, seleção e "pegar para mover"
 * ==================================================================================== */
const DRAG_THRESHOLD = 6;

/** Pressionar e arrastar uma peça do quarto a pega para mover; clicar a seleciona */
function placedPointerDown(e: ThreeEvent<PointerEvent>, instanceId: string, interactive: boolean) {
  if (!interactive || e.button !== 0 || useDecorModeStore.getState().held) return;
  e.stopPropagation();
  const origin = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  let dragging = false;
  const onMove = (ev: PointerEvent) => {
    if (dragging || Math.hypot(ev.clientX - origin.x, ev.clientY - origin.y) <= DRAG_THRESHOLD) return;
    dragging = true;
    pickPlaced(instanceId, true);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    const mode = useDecorModeStore.getState();
    if (dragging && mode.isDragging) mode.endDrag();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

function placedClick(e: ThreeEvent<MouseEvent>, instanceId: string, interactive: boolean) {
  if (!interactive || useDecorModeStore.getState().held) return;
  e.stopPropagation();
  const placed = useRoomDecorStore.getState().items.find((p) => p.instanceId === instanceId);
  const item = placed ? findDecorItem(placed.decorId) : null;
  if (!item) return;
  useDecorModeStore.getState().select(instanceId);
  useDecorModeStore.getState().say(`${item.name}: ${item.description}`);
}

const PlacedDecorView: React.FC<{ placed: PlacedDecor; accent: string; animate: boolean; interactive: boolean; maxTexture: number }> = ({
  placed,
  accent,
  animate,
  interactive,
  maxTexture,
}) => {
  const item = findDecorItem(placed.decorId);
  const springRef = useRef<THREE.Group>(null);
  const spring = useRef({ y: 0, v: 0 });
  const lastPlaced = useDecorModeStore((s) => s.lastPlaced);
  const isMoving = useDecorModeStore((s) => s.held?.instanceId === placed.instanceId);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (lastPlaced?.instanceId === placed.instanceId && !reduced) spring.current = { y: 0.1, v: 0 };
  }, [lastPlaced, placed.instanceId, reduced]);

  useFrame((_, delta) => {
    const s = spring.current;
    if (Math.abs(s.y) < 1e-4 && Math.abs(s.v) < 1e-4) return;
    const dt = Math.min(delta, 1 / 30);
    s.v += (-260 * s.y - 16 * s.v) * dt;
    s.y += s.v * dt;
    if (springRef.current) springRef.current.position.y = s.y;
  });

  if (!item) return null;
  return (
    <group
      position={placed.position}
      rotation={[0, (placed.rotationY * Math.PI) / 180, 0]}
      visible={!isMoving}
      onPointerDown={(e) => placedPointerDown(e, placed.instanceId, interactive)}
      onClick={(e) => placedClick(e, placed.instanceId, interactive)}
    >
      <group ref={springRef}>
        <DecorModel item={item} variant={placed.variant} text={placed.text} accent={accent} animate={animate} maxTexture={maxTexture} />
      </group>
    </group>
  );
};

/**
 * Peças repetidas e estáticas (espuma acústica, livros, vasos...): uma InstancedMesh por primitiva
 * em vez de uma malha por peça (#91). A peça que está sendo movida some (escala zero).
 */
const InstancedPrim: React.FC<{ prim: Prim; placements: PlacedDecor[]; hiddenId: string | null; interactive: boolean; castShadow: boolean }> = ({
  prim,
  placements,
  hiddenId,
  interactive,
  castShadow,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...prim.pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(prim.rot ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1)
    );
    const world = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    placements.forEach((p, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (p.rotationY * Math.PI) / 180);
      const hidden = p.instanceId === hiddenId;
      world.compose(new THREE.Vector3(...p.position), q, new THREE.Vector3(hidden ? 0 : 1, hidden ? 0 : 1, hidden ? 0 : 1));
      mesh.setMatrixAt(i, world.multiply(local));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [prim, placements, hiddenId]);
  const idOf = (instance: number | undefined) => (instance === undefined ? null : placements[instance]?.instanceId ?? null);
  return (
    <instancedMesh
      ref={ref}
      args={[geometryFor(prim), materialFor(prim), placements.length]}
      castShadow={castShadow}
      receiveShadow
      onPointerDown={(e) => {
        const id = idOf(e.instanceId);
        if (id) placedPointerDown(e, id, interactive);
      }}
      onClick={(e) => {
        const id = idOf(e.instanceId);
        if (id) placedClick(e, id, interactive);
      }}
    />
  );
};

const InstancedDecor: React.FC<{ item: DecorItem; placements: PlacedDecor[]; interactive: boolean }> = ({ item, placements, interactive }) => {
  const hiddenId = useDecorModeStore((s) => s.held?.instanceId ?? null);
  const prims = useMemo(() => shapeFor(item), [item]);
  return (
    <group>
      {prims.map((p, i) => (
        <InstancedPrim key={`${i}-${placements.length}`} prim={p} placements={placements} hiddenId={hiddenId} interactive={interactive} castShadow={item.zones[0] !== 'WALL'} />
      ))}
    </group>
  );
};

/** Contorno da peça selecionada (no mundo, vale para peças instanciadas também) */
const SelectionBox: React.FC<{ placed: PlacedDecor }> = ({ placed }) => {
  const item = findDecorItem(placed.decorId);
  if (!item) return null;
  const b = boxAt(item, placed.position, placed.rotationY);
  const size: [number, number, number] = [b.max[0] - b.min[0] + 0.03, b.max[1] - b.min[1] + 0.03, b.max[2] - b.min[2] + 0.03];
  return (
    <mesh position={[(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]} raycast={() => null}>
      <boxGeometry args={size} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      <Edges color="#22d3ee" />
    </mesh>
  );
};

/** Peças que podem ser instanciadas: versão por código, estáticas, sem arte nem efeito próprio */
const canInstance = (item: DecorItem, variant?: string) =>
  !ART_ITEMS.has(item.id) && !['proc-fita-led', 'proc-hexagonos', 'proc-neon-texto'].includes(item.id) && !isAnimatedPlacement(item, variant) && !AVAILABLE_DECOR.has(item.id);

/** Vitrine: um troféu por missão com 3 estrelas, nos nichos livres (#85) */
const ShowcaseTrophies: React.FC<{ host: PlacedDecor; items: PlacedDecor[] }> = ({ host, items }) => {
  const missionResults = useProgressStore((s) => s.missionResults);
  const trophies = useMemo(() => showcaseTrophies({ missionResults }), [missionResults]);
  const trophy = findDecorItem('decor-trofeu');
  const free = freeShelfSlots({ items }, host.instanceId);
  const slots = shelfSlots(host).filter((s) => free.includes(s.slot));
  if (!trophy) return null;
  // Até três troféus por nicho livre, lado a lado
  const seats = slots.flatMap((s) => [-0.15, 0, 0.15].map((dx) => ({ s, dx }))).slice(0, trophies.length);
  return (
    <group>
      {seats.map(({ s, dx }, i) => (
        <group key={i} position={s.position} rotation={[0, (s.rotationY * Math.PI) / 180, 0]}>
          <group position={[dx, 0, 0]} scale={0.7}>
            {shapeFor(trophy).map((p, j) => (
              <PrimMesh key={j} prim={p} animate={false} castShadow={false} />
            ))}
          </group>
        </group>
      ))}
    </group>
  );
};

/** Placas de ano da estante "Linha do tempo" do Museu do PC (#89) */
const TimelinePlaque: React.FC<{ year: string; label: string; position: [number, number, number]; rotationY: number }> = ({ year, label, position, rotationY }) => {
  const texture = useCanvasTexture((ctx, w, h) => drawPlaque(ctx, year, label, w, h), 512, 72, `${year}|${label}`);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.025, 0.226]}>
        <planeGeometry args={[0.43, 0.06]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </group>
  );
};

/* ====================================================================================
 * Interação do Modo Decorar: superfícies, fantasma e pontos destacados
 * ==================================================================================== */
interface SurfaceData {
  decorSurface: DecorZone;
  wall?: WallId;
  host?: string;
  slot?: number;
}

const surfaceOf = (e: ThreeEvent<PointerEvent | MouseEvent>): SurfaceData | null => {
  const first = e.intersections.find((i) => (i.object.userData as Partial<SurfaceData>).decorSurface);
  if (!first || first.object !== e.object) return null;
  return first.object.userData as SurfaceData;
};

function placementAt(item: DecorItem, s: SurfaceData, point: THREE.Vector3, rotationY: 0 | 90 | 180 | 270, ctx: RoomContext): DecorPlacement | null {
  if (s.decorSurface === 'SHELF') {
    if (!item.zones.includes('SHELF') || !s.host || s.slot === undefined) return null;
    const host = useRoomDecorStore.getState().items.find((p) => p.instanceId === s.host);
    return host ? shelfPlacement(host, s.slot) : null;
  }
  if (!item.zones.includes(s.decorSurface)) return null;
  return snapToZone(item, s.decorSurface, [point.x, point.y, point.z], rotationY, ctx, s.wall);
}

const MAGNET_RADIUS = 0.25;

const PlacementLayer: React.FC<{ ctx: RoomContext; items: PlacedDecor[]; accent: string; maxTexture: number }> = ({ ctx, items, accent, maxTexture }) => {
  const { held, isDragging } = useDecorModeStore(useShallow((s) => ({ held: s.held, isDragging: s.isDragging })));
  const lastRejected = useDecorModeStore((s) => s.lastRejected);
  const item = held ? findDecorItem(held.decorId) : null;
  const ghostRef = useRef<THREE.Group>(null);
  const shake = useRef(0);

  const suggestions = useMemo(
    () => (item && held ? suggestPlacements({ items }, item, ctx, { ignoreInstanceId: held.instanceId, variant: held.variant, limit: 6 }) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula ao pegar outro item ou mudar o quarto
    [item, held?.instanceId, held?.variant, items, ctx]
  );

  const check = useMemo(
    () => (item && held?.placement ? canPlace({ items }, item, held.placement, ctx, { ignoreInstanceId: held.instanceId, variant: held.variant }) : null),
    [item, held, items, ctx]
  );

  useEffect(() => {
    if (lastRejected) shake.current = 0.45;
  }, [lastRejected]);

  useFrame((_, delta) => {
    const g = ghostRef.current;
    if (!g) return;
    if (shake.current > 0) {
      shake.current = Math.max(0, shake.current - delta);
      g.position.x = Math.sin(shake.current * 70) * 0.015 * (shake.current / 0.45);
    } else g.position.x = 0;
  });

  if (!held || !item) return null;

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const s = surfaceOf(e);
    if (!s) return;
    let p = placementAt(item, s, e.point, held.rotationY, ctx);
    if (!p) return;
    // Atração magnética: perto de um lugar destacado válido, o fantasma gruda nele
    const near = suggestions.find((sg) => sg.placement.zone === p?.zone && Math.hypot(sg.placement.position[0] - e.point.x, sg.placement.position[1] - (p?.zone === 'WALL' ? e.point.y - item.footprint.h / 2 : sg.placement.position[1]), sg.placement.position[2] - e.point.z) < MAGNET_RADIUS);
    if (near) p = near.placement;
    const cur = useDecorModeStore.getState().held?.placement;
    if (cur && cur.zone === p.zone && cur.wall === p.wall && cur.rotationY === p.rotationY && cur.position.every((v, i) => v === p?.position[i]) && cur.shelfRef?.slot === p.shelfRef?.slot) return;
    useDecorModeStore.getState().setPlacement(p);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!useDecorModeStore.getState().isDragging || !surfaceOf(e)) return;
    e.stopPropagation();
    commitHeld();
    useDecorModeStore.getState().endDrag();
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!surfaceOf(e)) return;
    e.stopPropagation();
    commitHeld();
  };
  const handlers = { onPointerMove: onMove, onPointerUp: onUp, onClick };

  const deskTop = ctx.deskTop;
  const centerZ = (ROOM_MIN_Z + ROOM_MAX_Z) / 2;
  const hosts = item.zones.includes('SHELF') ? items.filter((p) => SHELF_LAYOUTS[p.decorId] && p.instanceId !== held.instanceId) : [];
  const placement = held.placement;
  const ok = check?.ok === true;

  return (
    <group>
      {/* Superfícies invisíveis de encaixe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, centerZ]} userData={{ decorSurface: 'FLOOR' }} {...handlers}>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_MIN_Z + 0.002]} userData={{ decorSurface: 'WALL', wall: 'BACK' }} {...handlers}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh position={[ROOM_MIN_X + 0.002, ROOM_HEIGHT / 2, centerZ]} rotation={[0, Math.PI / 2, 0]} userData={{ decorSurface: 'WALL', wall: 'LEFT' }} {...handlers}>
        <planeGeometry args={[ROOM_SIZE, ROOM_HEIGHT]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {item.zones.includes('CEILING') && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_HEIGHT, centerZ]} userData={{ decorSurface: 'CEILING' }} {...handlers}>
          <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {deskTop && item.zones.includes('DESK') && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(deskTop.minX + deskTop.maxX) / 2, deskTop.y + 0.004, (deskTop.minZ + deskTop.maxZ) / 2]} userData={{ decorSurface: 'DESK' }} {...handlers}>
          <planeGeometry args={[deskTop.maxX - deskTop.minX, deskTop.maxZ - deskTop.minZ]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.06} depthWrite={false} />
        </mesh>
      )}
      {/* Nichos das estantes */}
      {hosts.flatMap((host) =>
        shelfSlots(host).map((s) => (
          <mesh
            key={`${host.instanceId}-${s.slot}`}
            position={[s.position[0], s.position[1] + s.maxHeight / 2, s.position[2]]}
            rotation={[0, (s.rotationY * Math.PI) / 180, 0]}
            userData={{ decorSurface: 'SHELF', host: host.instanceId, slot: s.slot }}
            {...handlers}
          >
            <boxGeometry args={[s.maxWidth * 0.92, s.maxHeight, Math.max(0.05, s.maxDepth * 0.8)]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} depthWrite={false} />
          </mesh>
        ))
      )}

      {/* Fantasma: verde pode, vermelho não pode (com o motivo) */}
      {placement && (
        <group ref={ghostRef}>
          <group position={placement.position} rotation={[0, (placement.rotationY * Math.PI) / 180, 0]}>
            <DecorModel item={item} variant={held.variant} text={held.text} accent={accent} animate={false} ghost={ok ? GHOST_OK : GHOST_BAD} maxTexture={maxTexture} />
            <Html position={[0, item.footprint.h + 0.12, 0]} center style={{ pointerEvents: 'none' }}>
              <div
                style={{ width: 230 }}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono leading-snug shadow-xl ${ok ? 'bg-slate-950/95 border-cyan-400/70 text-cyan-200' : 'bg-slate-950/95 border-rose-400/70 text-rose-200'}`}
              >
                <div className="font-bold">{item.name}</div>
                <div className="text-slate-300">{ok ? (isDragging ? 'Solte para colocar' : 'Clique ou Enter para colocar') : check && !check.ok ? check.message : ''}</div>
              </div>
            </Html>
          </group>
        </group>
      )}

      {/* Pontos destacados: clicar posiciona (equivalência para touchpads gastos) */}
      {!isDragging &&
        suggestions.map((s, i) => (
          <Html key={i} position={[s.placement.position[0], s.placement.position[1] + (s.placement.zone === 'WALL' ? item.footprint.h / 2 : 0.05), s.placement.position[2]]} center zIndexRange={[30, 0]}>
            <button
              type="button"
              aria-label={`Colocar aqui: ${s.label}`}
              title={s.label}
              onClick={() => {
                useDecorModeStore.getState().setPlacement(s.placement);
                commitHeld();
              }}
              onPointerEnter={() => useDecorModeStore.getState().setPlacement(s.placement)}
              className="w-7 h-7 rounded-full border-2 border-cyan-300 bg-cyan-500/30 shadow-[0_0_12px_rgba(34,211,238,0.8)] hover:bg-cyan-400/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
            >
              <span className="sr-only">{s.label}</span>
            </button>
          </Html>
        ))}
    </group>
  );
};

/* ====================================================================================
 * Foto do quarto (#90): quadro 1920 × 1080 sob demanda, sem preserveDrawingBuffer permanente
 * ==================================================================================== */
const PhotoRig: React.FC = () => {
  const { gl, scene } = useThree();
  const teamName = useAssemblyStore((s) => s.teamName);
  const team = useRef(teamName);
  team.current = teamName;

  useEffect(() => {
    const capture = (angle: PhotoAngle): Promise<Blob | null> => {
      const W = 1920;
      const H = 1080;
      const pose = ROOM_VIEWS[angle];
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.03, 40);
      camera.position.set(...pose.pos);
      camera.lookAt(...pose.target);
      const size = gl.getSize(new THREE.Vector2());
      const ratio = gl.getPixelRatio();
      // Renderiza um quadro no tamanho da foto e copia na mesma tarefa, antes de o navegador limpar o buffer
      gl.setPixelRatio(1);
      gl.setSize(W, H, false);
      gl.render(scene, camera);
      const shot = document.createElement('canvas');
      shot.width = W;
      shot.height = H;
      const ctx = shot.getContext('2d');
      ctx?.drawImage(gl.domElement, 0, 0, W, H);
      gl.setPixelRatio(ratio);
      gl.setSize(size.x, size.y, false);
      if (!ctx) return Promise.resolve(null);
      // Selo da equipe e data (ADR-006)
      const date = new Date().toLocaleDateString('pt-BR');
      ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
      ctx.fillRect(W - 560, H - 150, 520, 110);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(W - 560, H - 150, 520, 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 30px ui-monospace, monospace';
      ctx.fillText(`QUARTO DE ${(team.current || 'EQUIPE').toUpperCase().slice(0, 18)}`, W - 535, H - 98);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '22px ui-monospace, monospace';
      ctx.fillText(`PC Builder Academy • ${date}`, W - 535, H - 62);
      return new Promise((resolve) => shot.toBlob((b) => resolve(b), 'image/png'));
    };
    useDecorModeStore.getState().registerPhoto(capture);
    return () => useDecorModeStore.getState().registerPhoto(null);
  }, [gl, scene]);
  return null;
};

/* ====================================================================================
 * Cena completa
 * ==================================================================================== */
export const DecorScene: React.FC<{ interactive: boolean }> = ({ interactive }) => {
  const ctx = useRoomContext();
  const { items, ready } = useRoomDecorStore(useShallow((s) => ({ items: s.items, ready: s.ready })));
  const theme = useAssemblyStore((s) => s.selectedRoomTheme);
  const selectedId = useDecorModeStore((s) => s.selectedId);
  const reduced = usePrefersReducedMotion();
  const accent = ROOM_PALETTES[theme].accent;
  const maxTexture = ctx.limits.maxTexture;

  // Carrega o quarto salvo (ou o conjunto inicial) para a mesa atual
  useEffect(() => {
    let alive = true;
    void Promise.resolve(useRoomDecorStore.persist.rehydrate()).then(() => {
      if (!alive) return;
      prepareRoom();
      // Testes E2E: mesmo gancho do store de montagem (src/app/page.tsx)
      Object.assign(window, { useRoomDecorStore, useDecorModeStore });
    });
    return () => {
      alive = false;
    };
  }, []);

  // Sair do modo libera geometrias e materiais compartilhados (#91)
  useEffect(() => () => disposeCaches(), []);

  // No máximo `maxAnimated` peças animadas, e nenhuma com movimento reduzido
  const animatedIds = useMemo(() => {
    if (reduced) return new Set<string>();
    const ids = items.filter((p) => {
      const it = findDecorItem(p.decorId);
      return it ? isAnimatedPlacement(it, p.variant) : false;
    });
    return new Set(ids.slice(0, ctx.limits.maxAnimated).map((p) => p.instanceId));
  }, [items, reduced, ctx.limits.maxAnimated]);

  // Duas ou mais peças iguais e estáticas viram uma InstancedMesh por primitiva (#91)
  const { single, instanced } = useMemo(() => {
    const byId = new Map<string, PlacedDecor[]>();
    items.forEach((p) => byId.set(p.decorId, [...(byId.get(p.decorId) ?? []), p]));
    const one: PlacedDecor[] = [];
    const many: [DecorItem, PlacedDecor[]][] = [];
    byId.forEach((group, decorId) => {
      const item = findDecorItem(decorId);
      if (item && group.length >= 2 && group.every((p) => canInstance(item, p.variant))) many.push([item, group]);
      else one.push(...group);
    });
    return { single: one, instanced: many };
  }, [items]);
  const selected = items.find((p) => p.instanceId === selectedId) ?? null;

  if (!ready) return null;

  return (
    <group>
      {single.map((p) => (
        <PlacedDecorView key={p.instanceId} placed={p} accent={accent} animate={animatedIds.has(p.instanceId)} interactive={interactive} maxTexture={maxTexture} />
      ))}
      {instanced.map(([item, group]) => (
        <InstancedDecor key={item.id} item={item} placements={group} interactive={interactive} />
      ))}
      {interactive && selected && <SelectionBox placed={selected} />}
      {items
        .filter((p) => p.decorId === 'decor-vitrine')
        .map((host) => (
          <ShowcaseTrophies key={`t-${host.instanceId}`} host={host} items={items} />
        ))}
      {items
        .filter((p) => p.decorId === 'proc-linha-do-tempo')
        .flatMap((host) =>
          shelfSlots(host).map((s, i) => (
            <TimelinePlaque key={`${host.instanceId}-${i}`} year={MUSEUM_TIMELINE[i]?.year ?? ''} label={MUSEUM_TIMELINE[i]?.label ?? ''} position={s.position} rotationY={(s.rotationY * Math.PI) / 180} />
          ))
        )}
      {interactive && <PlacementLayer ctx={ctx} items={items} accent={accent} maxTexture={maxTexture} />}
      <PhotoRig />
    </group>
  );
};

export default DecorScene;
