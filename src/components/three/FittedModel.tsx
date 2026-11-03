'use client';

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type FitAxis = 'x' | 'y' | 'z' | 'max';

/** Malha da tela do monitor que recebe a textura viva (Issue 05) */
export interface ScreenSurface {
  /** Nome do material da tela no GLB */
  materialName: string;
  /** Eixo local da malha que corresponde à largura da tela (da esquerda para a direita do aluno) */
  uAxis: 'x' | 'z';
  texture: THREE.Texture | null;
}

/**
 * UVs planares geradas a partir da própria geometria: a largura (uAxis) vira U e a altura (Y)
 * vira V. Funciona em telas planas e curvas e não depende das UVs originais do modelo.
 */
function withPlanarScreenUvs(geometry: THREE.BufferGeometry, uAxis: 'x' | 'z'): THREE.BufferGeometry {
  const g = geometry.clone();
  const pos = g.getAttribute('position');
  const readU = (i: number) => (uAxis === 'x' ? pos.getX(i) : pos.getZ(i));
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    uMin = Math.min(uMin, readU(i));
    uMax = Math.max(uMax, readU(i));
    vMin = Math.min(vMin, pos.getY(i));
    vMax = Math.max(vMax, pos.getY(i));
  }
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (readU(i) - uMin) / Math.max(1e-9, uMax - uMin);
    uv[i * 2 + 1] = (pos.getY(i) - vMin) / Math.max(1e-9, vMax - vMin);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

interface FittedModelProps {
  url: string;
  /** Eixo (após a rotação) que deve medir exatamente `size` metros */
  fitAxis: FitAxis;
  size: number;
  /** Rotação aplicada ANTES de medir, para alinhar o GLB à convenção da mesa (frente em +Z) */
  rotation?: [number, number, number];
  castShadow?: boolean;
  opacity?: number;
  screen?: ScreenSurface;
}

const NO_ROTATION: [number, number, number] = [0, 0, 0];

/**
 * Encaixa um GLB de escala/eixos arbitrários numa dimensão real (metros):
 * aplica a rotação, mede, centraliza em X/Z, assenta a base em Y=0 e escala pelo eixo pedido.
 * Com `opacity` < 1 gera uma cópia translúcida (fantasma do item sendo arrastado).
 */
export const FittedModel: React.FC<FittedModelProps> = ({
  url,
  fitAxis,
  size,
  rotation = NO_ROTATION,
  castShadow = true,
  opacity = 1,
  screen,
}) => {
  const { scene } = useGLTF(url);
  const [rx, ry, rz] = rotation;
  const screenMaterialName = screen?.materialName;
  const screenUAxis = screen?.uAxis;
  const screenTexture = screen?.texture ?? null;

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    const rotated = new THREE.Group();
    rotated.rotation.set(rx, ry, rz);
    rotated.add(clone);
    rotated.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(rotated);
    const dims = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    rotated.position.set(-center.x, -box.min.y, -center.z);

    const measured = fitAxis === 'max' ? Math.max(dims.x, dims.y, dims.z) : dims[fitAxis];
    const wrapper = new THREE.Group();
    wrapper.add(rotated);
    wrapper.scale.setScalar(size / Math.max(1e-6, measured));

    wrapper.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = castShadow;
      child.receiveShadow = true;
      if (
        screenMaterialName &&
        screenUAxis &&
        !Array.isArray(child.material) &&
        child.material.name === screenMaterialName
      ) {
        child.geometry = withPlanarScreenUvs(child.geometry, screenUAxis);
        // Tela emissiva: sem iluminação nem tone mapping, como um painel real
        child.material = new THREE.MeshBasicMaterial({ map: screenTexture, color: screenTexture ? '#ffffff' : '#020305', toneMapped: false });
        child.castShadow = false;
        return;
      }
      if (opacity < 1) {
        // Materiais clonados: o fantasma não pode alterar o material compartilhado do cache do GLTF
        const toGhost = (m: THREE.Material) => {
          const ghost = m.clone();
          ghost.transparent = true;
          ghost.opacity = opacity;
          ghost.depthWrite = false;
          return ghost;
        };
        child.material = Array.isArray(child.material) ? child.material.map(toGhost) : toGhost(child.material);
      }
    });
    return wrapper;
  }, [scene, fitAxis, size, rx, ry, rz, castShadow, opacity, screenMaterialName, screenUAxis, screenTexture]);

  return <primitive object={prepared} />;
};
