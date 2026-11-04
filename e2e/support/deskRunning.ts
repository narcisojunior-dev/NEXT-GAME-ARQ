import { expect, Page } from '@playwright/test';
import { READY_MB, buildReadyAssembly } from '../../src/engine/__tests__/fixtures/readyPc';
import { DEFAULT_STUDENT_SETUP } from '../../src/engine/peripheralsCatalog';
import { buildDeskInventory, deriveDeskStage } from '../../src/engine/deskSetup';
import { ExternalCablingState, createInitialExternalCablesState, evaluateExternalCablesStatus } from '../../src/engine/externalCabling';
import { evaluatePostTest } from '../../src/engine/compatibility';
import './windowStores';

/**
 * Estação completa e ligada (AcademyOS em execução): PC montado com GPU, setup padrão na mesa e
 * todos os cabos externos certos. O próprio motor confere o estágio antes de aplicar na página.
 */
export function runningDeskState() {
  const assembly = buildReadyAssembly({ withGpu: true });
  const placedDeskItems = Object.fromEntries(buildDeskInventory(DEFAULT_STUDENT_SETUP).map((e) => [e.targetSnapPoint, e.item]));
  const externalCabling: ExternalCablingState = {
    connections: {
      ...createInitialExternalCablesState().connections,
      CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
      CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
      CABLE_DISPLAY: { sourcePort: 'GPU_HDMI_1', destPort: 'MONITOR_HDMI_IN' },
      CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' },
      CABLE_USB_MOUSE: { sourcePort: 'MOUSE_USB', destPort: 'PC_USB_2' },
      CABLE_AUDIO_JACK: { sourcePort: 'HEADSET_P2', destPort: 'PC_AUDIO_OUT' },
      CABLE_ETHERNET: { sourcePort: 'PC_ETHERNET_PORT', destPort: 'WALL_RJ45' },
    },
  };
  const deskSetup = { placedDeskItems, isDeskPoweredOn: true, deskCameraPreset: 'setup-wide' as const };
  const stage = deriveDeskStage({
    assembly,
    selectedMotherboard: READY_MB,
    deskSetup,
    isDeskPoweredOn: true,
    externalCablesStatus: evaluateExternalCablesStatus(externalCabling, assembly),
    postBootSuccess: evaluatePostTest({ ...assembly, psuSwitchOn: true }, READY_MB).bootSuccess,
  });
  return { assembly, mb: READY_MB, deskSetup, externalCabling, stage };
}

/** Abre a página com a estação ligada na Mesa 3D */
export async function openRunningDesk(page: Page) {
  const state = runningDeskState();
  expect(state.stage).toBe('RUNNING');
  await page.goto('/');
  await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
  await page.evaluate(
    (s) =>
      window.useAssemblyStore.setState({
        assembly: s.assembly,
        selectedMotherboard: s.mb,
        deskSetup: s.deskSetup,
        externalCabling: s.externalCabling,
        teamName: 'Equipe Alfa',
      }),
    state
  );
  await page.getByRole('button', { name: 'Mesa 3D' }).click();
  await expect(page.getByText('AcademyOS em Execução ✓')).toBeVisible({ timeout: 20000 });
}
