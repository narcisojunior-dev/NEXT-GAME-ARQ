import { test, expect, Page } from '@playwright/test';
import { READY_MB, buildReadyAssembly } from '../src/engine/__tests__/fixtures/readyPc';
import { cableConnectionsFromAssembly } from '../src/engine/cabling';
import { calculateBenchmark } from '../src/engine/benchmark';

/** Modo "Abrir o PC" (#61), tour (#62), vista explodida e LEDs/ventoinhas no POST (#38) */
type Box = { min: number[]; max: number[] };
const boxes = (page: Page): Promise<Record<string, Box>> =>
  page.evaluate(() => (window as unknown as { __pcbaBenchBoxes: () => Record<string, Box> }).__pcbaBenchBoxes());

async function readyAndBoot(page: Page, mode: '3D' | '2D') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as any).useAssemblyStore !== 'undefined');
  await page.evaluate(
    ({ a, mb, cables }) =>
      (window as any).useAssemblyStore.setState({ assembly: { ...a, psuSwitchOn: false }, selectedMotherboard: mb, cableConnections: cables }),
    { a: buildReadyAssembly(), mb: READY_MB, cables: cableConnectionsFromAssembly(buildReadyAssembly()) }
  );
  await page.locator(`button[title*="Modo ${mode === '3D' ? '3D da Bancada' : '2D Leve da Bancada'}"]`).click();
  // Antes do POST o botão explica o que falta
  await page.getByRole('button', { name: 'Abrir o PC' }).click({ noWaitAfter: true });
  await expect(page.getByText(/Disponível depois do POST/)).toBeVisible();
  await page.getByRole('button', { name: /Chave Fonte/ }).click();
  await page.getByRole('button', { name: 'LIGAR O PC (TESTE DE BOOT)' }).click();
  await expect(page.getByRole('dialog', { name: /POWER-ON SELF-TEST/ })).toBeVisible({ timeout: 10000 });
  await page.keyboard.press('Escape');
}

test('3D: abrir o PC, isolar a GPU ao centro com as leituras do benchmark, tour e saída intacta', async ({ page }) => {
  test.setTimeout(120_000);
  await readyAndBoot(page, '3D');
  await expect.poll(async () => Object.keys(await boxes(page)).length, { timeout: 20000 }).toBeGreaterThan(5);
  const before = await boxes(page);

  await page.getByRole('button', { name: 'Abrir o PC' }).click({ noWaitAfter: true });
  const panel = page.getByRole('region', { name: 'Abrir o PC' });
  await expect(panel).toBeVisible();
  // Um botão por subsistema presente
  for (const name of ['Processador e cooler', 'Fonte de alimentação', 'Memória RAM', 'Placa de vídeo', 'Armazenamento']) {
    await expect(panel.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await panel.getByRole('button', { name: 'Placa de vídeo', exact: true }).click({ noWaitAfter: true });
  await expect(panel.getByRole('button', { name: 'Placa de vídeo', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // A GPU vai ao centro da bancada (pose do motor; movimento reduzido = corte instantâneo)
  await expect
    .poll(async () => {
      const g = (await boxes(page)).GPU;
      return Math.abs((g.min[0] + g.max[0]) / 2) + Math.abs((g.min[2] + g.max[2]) / 2);
    }, { timeout: 30000 })
    .toBeLessThan(0.05);

  // Leituras = benchmark do motor
  const bench = calculateBenchmark(buildReadyAssembly(), READY_MB);
  await expect(panel).toContainText(`${bench.gpuTempC} °C`);
  await expect(panel).toContainText(`${bench.bottleneckPercent} %`);

  // Tour: "Ver de novo" começa pelo térmico, com legenda; uma tecla devolve o controle
  await panel.getByRole('button', { name: 'Ver de novo' }).click({ noWaitAfter: true });
  await expect(panel.getByRole('status').filter({ hasText: 'Sistema térmico' })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Processador e cooler', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Shift');
  await expect(panel.getByRole('status').filter({ hasText: 'Sistema térmico' })).toHaveCount(0);

  // Sair devolve as peças exatamente onde estavam
  await panel.getByRole('button', { name: 'Fechar o modo Abrir o PC' }).click({ noWaitAfter: true });
  await expect.poll(async () => JSON.stringify(await boxes(page)), { timeout: 30000 }).toBe(JSON.stringify(before));
});

test('2D leve: o mesmo modo vira vista esquemática sem WebGL', async ({ page }) => {
  await readyAndBoot(page, '2D');
  await page.getByRole('button', { name: 'Abrir o PC' }).click({ noWaitAfter: true });
  const panel = page.getByRole('region', { name: 'Abrir o PC' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Memória RAM', exact: true }).click({ noWaitAfter: true });
  await expect(panel).toContainText('Dual channel ativo');
  // Sem a bancada 3D (WebGL): só o painel esquemático e a placa 2D
  await expect(page.getByText('Bancada 3D Interativa')).toHaveCount(0);
  await expect(page.getByTestId('workbench-2d')).toBeVisible();
});

test('vista explodida e LEDs do POST na bancada 3D (#38)', async ({ page }) => {
  await readyAndBoot(page, '3D');
  await expect.poll(async () => Object.keys(await boxes(page)).length, { timeout: 20000 }).toBeGreaterThan(5);
  const assembled = await boxes(page);
  await page.getByRole('button', { name: 'Vista Explodida' }).click({ noWaitAfter: true });
  await expect.poll(async () => (await boxes(page)).COOLER.min[1], { timeout: 30000 }).toBeGreaterThan(assembled.COOLER.min[1] + 2);
  const exploded = await boxes(page);
  expect(exploded.COOLER.min[1]).toBeGreaterThan(exploded.CPU.max[1]);
  await page.getByRole('button', { name: 'Vista Explodida' }).click({ noWaitAfter: true });
  await expect.poll(async () => JSON.stringify(await boxes(page)), { timeout: 30000 }).toBe(JSON.stringify(assembled));
});
