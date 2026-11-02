import { test, expect } from '@playwright/test';

test.describe('Bancada 3D Interativa com Âncoras Projetadas (Fase 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Aguarda a hidratação (o alternador 3D/2D só liga o WebGL depois do mount)
    await page.waitForFunction(() => typeof (window as any).useAssemblyStore !== 'undefined', { timeout: 15000 });
  });

  test('exibe o alternador 3D / 2D na bancada e permite trocar de modo', async ({ page }) => {
    const btn3D = page.locator('button[title*="Modo 3D da Bancada"]');
    const btn2D = page.locator('button[title*="Modo 2D Leve da Bancada"]');

    await expect(btn3D).toBeVisible();
    await expect(btn2D).toBeVisible();

    // Alterna para o modo 2D leve
    await btn2D.click();
    // No modo 2D deve renderizar a bancada vetorial (placa-mãe SVG ou a área para assentá-la)
    await expect(page.getByTestId('workbench-2d')).toBeVisible();
    await expect(btn2D).toHaveAttribute('aria-pressed', 'true');

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

  test('oferece controles de câmera (Frente, Zoom, Reset) e exibe barra de EZ Debug LEDs', async ({ page }, testInfo) => {
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
    const debugLedContainer = page.locator('text=EZ Debug:');
    await expect(debugLedContainer).toBeVisible();
    await expect(page.locator('span:text-is("CPU")')).toBeVisible();
    await expect(page.locator('span:text-is("DRAM")')).toBeVisible();
    await expect(page.locator('span:text-is("VGA")')).toBeVisible();
    await expect(page.locator('span:text-is("BOOT")')).toBeVisible();

    // Salva screenshot do visual limpo da bancada
    await page.waitForTimeout(1000);
    const canvas = page.locator('canvas').first();
    await canvas.screenshot({ path: testInfo.outputPath('workbench3d-clean.png') });
  });

  test('pinos 3D são operáveis só pelo teclado: Tab alcança a ação do tooltip e Esc o dispensa', async ({ page }) => {
    await page.locator('button[title*="Modo 3D da Bancada"]').click();
    const pin = page.getByRole('button', { name: 'Painel Frontal', exact: true });
    await expect(pin).toBeAttached({ timeout: 15000 });

    await pin.focus();
    const actions = page.getByRole('group', { name: 'Ações: Painel Frontal' });
    await expect(actions).toBeVisible();

    // O tooltip continua aberto quando o foco entra nele (antes ele sumia no blur do pino)
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Abrir Zoom F_PANEL' })).toBeFocused();
    await expect(actions).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(actions).toBeHidden();
  });

  test('modo 2D: a placa-mãe é assentada com Enter, sem mouse', async ({ page }) => {
    await page.locator('button[title*="Modo 2D Leve da Bancada"]').click();
    await page.evaluate(() => {
      const store = (window as any).useAssemblyStore.getState();
      store.resetAssembly();
      store.dischargeEsd();
      const mb = { id: 'mb-b550m-am4', name: 'ASRock B550M', category: 'MOTHERBOARD', formFactor: 'Micro-ATX', socket: 'AM4',
        chipset: 'B550', supportedRam: 'DDR4', ramSlotsCount: 4, maxMemoryGb: 128, pciSlots16x: 1, m2SlotsCount: 1,
        sataPortsCount: 4, hasIntegratedIoShield: false, price: 500, description: '', levelRequired: 1, tdpWatts: 30, image: '' };
      store.setSelectedComponentForPlacement(mb);
    });

    const dropZone = page.getByRole('button', { name: /Assentar ASRock B550M na bancada/ });
    await dropZone.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('group', { name: /Bancada 2D: placa-mãe ASRock B550M/ })).toBeVisible();
    expect(await page.evaluate(() => (window as any).useAssemblyStore.getState().selectedMotherboard?.id)).toBe('mb-b550m-am4');
  });
});
