'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore, selectMonitorScreen } from '@/store/useAssemblyStore';
import { MonitorScreenInfo } from '@/engine/monitorScreen';
import { FittedModel } from './FittedModel';
import { DeskModelSpec } from './deskModels';
import { useMonitorTexture } from './monitorCanvas';

const LED_COLORS = { OFF: '#1e293b', AMBER: '#f59e0b', ON: '#38bdf8' } as const;

/**
 * Monitor com tela viva (Issue 05): a malha da tela recebe uma CanvasTexture com
 * SEM SINAL / POST / AcademyOS, e um LED na base indica apagado, espera (âmbar) ou ligado.
 */
export const MonitorView: React.FC<{ model: DeskModelSpec; poweredAt: number | null }> = ({ model, poweredAt }) => {
  // Só campos primitivos: o objeto derivado é novo a cada atualização do store (ex.: cronômetro)
  const flat = useAssemblyStore(
    useShallow((s) => {
      const i = selectMonitorScreen(s);
      return {
        state: i.state,
        led: i.led,
        reason: i.reason,
        input: i.input,
        title: i.title,
        message: i.message,
        keyboardDetected: i.keyboardDetected,
        mouseDetected: i.mouseDetected,
        postTitle: i.postFailure?.title,
        postMessage: i.postFailure?.message,
      };
    })
  );
  const info: MonitorScreenInfo = useMemo(() => {
    const { postTitle, postMessage, ...rest } = flat;
    return postTitle && postMessage ? { ...rest, postFailure: { title: postTitle, message: postMessage } } : rest;
  }, [flat]);
  const specs = useAssemblyStore(
    useShallow((s) => {
      const a = s.assembly;
      const ramModules = [a.ramInstalledSlot2, a.ramInstalledSlot4].filter((r) => r !== null);
      return {
        cpuName: a.cpuInstalled?.name ?? '—',
        gpuName: a.gpuInstalled?.name ?? null,
        // Kit dual channel (moduleCount 2) ocupa os slots 2 e 4 com a capacidade total do kit
        ramGb:
          ramModules[0] && ramModules[0].moduleCount >= 2
            ? ramModules[0].capacityGb
            : ramModules.reduce((t, r) => t + (r?.capacityGb ?? 0), 0),
        ramType: ramModules[0]?.ramType ?? '',
        storageName: a.storageInstalled?.name ?? null,
        motherboardName: s.selectedMotherboard?.name ?? '—',
      };
    })
  );

  const aspect = model.screen?.aspect ?? 16 / 9;
  const texture = useMonitorTexture({ info, poweredAt, ...specs }, aspect);
  const led = LED_COLORS[info.led];

  return (
    <group>
      <FittedModel
        url={model.url}
        fitAxis={model.fitAxis}
        size={model.size}
        rotation={model.rotation}
        screen={model.screen ? { materialName: model.screen.materialName, uAxis: model.screen.uAxis, texture } : undefined}
      />
      {/* LED de energia na frente da base */}
      <mesh position={[0.05, 0.012, 0.075]}>
        <sphereGeometry args={[0.004, 10, 10]} />
        <meshStandardMaterial color={led} emissive={led} emissiveIntensity={info.led === 'OFF' ? 0 : 2.2} />
      </mesh>
    </group>
  );
};

export default MonitorView;
