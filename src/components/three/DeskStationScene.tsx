'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import {
  DESK_DEPTH,
  DESK_SNAP_POINTS,
  DESK_SNAP_POINT_IDS,
  DESK_TOP_HEIGHT,
  DESK_WIDTH_BY_ID,
  DeskSnapPointId,
  DeskSnapPointState,
  PlacedDeskItem,
  REFERENCE_DESK_WIDTH,
  evaluateDeskSnapPoints,
  getDeskWidth,
  getSnapPointPosition,
  isPcReadyForDesk,
} from '@/engine/deskSetup';
import { EXTERNAL_PORTS, ExternalPortId, WALL_Z, getExternalPortWorldPosition } from '@/engine/externalCabling';
import { FittedModel } from './FittedModel';
import { caseModelUrlFor, deskModelFor, towerHeightFor } from './deskModels';
import { placeHeldItem, useDeskPlacementStore } from './deskPlacementStore';
import { DeskCablesLayer } from './DeskCablesLayer';
import { MonitorView } from './MonitorView';

/* ====================================================================================
 * Constantes de interação (metros)
 * ==================================================================================== */
/** Raio de atração magnética do item arrastado até o seu snap point */
const MAGNET_RADIUS = 0.28;
const COLOR_AVAILABLE = '#22d3ee';
const COLOR_BLOCKED = '#f59e0b';

/** Altura do volume do holograma de cada snap point */
const HOLOGRAM_HEIGHT: Record<DeskSnapPointId, number> = {
  DESK_BASE: DESK_TOP_HEIGHT,
  PC_TOWER: 0.47,
  MONITOR_MAIN: 0.45,
  MONITOR_ARM: 0.38,
  MOUSEPAD: 0.006,
  KEYBOARD: 0.035,
  MOUSE: 0.04,
  HEADSET: 0.2,
  CHAIR: 1.05,
};

/** Largura do holograma: a mesa usa a largura do modelo em mãos (140 ou 120 cm) */
function footprintFor(snapPointId: DeskSnapPointId, item: PlacedDeskItem | null): [number, number] {
  if (snapPointId === 'DESK_BASE') {
    const width = (item && DESK_WIDTH_BY_ID[item.itemId]) || REFERENCE_DESK_WIDTH;
    return [width, DESK_DEPTH];
  }
  if (snapPointId === 'MOUSEPAD' && item?.itemId === 'mousepad-control-desk') return [0.8, 0.3];
  return DESK_SNAP_POINTS[snapPointId].footprint;
}

/* ====================================================================================
 * Sala do laboratório: piso antiestático, parede e régua de tomadas/rede
 * As tomadas ficam exatamente nas posições das portas WALL_* do motor de cabeamento.
 * ==================================================================================== */
const WALL_PORTS: ExternalPortId[] = ['WALL_OUTLET_1', 'WALL_OUTLET_2', 'WALL_RJ45'];

const LaboratoryRoom: React.FC = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      <meshStandardMaterial color="#0a1020" roughness={0.85} metalness={0.1} />
    </mesh>
    <gridHelper args={[8, 32, '#0e7490', '#162033']} position={[0, 0.001, 0]} />
    <mesh position={[0, 1.5, WALL_Z - 0.01]} receiveShadow>
      <planeGeometry args={[8, 3]} />
      <meshStandardMaterial color="#0b1222" roughness={0.95} />
    </mesh>
    {/* Rodapé técnico com canaleta */}
    <mesh position={[0, 0.05, WALL_Z + 0.01]}>
      <boxGeometry args={[8, 0.1, 0.02]} />
      <meshStandardMaterial color="#111a2e" roughness={0.6} />
    </mesh>
    {WALL_PORTS.map((id) => {
      const [x, y, z] = getExternalPortWorldPosition(id);
      const isNetwork = EXTERNAL_PORTS[id].portType === 'RJ45';
      return (
        <group key={id} position={[x, y, z + 0.012]}>
          <mesh>
            <boxGeometry args={[0.09, 0.11, 0.02]} />
            <meshStandardMaterial color={isNetwork ? '#1e293b' : '#e2e8f0'} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.011]}>
            <boxGeometry args={isNetwork ? [0.03, 0.025, 0.004] : [0.045, 0.045, 0.004]} />
            <meshStandardMaterial color={isNetwork ? '#eab308' : '#334155'} />
          </mesh>
        </group>
      );
    })}
  </group>
);

