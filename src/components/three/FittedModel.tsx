'use client';

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export type FitAxis = 'x' | 'y' | 'z' | 'max';

interface FittedModelProps {
  url: string;
  /** Eixo (após a rotação) que deve medir exatamente `size` metros */
  fitAxis: FitAxis;
  size: number;
  /** Rotação aplicada ANTES de medir, para alinhar o GLB à convenção da mesa (frente em +Z) */
  rotation?: [number, number, number];
  castShadow?: boolean;
  opacity?: number;
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
}) => {
  const { scene } = useGLTF(url);
  const [rx, ry, rz] = rotation;

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
  }, [scene, fitAxis, size, rx, ry, rz, castShadow, opacity]);

  return <primitive object={prepared} />;
};
