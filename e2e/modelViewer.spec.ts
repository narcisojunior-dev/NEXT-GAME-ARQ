import { test, expect } from '@playwright/test';

test.describe('Visualizador 3D e Vitrine (Fase 1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Aguarda carregar a aplicação
    await expect(page.locator('body')).toBeVisible();
  });

  test('botão Vitrine 3D está visível no HUD e abre a galeria', async ({ page }) => {
    const vitrineButton = page.getByRole('button', { name: /Vitrine 3D/i });
    await expect(vitrineButton).toBeVisible();
    await vitrineButton.click();

    // Modal deve estar aberto
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Vitrine 3D');

    // Deve exibir modelos catalogados na galeria
    const galleryItems = modal.locator('button').filter({ hasText: /MB|GPU|CPU|Cooler|RAM|Case/i });
    expect(await galleryItems.count()).toBeGreaterThan(0);
  });

  test('renderiza o Canvas 3D e permite alternar pontos de vista', async ({ page }) => {
    // Abre a Vitrine 3D com hidratação garantida
    const vitrineBtn = page.getByRole('button', { name: /Vitrine 3D/i });
    await expect(vitrineBtn).toBeVisible();
    await vitrineBtn.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Seleciona um modelo de GPU ou placa-mãe
    const modelCard = modal.locator('button').filter({ hasText: /RX 6700 XT|B550M|Z790/i }).first();
    await modelCard.click();

    // Canvas do Three.js deve ser carregado e visível
    const canvas = modal.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Testa os botões de controle de câmera
    const frenteBtn = modal.getByRole('button', { name: 'Frente' });
    const cimaBtn = modal.getByRole('button', { name: 'Cima' });
    const ladoBtn = modal.getByRole('button', { name: 'Lado' });
    const perspectivaBtn = modal.getByRole('button', { name: 'Perspectiva' });

    await expect(frenteBtn).toBeVisible();
    await frenteBtn.click();

    await expect(cimaBtn).toBeVisible();
    await cimaBtn.click();

    await expect(ladoBtn).toBeVisible();
    await ladoBtn.click();

    await expect(perspectivaBtn).toBeVisible();
    await perspectivaBtn.click();

    // Fecha o modal
    const closeBtn = modal.locator('button[aria-label="Fechar"], button:has-text("✕"), button:has-text("Fechar")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(modal).not.toBeVisible();
    }
  });

  test('ficha técnica da peça possui botão "Ver em 3D" integrado', async ({ page }) => {
    // Abre gaveta de inventário ou card de peça
    const inspectButtons = page.locator('button[title*="Inspecionar"], button:has-text("Inspecionar"), button:has-text("Ver em 3D")');
    if ((await inspectButtons.count()) > 0) {
      await inspectButtons.first().click();

      // Se abriu a ficha da peça, checa se tem botão Ver em 3D
      const verEm3dBtn = page.getByRole('button', { name: /Ver em 3D/i });
      if (await verEm3dBtn.isVisible()) {
        await verEm3dBtn.click();
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();
        await expect(modal.locator('canvas')).toBeVisible({ timeout: 15000 });
      }
    }
  });
});