/** Sincronização RGB: com o sistema em execução, as fitas de LED percorrem o espectro */
function useRgbSync(materialRef: React.RefObject<THREE.MeshStandardMaterial | THREE.LineBasicMaterial | null>, isRunning: boolean) {
  const color = useMemo(() => new THREE.Color(), []);
  useFrame(({ clock }) => {
    const m = materialRef.current;
    if (!m) return;
    if (isRunning) color.setHSL((clock.elapsedTime * 0.08) % 1, 0.85, 0.55);
    else color.set('#0e7490');
    m.color.copy(color);
    if (m instanceof THREE.MeshStandardMaterial) {
      m.emissive.copy(color);
      m.emissiveIntensity = isRunning ? 1.6 : 0.6;
    }
  });
}

/* ====================================================================================
 * Mesa procedural (as dimensões vêm do catálogo; o GLB mesa-gamer traz periféricos embutidos)
 * ==================================================================================== */
const ProceduralDesk: React.FC<{ itemId: string; width: number; ghost?: boolean; isRunning?: boolean }> = ({
  itemId,
  width,
  ghost,
  isRunning = false,
}) => {
  const isWood = itemId === 'desk-wood-minimal';
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  useRgbSync(ledRef, isRunning);
  const legInsetX = width / 2 - 0.06;
  const legInsetZ = DESK_DEPTH / 2 - 0.06;
  const opacity = ghost ? 0.4 : 1;
  const transparent = Boolean(ghost);
  return (
    <group>
      <mesh position={[0, DESK_TOP_HEIGHT - 0.015, 0]} castShadow={!ghost} receiveShadow>
        <boxGeometry args={[width, 0.03, DESK_DEPTH]} />
        {isWood ? (
          <meshStandardMaterial color="#9a7046" roughness={0.65} transparent={transparent} opacity={opacity} />
        ) : (
          <meshPhysicalMaterial
            color="#111827"
            roughness={0.35}
            metalness={0.3}
            clearcoat={0.8}
            clearcoatRoughness={0.25}
            transparent={transparent}
            opacity={opacity}
          />
        )}
      </mesh>
      {/* Pés e travessa em aço */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * legInsetX, (DESK_TOP_HEIGHT - 0.03) / 2, sz * legInsetZ]} castShadow={!ghost}>
            <boxGeometry args={[0.045, DESK_TOP_HEIGHT - 0.03, 0.045]} />
            <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.35} transparent={transparent} opacity={opacity} />
          </mesh>
        ))
      )}
      <mesh position={[0, 0.12, -legInsetZ]}>
        <boxGeometry args={[width - 0.12, 0.03, 0.03]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.35} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Fita de LED sob a borda frontal (só na mesa de carbono) */}
      {!isWood && !ghost && (
        <mesh position={[0, DESK_TOP_HEIGHT - 0.034, DESK_DEPTH / 2 - 0.01]}>
          <boxGeometry args={[width - 0.04, 0.004, 0.006]} />
          <meshStandardMaterial ref={ledRef} color="#22d3ee" emissive="#0891b2" emissiveIntensity={1.4} />
        </mesh>
      )}
    </group>
  );
};

const ProceduralMousepad: React.FC<{ itemId: string; ghost?: boolean; isRunning?: boolean }> = ({
  itemId,
  ghost,
  isRunning = false,
}) => {
  const stitchRef = useRef<THREE.LineBasicMaterial>(null);
  useRgbSync(stitchRef, isRunning);
  const isFelt = itemId === 'mousepad-control-desk';
  const [w, d] = isFelt ? [0.8, 0.3] : [0.9, 0.4];
  const thickness = isFelt ? 0.003 : 0.004;
  // Contorno da costura iluminada (criado uma vez por tamanho, não a cada render)
  const stitch = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(w - 0.01, 0.0001, d - 0.01)), [w, d]);
  useEffect(() => () => stitch.dispose(), [stitch]);
  return (
    <group>
      <mesh position={[0, thickness / 2, 0]} receiveShadow>
        <boxGeometry args={[w, thickness, d]} />
        <meshStandardMaterial color={isFelt ? '#3f4654' : '#0b1220'} roughness={0.95} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
      {/* Costura iluminada da borda (deskmat gamer) */}
      {!isFelt && !ghost && (
        <lineSegments position={[0, thickness + 0.0008, 0]} geometry={stitch}>
          <lineBasicMaterial ref={stitchRef} color="#22d3ee" />
        </lineSegments>
      )}
    </group>
  );
};

