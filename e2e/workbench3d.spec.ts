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
    // No modo 2D deve renderizar o SVG da placa-mãe
    const svgMotherboard = page.locator('svg[viewBox*="0 0 680 720"], svg').first();
    await expect(svgMotherboard).toBeVisible();

    // Retorna para o modo 3D
    await btn3D.click();
    // No modo 3D deve carregar o Canvas WebGL
    const canvas = page.locator('div:has-text("Bancada 3D Interativa")').locator('..').locator('canvas');
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
});
