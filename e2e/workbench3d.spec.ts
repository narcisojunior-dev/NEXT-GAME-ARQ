import { test, expect } from '@playwright/test';

test.describe('Bancada 3D Interativa com Âncoras Projetadas (Fase 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('exibe o alternador 3D / 2D na bancada e permite trocar de modo', async ({ page }) => {
    const btn3D = page.locator('button[title*="Modo 3D da Bancada"]');
    const btn2D = page.locator('button[title*="Modo 2D Leve da Bancada"]');

    await expect(btn3D).toBeVisible();
    await expect(btn2D).toBeVisible();

    // Alterna para o modo 2D leve
    await btn2D.click();
    // No modo 2D deve renderizar o container 2D da bancada
    const heading2D = page.getByRole('heading', { name: 'Bancada Pronta: Escolha uma Placa-Mãe' });
    await expect(heading2D).toBeVisible();

    // Retorna para o modo 3D
    await btn3D.click();
    // No modo 3D deve carregar o Canvas WebGL
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test('renderiza as âncoras projetadas de cabos e componentes no modo 3D', async ({ page }) => {
    // Garante que o modo 3D está ativo
    const btn3D = page.locator('button[title*="Modo 3D da Bancada"]');
    await btn3D.click();

    // As âncoras projetadas com data-cable-target devem estar presentes e acessíveis
    const atxAnchor = page.locator('[data-cable-target="ATX_PWR"]');
    const cpuAnchor = page.locator('[data-cable-target="ATX12V"]');
    const fanAnchor = page.locator('[data-cable-target="CPU_FAN"]');

    await expect(atxAnchor).toBeVisible({ timeout: 15000 });
    await expect(cpuAnchor).toBeVisible();
    await expect(fanAnchor).toBeVisible();

    // Testa os botões de visão Topo e Isométrica da bancada
    const topoBtn = page.getByRole('button', { name: 'Topo' });
    const isoBtn = page.getByRole('button', { name: 'Isométrica' });

    await expect(topoBtn).toBeVisible();
    await topoBtn.click();

    await expect(isoBtn).toBeVisible();
    await isoBtn.click();
  });

  test('oferece controles de câmera (Frente, Zoom, Reset) e exibe barra de EZ Debug LEDs', async ({ page }) => {
    const btn3D = page.locator('button[title*="Modo 3D da Bancada"]');
    await btn3D.click();

    // Verifica botões de preset Frente, Zoom In, Zoom Out e Reset
    const frenteBtn = page.getByRole('button', { name: 'Frente' });
    const zoomInBtn = page.locator('button[aria-label="Aproximar Câmera"]');
    const zoomOutBtn = page.locator('button[aria-label="Afastar Câmera"]');
    const resetBtn = page.getByRole('button', { name: 'Reset' });

    await expect(frenteBtn).toBeVisible({ timeout: 15000 });
    await frenteBtn.click();

    await expect(zoomInBtn).toBeVisible();
    await zoomInBtn.click();

    await expect(zoomOutBtn).toBeVisible();
    await zoomOutBtn.click();

    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Verifica barra inferior com EZ Debug LEDs
    const debugLedContainer = page.locator('div:has-text("EZ Debug:")').last();
    await expect(debugLedContainer).toBeVisible();
    await expect(debugLedContainer.locator('span:text-is("CPU")')).toBeVisible();
    await expect(debugLedContainer.locator('span:text-is("DRAM")')).toBeVisible();
    await expect(debugLedContainer.locator('span:text-is("VGA")')).toBeVisible();
    await expect(debugLedContainer.locator('span:text-is("BOOT")')).toBeVisible();

    // Salva screenshot do visual limpo da bancada
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas').first();
    await canvas.screenshot({ path: 'workbench3d-clean.png' });
  });
});
