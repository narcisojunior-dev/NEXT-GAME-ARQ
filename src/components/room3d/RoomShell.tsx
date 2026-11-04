'use client';

import React, { useMemo } from 'react';
import { EXTERNAL_PORTS, ExternalPortId, getExternalPortWorldPosition } from '@/engine/externalCabling';
import { DOOR, ROOM_HEIGHT, ROOM_MAX_X, ROOM_MAX_Z, ROOM_MIN_X, ROOM_MIN_Z, ROOM_SIZE, WINDOW } from '@/engine/roomLayout';
import { RoomThemeId } from '@/engine/roomThemes';

/**
 * Quarto 3D (#86): piso, parede do fundo (com as tomadas do cabeamento externo nas mesmas
 * posições), parede esquerda com janela e porta. Frente e lado direito ficam abertos para a câmera.
 * Geometria simples e materiais por tema: nenhum download.
 */
export interface RoomPalette {
  wall: string;
  wallLeft: string;
  baseboard: string;
  floor: string;
  floorRoughness: number;
  /** Céu visto pela janela */
  sky: string;
  accent: string;
  /** Luz de destaque do tema (ponto de luz no canto) */
  accentLight: string;
  accentIntensity: number;
}

export const ROOM_PALETTES: Record<RoomThemeId, RoomPalette> = {
  ROOM_GAMER: { wall: '#151a2e', wallLeft: '#121729', baseboard: '#0b0f1c', floor: '#1b2030', floorRoughness: 0.55, sky: '#1e3a8a', accent: '#22d3ee', accentLight: '#d946ef', accentIntensity: 1.4 },
  ROOM_OFFICE: { wall: '#e7e2d8', wallLeft: '#ddd6c9', baseboard: '#bfb6a6', floor: '#a7825c', floorRoughness: 0.7, sky: '#93c5fd', accent: '#10b981', accentLight: '#fde68a', accentIntensity: 0.9 },
  ROOM_LAB: { wall: '#cbd5e1', wallLeft: '#c0cad8', baseboard: '#475569', floor: '#334155', floorRoughness: 0.8, sky: '#7dd3fc', accent: '#3b82f6', accentLight: '#e0f2fe', accentIntensity: 0.8 },
  ROOM_VAPORWAVE: { wall: '#3b1863', wallLeft: '#341557', baseboard: '#1e0a36', floor: '#2a1446', floorRoughness: 0.5, sky: '#fb7185', accent: '#d946ef', accentLight: '#f472b6', accentIntensity: 1.5 },
};

const WALL_PORTS: ExternalPortId[] = ['WALL_OUTLET_1', 'WALL_OUTLET_2', 'WALL_RJ45'];
const T = 0.04;

/** Trecho de parede esquerda entre z0 e z1, de y0 a y1 */
const LeftWallPiece: React.FC<{ z0: number; z1: number; y0: number; y1: number; color: string }> = ({ z0, z1, y0, y1, color }) =>
  z1 - z0 > 0.001 && y1 - y0 > 0.001 ? (
    <mesh position={[ROOM_MIN_X - T / 2, (y0 + y1) / 2, (z0 + z1) / 2]} receiveShadow>
      <boxGeometry args={[T, y1 - y0, z1 - z0]} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  ) : null;