/** Braço articulado a gás: grampo na borda traseira, coluna e braço até o VESA do monitor */
const MonitorArm: React.FC<{ monitorOffsetZ: number }> = ({ monitorOffsetZ }) => (
  <group>
    <mesh position={[0, 0.03, 0]} castShadow>
      <boxGeometry args={[0.09, 0.06, 0.09]} />
      <meshStandardMaterial color="#111827" metalness={0.6} roughness={0.35} />
    </mesh>
    <mesh position={[0, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.018, 0.018, 0.34, 16]} />
      <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.25} />
    </mesh>
    <mesh position={[0, 0.34, monitorOffsetZ / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.014, 0.014, Math.abs(monitorOffsetZ) + 0.02, 12]} />
      <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.25} />
    </mesh>
  </group>
);

/* ====================================================================================
 * Item posicionado: modelo + assentamento elástico (spring) ao soltar + menu "Retirar"
 * ==================================================================================== */
interface PlacedItemViewProps {
  snapPointId: DeskSnapPointId;
  item: PlacedDeskItem;
  deskWidth: number;
  isRunning: boolean;
  poweredAt: number | null;
  monitorZ: number;
  onSelect: (snap: DeskSnapPointId) => void;
}

const PlacedItemView: React.FC<PlacedItemViewProps> = ({
  snapPointId,
  item,
  deskWidth,
  isRunning,
  poweredAt,
  monitorZ,
  onSelect,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const spring = useRef({ y: 0, v: 0 });
  const lastPlaced = useDeskPlacementStore((s) => s.lastPlaced);
  const caseInstalled = useAssemblyStore((s) => s.assembly.caseInstalled);

  // Encaixe elástico: o item "cai" alguns centímetros e quica até assentar
  useEffect(() => {
    if (lastPlaced?.snapPointId === snapPointId) {
      spring.current = { y: 0.12, v: 0 };
    }
  }, [lastPlaced, snapPointId]);

  useFrame((_, delta) => {
    const s = spring.current;
    if (Math.abs(s.y) < 1e-4 && Math.abs(s.v) < 1e-4) return;
    const dt = Math.min(delta, 1 / 30);
    const accel = -260 * s.y - 16 * s.v;
    s.v += accel * dt;
    s.y += s.v * dt;
    if (groupRef.current) groupRef.current.position.y = s.y;
  });

  const [x, y, z] = getSnapPointPosition(snapPointId, deskWidth);
  const yaw = DESK_SNAP_POINTS[snapPointId].nominalRotation?.[1] ?? 0;
  const model = deskModelFor(snapPointId, item);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(snapPointId);
  };

  let content: React.ReactNode;
  if (snapPointId === 'DESK_BASE') {
    content = <ProceduralDesk itemId={item.itemId} width={deskWidth} isRunning={isRunning} />;
  } else if (snapPointId === 'MOUSEPAD') {
    content = <ProceduralMousepad itemId={item.itemId} isRunning={isRunning} />;
  } else if (snapPointId === 'MONITOR_MAIN' && model?.screen) {
    content = <MonitorView model={model} poweredAt={poweredAt} />;
  } else if (snapPointId === 'MONITOR_ARM') {
    content = <MonitorArm monitorOffsetZ={monitorZ - z} />;
  } else if (snapPointId === 'PC_TOWER') {
    content = (
      <group>
        <FittedModel url={caseModelUrlFor(caseInstalled)} fitAxis="y" size={towerHeightFor(caseInstalled)} />
        {/* LED de power no painel frontal */}
        <mesh position={[0.07, towerHeightFor(caseInstalled) - 0.03, 0.236]}>
          <sphereGeometry args={[0.006, 10, 10]} />
          <meshStandardMaterial
            color={poweredAt !== null ? '#34d399' : '#475569'}
            emissive={poweredAt !== null ? '#10b981' : '#000000'}
            emissiveIntensity={poweredAt !== null ? 2 : 0}
          />
        </mesh>
      </group>
    );
  } else if (model) {
    const copies = model.copiesX ?? [0];
    content = (
      <>
        {copies.map((dx) => (
          <group key={dx} position={[dx, 0, 0]}>
            <FittedModel url={model.url} fitAxis={model.fitAxis} size={model.size} rotation={model.rotation} />
          </group>
        ))}
      </>
    );
  }

  return (
    <group position={[x, y, z]} rotation={[0, yaw, 0]} onClick={handleClick}>
      <group ref={groupRef}>
        <Suspense fallback={null}>{content}</Suspense>
      </group>
    </group>
  );
};

