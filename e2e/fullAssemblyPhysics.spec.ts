import { test, expect, Page } from '@playwright/test';
import { benchBoardBox, benchPartPlacements, PASTE_LAYER } from '../src/engine/benchGeometry';
import { Aabb, overlapRatio } from '../src/engine/geometry3d';
import { derivePhase } from '../src/engine/phases';
import type { AssemblyState, MotherboardComponent } from '../src/engine/types';
import type { PostResult } from '../src/engine/compatibility';

/**
 * Montagem completa de um PC SOMENTE pela interface (inventário lateral, pinos da bancada 3D,
 * bandeja de cabos, minigame do painel frontal e botões da bancada), com erros físicos de
 * propósito no caminho, e verificação da física de encaixe na cena 3D renderizada:
 * as caixas reais medidas pelo three.js precisam bater com o motor (benchGeometry).
 */

interface Build {
  title: string;
  motherboard: string;
  /** Placa com espelho I/O integrado dispensa o espelho avulso */
  integratedIo: boolean;
  cpu: string;
  /** CPU de outro soquete (erro físico de propósito) */
  wrongCpu: string;
  paste: string;
  cooler: string;
  ram: string;
  /** Pente de outra geração (chanfro em outra posição) */
  wrongRam: string;
  storage: { name: string; kind: 'M2' | 'SATA' };
  case: string;
  psu: string;
  gpu: string;
}

const BUILDS: Build[] = [
  {
    title: 'AMD AM4 Micro-ATX, cooler a ar, DDR4 e SSD M.2',
    motherboard: 'ASUS TUF Gaming B550M-Plus Wi-Fi II',
    integratedIo: false,
    cpu: 'AMD Ryzen 5 5600',
    wrongCpu: 'Intel Core i5-13400F',
    paste: 'Arctic MX-4 Alta Condutividade Carbono (8.5 W/mK)',
    cooler: 'DeepCool AG400 120mm 4 Heatpipes',
    ram: 'Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz Dual',
    wrongRam: 'Kingston Fury Beast 16GB (2x8GB) DDR5 5200MHz Dual',
    storage: { name: 'SSD Kingston NV2 1TB M.2 NVMe PCIe 4.0', kind: 'M2' },
    case: 'Gabinete Corsair 4000D Airflow Mid-Tower Branco',
    psu: 'Fonte MSI MAG A650BN 650W 80 Plus Bronze',
    gpu: 'Gigabyte GeForce RTX 3060 Windforce OC 12GB GDDR6',
  },
  {
    title: 'Intel LGA1700 ATX, water cooler, DDR5 e SSD SATA',
    motherboard: 'ASUS ROG Maximus Z790 Hero ATX',
    integratedIo: true,
    cpu: 'Intel Core i5-13400F',
    wrongCpu: 'AMD Ryzen 5 5600',
    paste: 'Arctic MX-4 Alta Condutividade Carbono (8.5 W/mK)',
    cooler: 'Corsair iCUE H100i RGB Elite 240mm AIO',
    ram: 'Kingston Fury Beast 16GB (2x8GB) DDR5 5200MHz Dual',
    wrongRam: 'Kingston Fury Beast 16GB (2x8GB) DDR4 3200MHz Dual',
    storage: { name: 'SSD Crucial BX500 1TB SATA 2.5"', kind: 'SATA' },
    case: 'Gabinete NZXT H6 Flow Dual Chamber Panorâmico',
    psu: 'Fonte Corsair RM750e 750W 80 Plus Gold Full Modular ATX 3.0',
    gpu: 'ASUS Dual GeForce RTX 4060 EVO OC 8GB',
  },
];

interface Snapshot {
  assembly: AssemblyState;
  mb: MotherboardComponent | null;
  penalties: number;
  alert: { type: string; title: string } | null;
  post: PostResult | null;
  cables: Record<string, string | null>;
  desk: Record<string, { itemId: string } | undefined>;
}

const snapshot = (page: Page): Promise<Snapshot> =>
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

const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Menu Lateral de Escolha de Componentes e Cabeamento' });

/** Pega a peça no inventário lateral ("Usar") */
async function takePart(page: Page, name: string) {
  await sidebar(page).getByRole('button', { name: /^Peças/ }).click();
  await sidebar(page).getByRole('textbox', { name: 'Buscar componente' }).fill(name);
  const use = sidebar(page).getByRole('button', { name: `Usar: ${name}`, exact: true });
  if (await use.isVisible()) await use.click();
  await expect(sidebar(page).getByRole('button', { name: `Em mãos: ${name}`, exact: true })).toBeVisible();
}

