import { test, expect, Page, Locator } from '@playwright/test';
import { READY_MB, buildReadyAssembly } from '../src/engine/__tests__/fixtures/readyPc';
import { EMPTY_CABLE_CONNECTIONS } from '../src/engine/cabling';

/**
 * Arrastar e soltar de verdade (#33): ponteiro do mouse pressionado, movido e solto sobre o
 * conector, como o aluno faz no touchpad. Também pelo teclado e numa tela de 375 px (@375).
 */

/** PC pronto para o cabeamento: peças encaixadas, nenhum cabo ligado */
async function prepareCabling(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as any).useAssemblyStore !== 'undefined');
  const assembly = {
    ...buildReadyAssembly({ withGpu: true }),
    cableAtx24PinConnected: false,
    cableCpu8PinConnected: false,
    cableGpuPcieConnected: false,
    coolerFanConnected: false,
    caseFansConnected: false,
    frontUsbConnected: false,
    frontAudioConnected: false,
    frontPanelPowerSwConnected: false,
    frontPanelResetSwConnected: false,
    frontPanelLedsConnected: false,
  };
  await page.evaluate(
    ({ assembly, mb, cables }) => {
      const store = (window as any).useAssemblyStore;
      store.getState().resetAssembly();
      store.setState({ assembly, selectedMotherboard: mb, cableConnections: cables, penaltiesCount: 0 });
    },
    { assembly, mb: READY_MB, cables: EMPTY_CABLE_CONNECTIONS }
  );
  await page.locator('button[title*="Modo 2D Leve da Bancada"]').click();
  await expect(page.getByTestId('workbench-2d')).toBeVisible();
  await page.getByRole('complementary', { name: 'Menu Lateral de Escolha de Componentes e Cabeamento' }).getByRole('button', { name: /^Cabos/ }).click();
}

const state = (page: Page) =>
  page.evaluate(() => {
    const s = (window as any).useAssemblyStore.getState();
    return { cables: s.cableConnections, penalties: s.penaltiesCount, alert: s.activeAlert, fpanel: s.fPanelConnections };
  });

const cableButton = (page: Page, name: string) =>
  page.getByRole('complementary', { name: 'Bandeja de cabos' }).getByRole('button', { name: new RegExp(`^${name.replace(/[()]/g, '\\$&')},`) });

/**
 * Pressiona, arrasta e solta sobre o alvo. `hover()` só posiciona o ponteiro quando o próprio
 * elemento está sob ele (rolagem e mudanças de layout já resolvidas), antes de pressionar e
 * antes de soltar; os passos intermediários disparam a atração magnética como no touchpad.
 */
/** Espera a caixa do elemento parar de mudar (fontes e compilação a frio do dev server ainda mexem no layout) */
async function settled(locator: Locator) {
  const box = async () => JSON.stringify(await locator.boundingBox());
  let previous = '';
  await expect
    .poll(async () => {
      const current = await box();
      const same = current === previous;
      previous = current;
      return same;
    }, { intervals: [100, 150, 200] })
    .toBe(true);
}