export const RoomShell: React.FC<{ theme: RoomThemeId }> = ({ theme }) => {
  const p = ROOM_PALETTES[theme];
  const centerZ = (ROOM_MIN_Z + ROOM_MAX_Z) / 2;
  const [w0, w1] = WINDOW.u;
  const [d0, d1] = DOOR.u;
  const windowMidY = (WINDOW.y[0] + WINDOW.y[1]) / 2;
  const windowH = WINDOW.y[1] - WINDOW.y[0];
  const outlets = useMemo(() => WALL_PORTS.map((id) => ({ id, pos: getExternalPortWorldPosition(id), isNetwork: EXTERNAL_PORTS[id].portType === 'RJ45' })), []);

  return (
    <group>
      {/* Chão fora do quarto (a sala não flutua) e piso do quarto */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, centerZ]}>
        <planeGeometry args={[14, 14]} />
        <meshStandardMaterial color="#070b14" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, centerZ]} receiveShadow>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        <meshStandardMaterial color={p.floor} roughness={p.floorRoughness} metalness={0.05} />
      </mesh>

      {/* Parede do fundo e rodapé */}
      <mesh position={[0, ROOM_HEIGHT / 2, ROOM_MIN_Z - T / 2]} receiveShadow>
        <boxGeometry args={[ROOM_SIZE, ROOM_HEIGHT, T]} />
        <meshStandardMaterial color={p.wall} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.05, ROOM_MIN_Z + 0.01]}>
        <boxGeometry args={[ROOM_SIZE, 0.1, 0.02]} />
        <meshStandardMaterial color={p.baseboard} roughness={0.6} />
      </mesh>

      {/* Parede esquerda recortada: janela e porta */}
      <LeftWallPiece z0={ROOM_MIN_Z} z1={w0} y0={0} y1={ROOM_HEIGHT} color={p.wallLeft} />
      <LeftWallPiece z0={w0} z1={w1} y0={0} y1={WINDOW.y[0]} color={p.wallLeft} />
      <LeftWallPiece z0={w0} z1={w1} y0={WINDOW.y[1]} y1={ROOM_HEIGHT} color={p.wallLeft} />
      <LeftWallPiece z0={w1} z1={d0} y0={0} y1={ROOM_HEIGHT} color={p.wallLeft} />
      <LeftWallPiece z0={d0} z1={d1} y0={DOOR.y[1]} y1={ROOM_HEIGHT} color={p.wallLeft} />
      <LeftWallPiece z0={d1} z1={ROOM_MAX_Z} y0={0} y1={ROOM_HEIGHT} color={p.wallLeft} />
      <mesh position={[ROOM_MIN_X + 0.01, 0.05, centerZ]}>
        <boxGeometry args={[0.02, 0.1, ROOM_SIZE]} />
        <meshStandardMaterial color={p.baseboard} roughness={0.6} />
      </mesh>

      {/* Janela: vidro com o céu do tema e caixilho */}
      <mesh position={[ROOM_MIN_X - T, windowMidY, (w0 + w1) / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[w1 - w0, windowH]} />
        <meshStandardMaterial color={p.sky} emissive={p.sky} emissiveIntensity={0.6} roughness={0.2} />
      </mesh>
      {[WINDOW.y[0], WINDOW.y[1], windowMidY].map((y) => (
        <mesh key={y} position={[ROOM_MIN_X + 0.01, y, (w0 + w1) / 2]}>
          <boxGeometry args={[0.05, 0.05, w1 - w0 + 0.05]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
      ))}
      {[w0, w1, (w0 + w1) / 2].map((z) => (
        <mesh key={z} position={[ROOM_MIN_X + 0.01, windowMidY, z]}>
          <boxGeometry args={[0.05, windowH, 0.05]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.5} />
        </mesh>
      ))}

      {/* Porta fechada com maçaneta */}
      <mesh position={[ROOM_MIN_X - 0.005, DOOR.y[1] / 2, (d0 + d1) / 2]}>
        <boxGeometry args={[0.04, DOOR.y[1], d1 - d0]} />
        <meshStandardMaterial color={theme === 'ROOM_OFFICE' ? '#f5f0e6' : '#7c5a3a'} roughness={0.7} />
      </mesh>
      <mesh position={[ROOM_MIN_X + 0.04, 1.0, d1 - 0.1]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* Tomadas e ponto de rede: as mesmas portas WALL_* do motor de cabeamento externo */}
      {outlets.map(({ id, pos: [x, y, z], isNetwork }) => (
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
      ))}

      {/* Luz de destaque do tema, no canto do fundo */}
      <pointLight position={[ROOM_MIN_X + 0.4, 2.2, ROOM_MIN_Z + 0.4]} color={p.accentLight} intensity={p.accentIntensity} distance={4.5} />
      <pointLight position={[ROOM_MAX_X - 0.4, 2.3, centerZ]} color="#ffffff" intensity={0.5} distance={4} />
    </group>
  );
};

export default RoomShell;