/**
 * Aciona um pino da bancada 3D como um aluno de teclado: foca o pino, espera o tooltip mostrar
 * a ação esperada (o conteúdo do Html do drei é atualizado um quadro depois da store) e a ativa.
 */
async function pressPin(page: Page, label: string, action: string) {
  const pin = page.getByRole('button', { name: label, exact: true });
  await expect(pin).toBeAttached({ timeout: 15000 });
  await pin.focus();
  const button = page.getByRole('group', { name: `Ações: ${label}` }).getByRole('button', { name: action });
  await expect(button).toBeVisible();
  // Sem Esc depois: ele também fecharia um modal aberto pela ação (ex.: painel frontal)
  await button.press('Enter');
}

const CONNECT = 'Conectar Cabo Aqui';

/** Pega o cabo na bandeja e o leva até o conector (pino 3D) */
async function plugCable(page: Page, cableName: string, pinLabel: string) {
  await sidebar(page).getByRole('button', { name: /^Cabos/ }).click();
  await sidebar(page).getByRole('button', { name: new RegExp(`^${cableName.replace(/[()]/g, '\\$&')},`) }).click();
  await pressPin(page, pinLabel, CONNECT);
}

/**
 * O motor recusa a ação e avisa. Peça errada (soquete, geração de RAM) penaliza; pular um
 * pré-requisito (cooler sem pasta) só bloqueia, sem penalidade — regra pedagógica da store.
 */
const deskPanel = (page: Page) => page.getByRole('complementary', { name: 'Inventário da mesa' });

/** Tenta levar o PC incompleto para a mesa: recusado, com o passo que falta na mensagem; volta à bancada */
async function expectDeskRefusesPc(page: Page, missingStep: string) {
  await page.getByRole('button', { name: 'Mesa 3D', exact: true }).click();
  const desk = deskPanel(page);
  await desk.getByRole('button', { name: 'Pegar Mesa Gamer Fibra de Carbono 140cm para posicionar' }).click();
  await desk.getByRole('button', { name: 'Encaixar em: Mesa de Trabalho' }).click();
  await desk.getByRole('button', { name: 'Pegar Seu PC (montado na bancada) para posicionar' }).click();
  await desk.getByRole('button', { name: 'Encaixar em: Gabinete do PC (Torre)' }).click();
  const s = await snapshot(page);
  expect(s.desk.PC_TOWER).toBeUndefined();
  expect(s.alert?.title).toBe('Pré-requisito Pendente');
  expect((s.alert as { message?: string } | null)?.message).toContain(`Falta: ${missingStep}`);
  await page.getByRole('button', { name: 'Bancada', exact: true }).click();
  await expect(page.locator('button[title*="Modo 3D da Bancada"]')).toBeVisible();
}

async function expectRejected(page: Page, before: Snapshot, penalized: boolean, check: (s: Snapshot) => void) {
  const after = await snapshot(page);
  check(after);
  expect(after.alert?.type, 'alerta de erro exibido').toBe('error');
  expect(after.penalties, penalized ? 'peça errada conta como penalidade' : 'pré-requisito só bloqueia').toBe(before.penalties + (penalized ? 1 : 0));
}

const EPS = 0.03; // unidades da bancada (≈ 1 mm real)
const size = (b: Aabb, k: number) => b.max[k] - b.min[k];