async function dragTo(page: Page, source: Locator, target: Locator) {
  await page.evaluate(() => document.fonts.ready);
  await target.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await settled(source);
  await settled(target);
  await source.hover();
  await page.mouse.down();
  const to = await target.boundingBox();
  if (!to) throw new Error('alvo sem caixa');
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
  await target.hover();
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test.describe('Arrastar e soltar real: cabos da fonte e painel frontal', () => {
  test('ATX 24 pinos arrastado até o conector ATX_PWR encaixa', async ({ page }) => {
    await prepareCabling(page);
    await dragTo(page, cableButton(page, 'ATX 24 pinos'), page.getByRole('button', { name: 'ATX_PWR, vazio' }));
    await expect.poll(async () => (await state(page)).cables.ATX_24PIN).toBe('ATX_PWR');
    await expect(page.getByRole('button', { name: /^ATX_PWR, ligado/ })).toBeVisible();
  });

  test('erro clássico: o EPS da CPU na entrada PCIe da GPU é recusado como perigoso', async ({ page }) => {
    await prepareCabling(page);
    await dragTo(page, cableButton(page, 'EPS 8 pinos (CPU)'), page.getByRole('button', { name: 'PCIe 8 pinos, vazio' }));
    await expect.poll(async () => (await state(page)).alert?.title).toBe('Encaixe Perigoso!');
    const s = await state(page);
    expect(s.cables.EPS_8PIN).toBeNull();
    expect(s.penalties).toBe(1);
    // O cabo certo no lugar certo
    await dragTo(page, cableButton(page, 'EPS 8 pinos (CPU)'), page.getByRole('button', { name: 'ATX12V, vazio' }));
    await expect.poll(async () => (await state(page)).cables.EPS_8PIN).toBe('ATX12V');
  });

  test('pelo teclado: Enter pega o cabo e Enter no conector encaixa', async ({ page }) => {
    await prepareCabling(page);
    await cableButton(page, 'PCIe 8 pinos (GPU)').focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'PCIe 8 pinos, vazio' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await state(page)).cables.PCIE_8PIN).toBe('GPU_POWER');
  });

  test('F_PANEL: o LED com a polaridade invertida é recusado; girar (R) e arrastar de novo encaixa', async ({ page }) => {
    await prepareCabling(page);
    // O <g> do F_PANEL é ativado pelo teclado (o centro da caixa dele cai no fundo da placa)
    await page.getByRole('button', { name: /^F_PANEL: painel frontal/ }).focus();
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: /F_PANEL/ });
    await expect(modal).toBeVisible();
    const plug = modal.getByRole('button', { name: /^HDD LED \(\+\/-\): (pegar conector|na mão)/ });
    const pin1 = modal.getByRole('button', { name: /^Pino 1:/ });
    const rotateButton = modal.getByRole('button', { name: 'Girar o conector HDD LED (+/-) 180 graus' });

    await dragTo(page, plug, pin1);
    let seated = (await state(page)).fpanel.HDD_LED;
    if (seated) {
      // Caiu na orientação certa por sorte: tira dos pinos, gira para a errada e testa a recusa
      // Arrasta para longe dos pinos (sobre o título); a prévia do conector cobre o título, então solta pela coordenada
      await modal.getByRole('button', { name: /^HDD LED \(\+\/-\) encaixado/ }).hover();
      await page.mouse.down();
      const away = await modal.getByRole('heading').first().boundingBox();
      if (!away) throw new Error('título sem caixa');
      await page.mouse.move(away.x + 20, away.y + away.height / 2, { steps: 15 });
      await page.mouse.up();
      await expect.poll(async () => (await state(page)).fpanel.HDD_LED).toBeNull();
      await rotateButton.click();
      await dragTo(page, plug, pin1);
    }
    // Polaridade invertida: recusado e explicado
    expect((await state(page)).fpanel.HDD_LED).toBeNull();
    await expect(modal.getByText(/Gire o conector e tente de novo/)).toBeVisible();

    // Depois da recusa o conector continua na mão; a tecla R gira 180°
    await expect(modal.getByRole('button', { name: /^HDD LED \(\+\/-\): na mão/ })).toBeVisible();
    await page.keyboard.press('r');
    await expect(modal.getByText(/fio colorido \(\+\) trocou de lado/)).toBeVisible();
    await pin1.click();
    await expect.poll(async () => (await state(page)).fpanel.HDD_LED).toEqual([1, 3]);
  });
});

test.describe('Tela de 375 px (celular) @375', () => {
  test('cabeamento e painel frontal funcionam na tela estreita @375', async ({ page }) => {
    await prepareCabling(page);
    // Sem rolagem horizontal da página
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await cableButton(page, 'ATX 24 pinos').click();
    await page.getByRole('button', { name: 'ATX_PWR, vazio' }).click();
    await expect.poll(async () => (await state(page)).cables.ATX_24PIN).toBe('ATX_PWR');

    // O <g> do F_PANEL é ativado pelo teclado (o centro da caixa dele cai no fundo da placa)
    await page.getByRole('button', { name: /^F_PANEL: painel frontal/ }).focus();
    await page.keyboard.press('Enter');
    const modal = page.getByRole('dialog', { name: /F_PANEL/ });
    await modal.getByRole('button', { name: /^POWER SW: pegar conector/ }).click();
    await modal.getByRole('button', { name: /^Pino 6:/ }).click();
    await expect.poll(async () => (await state(page)).fpanel.POWER_SW).toEqual([6, 8]);
  });
});
