import { expect, Page } from '@playwright/test';
import type { AssemblyState, MotherboardComponent } from '../../src/engine/types';
import type { PostResult } from '../../src/engine/compatibility';

/**
 * Passos de interface reaproveitados pelos testes de fluxo completo: o aluno só usa o inventário
 * lateral, os pinos da bancada 3D, a bandeja de cabos, o minigame do painel frontal e os botões.
 */
export interface Snapshot {
  assembly: AssemblyState;
  mb: MotherboardComponent | null;
  penalties: number;
  alert: { type: string; title: string; message?: string } | null;
  post: PostResult | null;
  cables: Record<string, string | null>;
  desk: Record<string, { itemId: string } | undefined>;
}

export const snapshot = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => {
    const s = (window as unknown as { useAssemblyStore: { getState: () => Record<string, unknown> } }).useAssemblyStore.getState();
    return JSON.parse(
      JSON.stringify({
        assembly: s.assembly,
        mb: s.selectedMotherboard,
        penalties: s.penaltiesCount,
        alert: s.activeAlert,
        post: s.postResult,
        cables: s.cableConnections,
        desk: (s.deskSetup as { placedDeskItems: object }).placedDeskItems,
      })
    );
  });

export const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Menu Lateral de Escolha de Componentes e Cabeamento' });

export async function takePart(page: Page, name: string) {
  await sidebar(page).getByRole('button', { name: /^Peças/ }).click();
  await sidebar(page).getByRole('textbox', { name: 'Buscar componente' }).fill(name);
  const use = sidebar(page).getByRole('button', { name: `Usar: ${name}`, exact: true });
  if (await use.isVisible()) await use.click();
  await expect(sidebar(page).getByRole('button', { name: `Em mãos: ${name}`, exact: true })).toBeVisible();
}

/** Pino da bancada 3D pelo teclado: foca, espera a ação do tooltip e a ativa */
export async function pressPin(page: Page, label: string, action: string) {
  const pin = page.getByRole('button', { name: label, exact: true });
  await expect(pin).toBeAttached({ timeout: 15000 });
  await pin.focus();
  const button = page.getByRole('group', { name: `Ações: ${label}` }).getByRole('button', { name: action });
  await expect(button).toBeVisible();
  await button.press('Enter');
}

export const CONNECT = 'Conectar Cabo Aqui';

export async function plugCable(page: Page, cableName: string, pinLabel: string) {
  await sidebar(page).getByRole('button', { name: /^Cabos/ }).click();
  await sidebar(page).getByRole('button', { name: new RegExp(`^${cableName.replace(/[()]/g, '\\$&')},`) }).click();
  await pressPin(page, pinLabel, CONNECT);
}

export interface UiBuild {
  motherboard: string;
  integratedIo: boolean;
  cpu: string;
  paste: string;
  cooler: string;
  /** Kit dual (um "Usar" por slot) ou pentes avulsos */
  ram: { name: string; slots: (2 | 4)[] };
  storage: { name: string; kind: 'M2' | 'SATA' };
  case: { name: string; hasFans: boolean };
  psu: string;
  gpu: { name: string; needsPower: boolean } | null;
}

