'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { buildExternalCablePath } from '@/engine/cableRouting';
import {
  EXTERNAL_CABLES,
  EXTERNAL_CABLE_IDS,
  EXTERNAL_PORTS,
  ExternalCableConnection,
  ExternalCableId,
  ExternalPortId,
  getCableEndCandidates,
  getExternalPortWorldPosition,
  getPortStatus,
  validateExternalCableConnection,
} from '@/engine/externalCabling';
import { pickCablePort, useDeskPlacementStore } from './deskPlacementStore';

/* ====================================================================================
 * Cabo conectado: tubo ao longo de uma Catmull-Rom pelos pontos do motor de roteamento.
 * Cabo de vídeo pedagogicamente errado pulsa em âmbar (o monitor mostra SEM SINAL).
 * ==================================================================================== */
const CableTube: React.FC<{
  cableId: ExternalCableId;
  connection: ExternalCableConnection;
  deskWidth: number;
  isWrong: boolean;
}> = ({ cableId, connection, deskWidth, isWrong }) => {
  const spec = EXTERNAL_CABLES[cableId];
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { sourcePort, destPort } = connection;

  const geometry = useMemo(() => {
    const points = buildExternalCablePath({ sourcePort, destPort }, deskWidth).map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    return new THREE.TubeGeometry(curve, 96, Math.max(0.0035, spec.thickness / 2), 8, false);
  }, [sourcePort, destPort, deskWidth, spec.thickness]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Conectores nas duas pontas
  const ends = useMemo(
    () => [getExternalPortWorldPosition(sourcePort, deskWidth), getExternalPortWorldPosition(destPort, deskWidth)],
    [sourcePort, destPort, deskWidth]
  );

  useFrame(({ clock }) => {
    const m = materialRef.current;
    if (!m) return;
    m.emissiveIntensity = isWrong ? 0.6 + Math.sin(clock.elapsedTime * 5) * 0.4 : 0;
  });

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial ref={materialRef} color={spec.color} roughness={0.55} metalness={0.1} emissive="#f59e0b" emissiveIntensity={0} />
      </mesh>
      {ends.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.018, 0.012, 0.022]} />
          <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

/* ====================================================================================
 * Ponto de conexão: aparece só com um cabo em mãos, nas portas válidas para a ponta atual.
 * Ciano = livre; âmbar = ocupada por outro cabo; branco = ponta já escolhida.
 * ==================================================================================== */
const PortHotspot: React.FC<{
  port: ExternalPortId;
  deskWidth: number;
  variant: 'free' | 'occupied' | 'chosen';
  occupiedByName?: string;
}> = ({ port, deskWidth, variant, occupiedByName }) => {
  const ref = useRef<THREE.Mesh>(null);
  const shake = useRef(0);
  const [hovered, setHovered] = useState(false);
  const lastRejectedPort = useDeskPlacementStore((s) => s.lastRejectedPort);
  const position = useMemo(() => getExternalPortWorldPosition(port, deskWidth), [port, deskWidth]);

  useEffect(() => {
    if (lastRejectedPort?.port === port) shake.current = 0.4;
  }, [lastRejectedPort, port]);

  useFrame(({ clock }, delta) => {
    const m = ref.current;
    if (!m) return;
    const pulse = variant === 'free' ? 1 + Math.sin(clock.elapsedTime * 5) * 0.18 : 1;
    m.scale.setScalar(pulse * (hovered ? 1.35 : 1));
    if (shake.current > 0) {
      shake.current = Math.max(0, shake.current - delta);
      m.position.x = position[0] + Math.sin(shake.current * 80) * 0.006;
    } else {
      m.position.x = position[0];
    }
  });

  const color = variant === 'free' ? '#22d3ee' : variant === 'chosen' ? '#f8fafc' : '#f59e0b';
  return (
    <group>
      <mesh
        ref={ref}
        position={position}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          pickCablePort(port);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.014, 16, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} />
      </mesh>
      {hovered && (
        <Html position={[position[0], position[1] + 0.05, position[2]]} center style={{ pointerEvents: 'none' }}>
          <div
            style={{ width: 210 }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-600 bg-slate-950/95 text-[11px] font-mono leading-snug text-slate-200 shadow-xl"
          >
            <div className="font-bold">{EXTERNAL_PORTS[port].name}</div>
            <div className={variant === 'occupied' ? 'text-amber-300' : 'text-cyan-300'}>
              {variant === 'occupied'
                ? `Ocupada por: ${occupiedByName}`
                : variant === 'chosen'
                ? 'Ponta escolhida — clique de novo para soltar'
                : 'Clique para conectar aqui'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};

/* ====================================================================================
 * Camada completa: cabos conectados + pontos de conexão do cabo em mãos
 * ==================================================================================== */
export const DeskCablesLayer: React.FC<{ deskWidth: number }> = ({ deskWidth }) => {
  const { connections, assembly, placedDeskItems, externalCabling } = useAssemblyStore(
    useShallow((s) => ({
      connections: s.externalCabling.connections,
      externalCabling: s.externalCabling,
      assembly: s.assembly,
      placedDeskItems: s.deskSetup.placedDeskItems,
    }))
  );
  const heldCable = useDeskPlacementStore((s) => s.heldCable);

  const candidates = heldCable ? getCableEndCandidates(heldCable.cableId, heldCable.firstPort) : [];

  return (
    <group>
      {EXTERNAL_CABLE_IDS.map((id) => {
        const conn = connections[id];
        if (!conn) return null;
        const validation = id === 'CABLE_DISPLAY' ? validateExternalCableConnection(id, conn.sourcePort, conn.destPort, assembly) : null;
        const isWrong = Boolean(validation && (!validation.allowed || !validation.isPedagogicallyValid));
        return <CableTube key={id} cableId={id} connection={conn} deskWidth={deskWidth} isWrong={isWrong} />;
      })}

      {heldCable?.firstPort && (
        <PortHotspot port={heldCable.firstPort} deskWidth={deskWidth} variant="chosen" />
      )}

      {heldCable &&
        candidates.map((port) => {
          // Portas de aparelhos que não estão na mesa (ou saídas inexistentes da GPU) não aparecem
          const host = EXTERNAL_PORTS[port].hostSnapPoint;
          if (host !== 'WALL' && !placedDeskItems[host]) return null;
          const status = getPortStatus(port, heldCable.cableId, assembly, externalCabling);
          if (status.status === 'NOT_PRESENT') return null;
          return (
            <PortHotspot
              key={port}
              port={port}
              deskWidth={deskWidth}
              variant={status.status === 'OCCUPIED' ? 'occupied' : 'free'}
              occupiedByName={status.status === 'OCCUPIED' ? EXTERNAL_CABLES[status.occupiedBy].name : undefined}
            />
          );
        })}
    </group>
  );
};

export default DeskCablesLayer;