/* ====================================================================================
 * Holograma de encaixe: volume translúcido + contorno, pulsa quando disponível,
 * treme quando o aluno tenta forçar um item sem o pré-requisito
 * ==================================================================================== */
interface SnapHologramProps {
  state: DeskSnapPointState;
  heldItem: PlacedDeskItem;
  deskWidth: number;
  isMagnet: boolean;
  onActivate: (snap: DeskSnapPointId) => void;
}

const SnapHologram: React.FC<SnapHologramProps> = ({ state, heldItem, deskWidth, isMagnet, onActivate }) => {
  const groupRef = useRef<THREE.Group>(null);
  const fillRef = useRef<THREE.MeshBasicMaterial>(null);
  const shake = useRef(0);
  const [hovered, setHovered] = useState(false);
  const lastRejected = useDeskPlacementStore((s) => s.lastRejected);
  const { snapPointId, status } = state;

  useEffect(() => {
    if (lastRejected?.snapPointId === snapPointId) shake.current = 0.45;
  }, [lastRejected, snapPointId]);

  useFrame(({ clock }, delta) => {
    if (fillRef.current) {
      const base = status === 'AVAILABLE' ? 0.16 : 0.1;
      const pulse = status === 'AVAILABLE' ? Math.sin(clock.elapsedTime * 4) * 0.06 : 0;
      fillRef.current.opacity = base + pulse + (isMagnet || hovered ? 0.12 : 0);
    }
    if (groupRef.current) {
      if (shake.current > 0) {
        shake.current = Math.max(0, shake.current - delta);
        groupRef.current.position.x = Math.sin(shake.current * 70) * 0.012 * (shake.current / 0.45);
      } else {
        groupRef.current.position.x = 0;
      }
      const targetScale = isMagnet ? 1.04 : 1;
      groupRef.current.scale.x += (targetScale - groupRef.current.scale.x) * 0.2;
      groupRef.current.scale.z += (targetScale - groupRef.current.scale.z) * 0.2;
    }
  });

  const [x, , z] = getSnapPointPosition(snapPointId, deskWidth);
  const baseY = snapPointId === 'DESK_BASE' || snapPointId === 'CHAIR' ? 0 : DESK_TOP_HEIGHT;
  const [w, d] = footprintFor(snapPointId, heldItem);
  const h = HOLOGRAM_HEIGHT[snapPointId];
  const color = status === 'AVAILABLE' ? COLOR_AVAILABLE : COLOR_BLOCKED;

  return (
    <group position={[x, baseY, z]}>
      <group ref={groupRef}>
        <mesh
          position={[0, h / 2 + 0.001, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onActivate(snapPointId);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[w, Math.max(h, 0.006), d]} />
          <meshBasicMaterial ref={fillRef} color={color} transparent opacity={0.15} depthWrite={false} />
          <Edges color={color} />
        </mesh>
        {/* Feixe vertical de localização */}
        <mesh position={[0, h + 0.15, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.3, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      </group>
      {(hovered || isMagnet) && (
        <Html position={[0, h + 0.12, 0]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{ width: 220 }}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono leading-snug shadow-xl ${
              status === 'AVAILABLE'
                ? 'bg-slate-950/95 border-cyan-400/70 text-cyan-200'
                : 'bg-slate-950/95 border-amber-400/70 text-amber-200'
            }`}
          >
            <div className="font-bold">{DESK_SNAP_POINTS[snapPointId].label}</div>
            <div className="text-slate-300">{status === 'AVAILABLE' ? 'Solte ou clique para encaixar' : state.message}</div>
          </div>
        </Html>
      )}
    </group>
  );
};

/* ====================================================================================
 * Fantasma do item em mãos: segue o cursor sobre o plano do tampo e é atraído pelo snap
 * ==================================================================================== */
const HeldItemGhost: React.FC<{
  item: PlacedDeskItem;
  deskWidth: number;
  pointer: React.MutableRefObject<THREE.Vector3 | null>;
  magnetTarget: [number, number, number] | null;
}> = ({ item, deskWidth, pointer, magnetTarget }) => {
  const ref = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const p = pointer.current;
    g.visible = Boolean(p);
    if (!p) return;
    if (magnetTarget) target.set(...magnetTarget);
    else target.copy(p);
    // Atração magnética: o fantasma "gruda" no snap com uma aproximação suave
    g.position.lerp(target, magnetTarget ? 0.35 : 0.6);
  });

  const snap = item.snapPointId;
  const model = deskModelFor(snap, item);
  const [w, d] = footprintFor(snap, item);
  return (
    <group ref={ref} visible={false}>
      {snap === 'DESK_BASE' ? (
        <ProceduralDesk itemId={item.itemId} width={(DESK_WIDTH_BY_ID[item.itemId] ?? deskWidth)} ghost />
      ) : snap === 'MOUSEPAD' ? (
        <ProceduralMousepad itemId={item.itemId} ghost />
      ) : model ? (
        <Suspense fallback={null}>
          <FittedModel url={model.url} fitAxis={model.fitAxis} size={model.size} rotation={model.rotation} castShadow={false} opacity={0.45} />
        </Suspense>
      ) : (
        <mesh position={[0, HOLOGRAM_HEIGHT[snap] / 2, 0]}>
          <boxGeometry args={[w, HOLOGRAM_HEIGHT[snap], d]} />
          <meshBasicMaterial color={COLOR_AVAILABLE} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

/* ====================================================================================
 * Cena completa da estação
 * ==================================================================================== */
export interface DeskStationSceneProps {
  isRunning: boolean;
}

/** Instante (performance.now) em que a estação foi ligada: base da linha do tempo do boot na tela */
function usePoweredAt(isOn: boolean): number | null {
  const [poweredAt, setPoweredAt] = useState<number | null>(null);
  useEffect(() => {
    setPoweredAt(isOn ? performance.now() : null);
  }, [isOn]);
  return poweredAt;
}

export const DeskStationScene: React.FC<DeskStationSceneProps> = ({ isRunning }) => {
  const isPoweredOn = useAssemblyStore((s) => s.deskSetup.isDeskPoweredOn);
  const poweredAt = usePoweredAt(isPoweredOn);
  const { placedDeskItems, studentSetup, assembly, selectedMotherboard } = useAssemblyStore(
    useShallow((s) => ({
      placedDeskItems: s.deskSetup.placedDeskItems,
      studentSetup: s.studentSetup,
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
    }))
  );
  const { heldItem, isDragging, magnetSnap, setMagnetSnap, endDrag, holdItem, inspect } = useDeskPlacementStore(
    useShallow((s) => ({
      heldItem: s.heldItem,
      isDragging: s.isDragging,
      magnetSnap: s.magnetSnap,
      setMagnetSnap: s.setMagnetSnap,
      endDrag: s.endDrag,
      holdItem: s.holdItem,
      inspect: s.inspect,
    }))
  );

  const deskWidth = getDeskWidth(placedDeskItems);
  const isPcAssembled = isPcReadyForDesk(assembly, selectedMotherboard);
  const states = useMemo(
    () => evaluateDeskSnapPoints(heldItem, placedDeskItems, { isPcAssembled, studentSetup }),
    [heldItem, placedDeskItems, isPcAssembled, studentSetup]
  );

  const pointer = useRef<THREE.Vector3 | null>(null);
  const targetSnap = heldItem?.snapPointId ?? null;
  const targetState = targetSnap ? states[targetSnap] : null;
  const targetCanReceive = targetState?.status === 'AVAILABLE' || targetState?.status === 'BLOCKED';
  const targetPos = targetSnap ? getSnapPointPosition(targetSnap, deskWidth) : null;
  const planeY = targetSnap === 'DESK_BASE' || targetSnap === 'CHAIR' ? 0 : DESK_TOP_HEIGHT;
  const magnetTarget: [number, number, number] | null =
    magnetSnap && targetPos ? [targetPos[0], planeY === 0 ? 0 : targetPos[1], targetPos[2]] : null;

  const attemptPlace = (snap: DeskSnapPointId) => {
    placeHeldItem(snap);
  };

  /** Snap que atrai o item no ponto informado (null se fora do raio magnético) */
  const magnetAt = (point: THREE.Vector3): DeskSnapPointId | null => {
    if (!heldItem || !targetPos || !targetCanReceive) return null;
    const dist = Math.hypot(point.x - targetPos[0], point.z - targetPos[2]);
    return dist <= MAGNET_RADIUS ? heldItem.snapPointId : null;
  };

  const handlePlaneMove = (e: ThreeEvent<PointerEvent>) => {
    if (!heldItem) return;
    pointer.current = e.point.clone().setY(planeY);
    setMagnetSnap(magnetAt(e.point));
  };

  const handlePlaneUp = (e: ThreeEvent<PointerEvent>) => {
    if (!heldItem || !isDragging) return;
    e.stopPropagation();
    // Calcula no próprio ponto de soltura: não depende de um pointermove anterior ter chegado
    const snap = magnetAt(e.point);
    if (snap) attemptPlace(snap);
    else endDrag();
  };

  const handlePlaneClick = (e: ThreeEvent<MouseEvent>) => {
    if (!heldItem) {
      inspect(null);
      return;
    }
    e.stopPropagation();
    // Click-to-place tolerante: clicar perto do encaixe (dentro do raio magnético) também vale
    const snap = magnetAt(e.point);
    if (snap) attemptPlace(snap);
  };

  // Sem item em mãos, o fantasma some
  useEffect(() => {
    if (!heldItem) pointer.current = null;
  }, [heldItem]);

  // Esc cancela o item em mãos (equivalência de teclado)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') holdItem(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [holdItem]);

  const monitorZ = getSnapPointPosition('MONITOR_MAIN', deskWidth)[2];

  return (
    <group>
      <LaboratoryRoom />

      {DESK_SNAP_POINT_IDS.map((id) => {
        const item = placedDeskItems[id];
        return item ? (
          <PlacedItemView
            key={id}
            snapPointId={id}
            item={item}
            deskWidth={deskWidth}
            isRunning={isRunning}
            poweredAt={poweredAt}
            monitorZ={monitorZ}
            onSelect={(snap) => (heldItem ? undefined : inspect(snap))}
          />
        ) : null;
      })}

      <DeskCablesLayer deskWidth={deskWidth} />

      {heldItem &&
        DESK_SNAP_POINT_IDS.map((id) => {
          const state = states[id];
          if (state.status !== 'AVAILABLE' && state.status !== 'BLOCKED') return null;
          return (
            <SnapHologram
              key={id}
              state={state}
              heldItem={heldItem}
              deskWidth={deskWidth}
              isMagnet={magnetSnap === id}
              onActivate={attemptPlace}
            />
          );
        })}

      {heldItem && (
        <>
          {/* Plano invisível que captura o cursor na altura de apoio do item em mãos */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, planeY + 0.0005, 0]}
            onPointerMove={handlePlaneMove}
            onPointerUp={handlePlaneUp}
            onClick={handlePlaneClick}
            onPointerLeave={() => {
              pointer.current = null;
              setMagnetSnap(null);
            }}
          >
            <planeGeometry args={[6, 6]} />
            <meshBasicMaterial visible={false} />
          </mesh>
          <HeldItemGhost item={heldItem} deskWidth={deskWidth} pointer={pointer} magnetTarget={magnetTarget} />
        </>
      )}
    </group>
  );
};

export default DeskStationScene;