/** Montagem completa pela interface, na ordem física, até o PC pronto para o POST */
export async function assembleViaUi(page: Page, b: UiBuild) {
  const poll = (fn: (s: Snapshot) => unknown) => expect.poll(async () => fn(await snapshot(page)), { timeout: 15000 });

  await page.getByRole('button', { name: /Toque para Descarregar Estática/ }).click();
  await takePart(page, b.motherboard);
  await page.getByRole('button', { name: /CLIQUE PARA ASSENTAR NA BANCADA/ }).click();
  await poll((s) => s.mb?.name).toBe(b.motherboard);

  await takePart(page, b.cpu);
  await pressPin(page, 'Soquete CPU', 'Encaixar CPU');
  await poll((s) => s.assembly.cpuInstalled?.name).toBe(b.cpu);
  await pressPin(page, 'Alavanca do Soquete', 'Abaixar e Travar Alavanca');
  await poll((s) => s.assembly.socketLeverLocked).toBe(true);
  await takePart(page, b.paste);
  await pressPin(page, 'Soquete CPU', 'Aplicar Pasta Térmica');
  await poll((s) => s.assembly.thermalPasteApplied).toBe(true);
  await takePart(page, b.cooler);
  await pressPin(page, 'Soquete CPU', 'Instalar Cooler sobre a CPU');
  await poll((s) => s.assembly.coolerInstalled?.name).toBe(b.cooler);
  await plugCable(page, 'Ventoinha do cooler', 'CPU_FAN');

  for (const slot of b.ram.slots) {
    await takePart(page, b.ram.name);
    const label = slot === 2 ? 'DIMM A2 (Slot 2)' : 'DIMM B2 (Slot 4)';
    await pressPin(page, label, `Encaixar no Slot ${slot}`);
    await poll((s) => (slot === 2 ? s.assembly.ramInstalledSlot2 : s.assembly.ramInstalledSlot4)?.name).toBe(b.ram.name);
  }

  if (b.storage.kind === 'M2') {
    await takePart(page, b.storage.name);
    await pressPin(page, 'Slot M.2 NVMe', 'Fixar SSD M.2');
    await poll((s) => s.assembly.storageInstalled?.name).toBe(b.storage.name);
  }

  await takePart(page, b.case.name);
  await page.getByRole('button', { name: `Gabinete: preparar ${b.case.name}` }).click();
  await page.getByRole('button', { name: 'Fixar Espaçadores de Latão' }).click();
  if (!b.integratedIo) await page.getByRole('button', { name: 'Instalar Espelho Traseiro' }).click();
  await takePart(page, b.psu);
  await page.getByRole('button', { name: `Compartimento da fonte: encaixar ${b.psu}` }).click();
  await page.getByRole('button', { name: 'Apertar Parafusos M3' }).click();
  await poll((s) => s.assembly.motherboardScrewed).toBe(true);

  if (b.storage.kind === 'SATA') {
    await takePart(page, b.storage.name);
    await page.getByRole('button', { name: `Baia SATA: fixar ${b.storage.name}` }).click();
    await plugCable(page, 'Energia SATA', 'Energia SATA do disco (15 pinos)');
    await plugCable(page, 'Dados SATA', 'SATA6G');
  }

  if (b.gpu) {
    await takePart(page, b.gpu.name);
    await pressPin(page, 'PCIe 4.0 x16', 'Encaixar GPU no Slot');
    await poll((s) => s.assembly.gpuInstalled?.name).toBe(b.gpu.name);
    await pressPin(page, 'PCIe 4.0 x16', 'Parafusar Suporte da GPU');
    await poll((s) => s.assembly.gpuScrewed).toBe(true);
  }

  await plugCable(page, 'ATX 24 pinos', 'ATX 24P');
  await plugCable(page, 'EPS 8 pinos (CPU)', 'CPU 8P');
  if (b.gpu?.needsPower) await plugCable(page, 'PCIe 8 pinos (GPU)', 'PCIe 8P (GPU)');
  if (b.case.hasFans) await plugCable(page, 'Ventoinhas do gabinete', 'SYS_FAN1');
  await plugCable(page, 'USB 3.0 frontal', 'USB3 (19 pinos)');
  await plugCable(page, 'HD Audio frontal', 'HD_AUDIO');

  await pressPin(page, 'Painel Frontal', 'Ligar Painel Frontal (F_PANEL)');
  const fpanel = page.getByRole('dialog', { name: /F_PANEL/ });
  await fpanel.getByRole('button', { name: /^POWER SW: pegar conector/ }).click();
  await fpanel.getByRole('button', { name: /^Pino 6:/ }).click();
  await fpanel.getByRole('button', { name: 'Fechar o minigame do painel frontal' }).click();
}

/** Liga a fonte, roda o POST e fecha a BIOS */
export async function powerOn(page: Page) {
  await page.getByRole('button', { name: /Chave Fonte/ }).click();
  await page.getByRole('button', { name: 'LIGAR O PC (TESTE DE BOOT)' }).click();
  await expect(page.getByRole('dialog', { name: /POWER-ON SELF-TEST/ })).toBeVisible({ timeout: 15000 });
  await page.keyboard.press('Escape');
}