test.describe('Montagem completa pela interface com física de encaixe verificada na cena 3D', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForFunction(() => typeof (window as unknown as { useAssemblyStore?: unknown }).useAssemblyStore !== 'undefined', {
      timeout: 15000,
    });
    await page.evaluate(() => (window as unknown as { useAssemblyStore: { getState: () => { resetAssembly: () => void } } }).useAssemblyStore.getState().resetAssembly());
    await page.locator('button[title*="Modo 3D da Bancada"]').click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
  });

  for (const BUILD of BUILDS) test(`${BUILD.title}: monta tudo, recusa encaixes impossíveis, cada peça assenta no lugar e o POST passa`, async ({ page }) => {
    test.setTimeout(300_000);

    // ---------- Fase 1: bancada e ESD ----------
    await page.getByRole('button', { name: /Toque para Descarregar Estática/ }).click();
    await takePart(page, BUILD.motherboard);
    await page.getByRole('button', { name: /CLIQUE PARA ASSENTAR NA BANCADA/ }).click();
    await expect.poll(async () => (await snapshot(page)).mb?.name).toBe(BUILD.motherboard);

    // ---------- Fase 2: CPU, pasta, cooler, RAM e M.2 ----------
    // Erro físico 1: CPU de outro soquete
    let before = await snapshot(page);
    await takePart(page, BUILD.wrongCpu);
    await pressPin(page, 'Soquete CPU', 'Encaixar CPU');
    await expectRejected(page, before, true, (s) => expect(s.assembly.cpuInstalled).toBeNull());

    await takePart(page, BUILD.cpu);
    await pressPin(page, 'Soquete CPU', 'Encaixar CPU');
    await expect.poll(async () => (await snapshot(page)).assembly.cpuInstalled?.name).toBe(BUILD.cpu);
    await pressPin(page, 'Alavanca do Soquete', 'Abaixar e Travar Alavanca');
    await expect.poll(async () => (await snapshot(page)).assembly.socketLeverLocked).toBe(true);

    // Erro físico 2: cooler direto sobre a CPU, sem pasta térmica
    before = await snapshot(page);
    await takePart(page, BUILD.cooler);
    await pressPin(page, 'Soquete CPU', 'Pasta Térmica Obrigatória');
    await expectRejected(page, before, false, (s) => expect(s.assembly.coolerInstalled).toBeNull());

    await takePart(page, BUILD.paste);
    await pressPin(page, 'Soquete CPU', 'Aplicar Pasta Térmica');
    await expect.poll(async () => (await snapshot(page)).assembly.thermalPasteApplied).toBe(true);
    await takePart(page, BUILD.cooler);
    await pressPin(page, 'Soquete CPU', 'Instalar Cooler sobre a CPU');
    await expect.poll(async () => (await snapshot(page)).assembly.coolerInstalled?.name).toBe(BUILD.cooler);
    await plugCable(page, 'Ventoinha do cooler', 'CPU_FAN');
    await expect.poll(async () => (await snapshot(page)).assembly.coolerFanConnected).toBe(true);

    // Erro físico 3: pente de outra geração de DDR (o chanfro não encaixa)
    before = await snapshot(page);
    await takePart(page, BUILD.wrongRam);
    await pressPin(page, 'DIMM A2 (Slot 2)', 'Encaixar no Slot 2');
    await expectRejected(page, before, true, (s) => expect(s.assembly.ramInstalledSlot2).toBeNull());

    await takePart(page, BUILD.ram);
    await pressPin(page, 'DIMM A2 (Slot 2)', 'Encaixar no Slot 2');
    await expect.poll(async () => (await snapshot(page)).assembly.ramInstalledSlot2?.name).toBe(BUILD.ram);
    await takePart(page, BUILD.ram);
    await pressPin(page, 'DIMM B2 (Slot 4)', 'Encaixar no Slot 4');
    await expect.poll(async () => (await snapshot(page)).assembly.ramInstalledSlot4?.name).toBe(BUILD.ram);

    if (BUILD.storage.kind === 'M2') {
      await takePart(page, BUILD.storage.name);
      await pressPin(page, 'Slot M.2 NVMe', 'Fixar SSD M.2');
      await expect.poll(async () => (await snapshot(page)).assembly.storageInstalled?.name).toBe(BUILD.storage.name);
    }

    // ---------- Fases 3 e 4: gabinete, fonte e placa parafusada ----------
    await takePart(page, BUILD.case);
    await page.getByRole('button', { name: `Gabinete: preparar ${BUILD.case}` }).click();
    await page.getByRole('button', { name: 'Fixar Espaçadores de Latão' }).click();
    if (!BUILD.integratedIo) await page.getByRole('button', { name: 'Instalar Espelho Traseiro' }).click();
    await takePart(page, BUILD.psu);
    await page.getByRole('button', { name: `Compartimento da fonte: encaixar ${BUILD.psu}` }).click();
    await page.getByRole('button', { name: 'Apertar Parafusos M3' }).click();
    await expect.poll(async () => {
      const s = await snapshot(page);
      return derivePhase(s.assembly, s.mb);
    }).toBe('PHASE_5_GPU_EXPANSION');

    if (BUILD.storage.kind === 'SATA') {
      // Disco SATA vai na baia do gabinete e recebe dois cabos: energia da fonte e dados na placa
      await takePart(page, BUILD.storage.name);
      await page.getByRole('button', { name: `Baia SATA: fixar ${BUILD.storage.name}` }).click();
      await expect.poll(async () => (await snapshot(page)).assembly.storageInstalled?.name).toBe(BUILD.storage.name);
      // Os dois cabos SATA têm conector na bancada 3D: energia de 15 pinos no disco e dados na placa
      await plugCable(page, 'Energia SATA', 'Energia SATA do disco (15 pinos)');
      await plugCable(page, 'Dados SATA', 'SATA6G');
      await expect.poll(async () => (await snapshot(page)).assembly.cableSataConnected).toBe(true);
    }

    // ---------- Fase 5: placa de vídeo encaixada e parafusada ----------
    await takePart(page, BUILD.gpu);
    await pressPin(page, 'PCIe 4.0 x16', 'Encaixar GPU no Slot');
    await expect.poll(async () => (await snapshot(page)).assembly.gpuInstalled?.name).toBe(BUILD.gpu);
    if (BUILD === BUILDS[0]) await expectDeskRefusesPc(page, 'Encaixar e Parafusar a Placa de Vídeo');
    await pressPin(page, 'PCIe 4.0 x16', 'Parafusar Suporte da GPU'); // parafusa o suporte traseiro
    await expect.poll(async () => (await snapshot(page)).assembly.gpuScrewed).toBe(true);

    // ---------- Fase 6: cabeamento ----------
    await plugCable(page, 'ATX 24 pinos', 'ATX 24P');
    await plugCable(page, 'EPS 8 pinos (CPU)', 'CPU 8P');
    await plugCable(page, 'PCIe 8 pinos (GPU)', 'PCIe 8P (GPU)');
    await plugCable(page, 'Ventoinhas do gabinete', 'SYS_FAN1');

    // Erro físico 4: USB 3.0 frontal (19 pinos) no cabeçalho USB 2.0 (9 pinos) não encaixa
    await plugCable(page, 'USB 3.0 frontal', 'USB2 (9 pinos)');
    expect((await snapshot(page)).cables.FRONT_USB3 ?? null).toBeNull();
    await pressPin(page, 'USB3 (19 pinos)', CONNECT); // o cabo continua na mão: leva ao cabeçalho certo
    await plugCable(page, 'HD Audio frontal', 'HD_AUDIO');

    await pressPin(page, 'Painel Frontal', 'Ligar Painel Frontal (F_PANEL)');
    const fpanel = page.getByRole('dialog');
    await fpanel.getByRole('button', { name: /^POWER SW: pegar conector/ }).click();
    await fpanel.getByRole('button', { name: /^Pino 6:/ }).click();
    await fpanel.getByRole('button', { name: 'Fechar o minigame do painel frontal' }).click();

    const ready = await snapshot(page);
    expect(ready.assembly.frontUsbConnected && ready.assembly.frontAudioConnected && ready.assembly.caseFansConnected).toBe(true);
    expect(derivePhase(ready.assembly, ready.mb)).toBe('PHASE_7_BOOT_POST');
    expect(ready.penalties, 'penalidades: CPU de outro soquete e pente de outra geração').toBe(2);

    // ---------- Física de encaixe na cena 3D renderizada ----------
    const expected = benchPartPlacements(ready.assembly, ready.mb);
    const partIds = ['BOARD', ...expected.parts.map((p) => p.part)];
    await expect
      .poll(async () => Object.keys(await page.evaluate(() => (window as unknown as { __pcbaBenchBoxes: () => object }).__pcbaBenchBoxes())).sort(), {
        timeout: 20000,
      })
      .toEqual([...partIds].sort());
    const rendered: Record<string, Aabb> = await page.evaluate(() => (window as unknown as { __pcbaBenchBoxes: () => Record<string, Aabb> }).__pcbaBenchBoxes());

    // Placa: 7,2 de largura, centrada na origem e apoiada no tapete
    const board = rendered.BOARD;
    const boardBox = benchBoardBox(expected.board);
    [0, 1, 2].forEach((k) => {
      expect(Math.abs(board.min[k] - boardBox.min[k]), `placa min[${k}]`).toBeLessThan(EPS);
      expect(Math.abs(board.max[k] - boardBox.max[k]), `placa max[${k}]`).toBeLessThan(EPS);
    });

    // Cada peça desenhada exatamente onde o motor calculou (posição e tamanho real)
    expected.parts.forEach((p) => {
      const r = rendered[p.part];
      [0, 1, 2].forEach((k) => {
        expect(Math.abs(r.min[k] - p.box.min[k]), `${p.part} min[${k}]`).toBeLessThan(EPS);
        expect(Math.abs(r.max[k] - p.box.max[k]), `${p.part} max[${k}]`).toBeLessThan(EPS);
      });
    });

    // Leis físicas medidas na própria cena
    const { layout, mmPerUnit } = expected.board;
    expect(Math.abs(rendered.CPU.min[1] - layout.CPU_SOCKET[1]), 'CPU assentada no soquete').toBeLessThan(EPS);
    expect(Math.abs(rendered.COOLER.min[1] - (rendered.CPU.max[1] + PASTE_LAYER)), 'cooler sobre o IHS + pasta').toBeLessThan(EPS);
    (['RAM_2', 'RAM_4'] as const).forEach((id) => {
      const stick = rendered[id];
      expect(size(stick, 1), `${id} em pé`).toBeGreaterThan(size(stick, 0));
      expect(Math.abs(size(stick, 2) * mmPerUnit - 133), `${id} com 133 mm`).toBeLessThan(2);
      expect(Math.abs(stick.min[1] - layout.RAM_SLOT_2[1]), `${id} assentado no slot`).toBeLessThan(EPS);
    });
    expect(Math.abs(size(rendered.GPU, 0) * mmPerUnit - ready.assembly.gpuInstalled!.lengthMm), 'GPU no comprimento real').toBeLessThan(2);
    expect(Math.abs(rendered.GPU.min[1] - layout.PCIE_SLOT[1]), 'GPU assentada no PCIe').toBeLessThan(EPS);
    if (rendered.M2_SSD) expect(Math.abs(rendered.M2_SSD.min[1] - layout.M2_SLOT[1]), 'SSD deitado no slot M.2').toBeLessThan(EPS);
    ['CPU', 'COOLER', 'RAM_2', 'RAM_4', 'M2_SSD'].filter((id) => rendered[id]).forEach((id) => {
      const b = rendered[id];
      const inside = b.min[0] >= board.min[0] - EPS && b.max[0] <= board.max[0] + EPS && b.min[2] >= board.min[2] - EPS && b.max[2] <= board.max[2] + EPS;
      expect(inside, `${id} dentro da placa`).toBe(true);
    });
    const ids = expected.parts.map((p) => p.part);
    ids.forEach((a, i) =>
      ids.slice(i + 1).forEach((b) => {
        expect(overlapRatio(rendered[a], rendered[b]), `${a} × ${b} sem sobreposição`).toBeLessThanOrEqual(0.02);
      })
    );

    // ---------- Fase 7: energia e POST ----------
    await page.getByRole('button', { name: /Chave Fonte/ }).click();
    await page.getByRole('button', { name: 'LIGAR O PC (TESTE DE BOOT)' }).click();
    await expect.poll(async () => (await snapshot(page)).post?.bootSuccess, { timeout: 10000 }).toBe(true);
    const booted = await snapshot(page);
    expect(booted.post?.debugLed).toEqual({ cpu: 'GREEN', dram: 'GREEN', vga: 'GREEN', boot: 'GREEN' });
    expect(booted.post?.issues.filter((i) => i.type === 'ERROR')).toEqual([]);

    // ---------- O PC montado vai para a mesa ----------
    await expect(page.getByRole('dialog', { name: /POWER-ON SELF-TEST/ })).toBeVisible();
    await page.keyboard.press('Escape'); // fecha a BIOS aberta pelo POST
    await expect(page.getByRole('dialog', { name: /POWER-ON SELF-TEST/ })).toBeHidden();
    await page.getByRole('button', { name: 'Mesa 3D', exact: true }).click();
    const desk = deskPanel(page);
    if (!(await snapshot(page).then((s) => s.desk.DESK_BASE))) {
      await desk.getByRole('button', { name: 'Pegar Mesa Gamer Fibra de Carbono 140cm para posicionar' }).click();
      await desk.getByRole('button', { name: 'Encaixar em: Mesa de Trabalho' }).click();
    }
    // Depois de uma recusa o PC continua na mão do aluno, pronto para nova tentativa
    const pickPc = desk.getByRole('button', { name: 'Pegar Seu PC (montado na bancada) para posicionar' });
    if (await pickPc.isVisible()) await pickPc.click();
    await desk.getByRole('button', { name: 'Encaixar em: Gabinete do PC (Torre)' }).click();
    await expect.poll(async () => (await snapshot(page)).desk.PC_TOWER?.itemId).toBe('student-pc');
  });
});
