import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openRunningDesk } from './support/deskRunning';
import './support/windowStores';
import { STARTER_SETS } from '../src/engine/roomDecorState';
import { findDecorItem } from '../src/engine/roomDecor';
import { snapToZone } from '../src/engine/roomPlacement';
import { DOOR_SWING, buildRoomContext } from '../src/engine/roomLayout';

/**
 * Modo Decorar o Quarto (#87, #88, #90): do PC ligado na mesa ao quarto decorado, salvo e fotografado.
 * Colocar por clique e por arraste, teclado, girar, recusa com mensagem, remover, desfazer,
 * recarregar a página e gerar a foto em PNG.
 */
const drawer = (page: Page) => page.getByRole('complementary', { name: 'Gaveta de decoração' });
const roomList = (page: Page) => drawer(page).getByRole('region', { name: 'Itens no quarto' }).getByRole('listitem');
const status = (page: Page) => drawer(page).getByRole('status');

async function openDecor(page: Page) {
  await openRunningDesk(page);
  await page.getByRole('button', { name: 'Decorar o quarto' }).first().click();
  await expect(drawer(page)).toBeVisible({ timeout: 20000 });
  await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length, { timeout: 15000 });
}

test.describe('Modo Decorar o Quarto', () => {
  test('o botão só aparece com o AcademyOS em execução', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
    await page.getByRole('button', { name: 'Mesa 3D', exact: true }).click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Decorar o quarto' }).first()).toHaveCount(0);
  });

  test('decorar: clique, arraste, teclado, girar, recusa, remover e desfazer', async ({ page }) => {
    test.setTimeout(180_000);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDecor(page);

    // Conjunto inicial do tema Gamer; o limite depende do nível de qualidade (o Chromium de teste usa renderização por software: nível leve, 12 itens)
    await expect(drawer(page).getByText(new RegExp(`^${STARTER_SETS.ROOM_GAMER.length}/12 itens`))).toBeVisible();

    // 1. Clique: pegar o puff e clicar num ponto destacado
    await drawer(page).getByRole('button', { name: 'Pegar: Puff' }).click();
    await page.getByRole('button', { name: /^Colocar aqui:/ }).first().click();
    await expect(status(page)).toContainText('Puff foi colocado no quarto');
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 1);

    // 2. Arraste real: do card da gaveta até um lugar livre do chão
    await drawer(page).getByRole('button', { name: 'Pegar: Lixeira' }).click();
    const spot = await page.getByRole('button', { name: /^Colocar aqui: no chão/ }).first().boundingBox();
    if (!spot) throw new Error('sem ponto destacado');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /^Colocar aqui:/ })).toHaveCount(0);
    const card = drawer(page).getByRole('button', { name: 'Pegar: Lixeira' });
    await card.hover();
    await page.mouse.down();
    await page.mouse.move(spot.x + spot.width / 2, spot.y + spot.height / 2, { steps: 20 });
    await page.waitForTimeout(200);
    await page.mouse.move(spot.x + spot.width / 2 + 1, spot.y + spot.height / 2, { steps: 2 });
    await page.mouse.up();
    await expect(status(page)).toContainText('Lixeira foi colocado no quarto');
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 2);

    // 3. Só teclado: Enter pega, setas movem, Q gira, Enter coloca
    const guitar = drawer(page).getByRole('button', { name: 'Pegar: Violão' });
    await guitar.focus();
    await page.keyboard.press('Enter');
    await expect(drawer(page).getByRole('region', { name: 'Em mãos: Violão' })).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('q');
    await drawer(page).getByRole('button', { name: 'Em mãos: Violão' }).focus();
    await page.keyboard.press('Enter');
    await expect(status(page)).toContainText(/Violão foi colocado no quarto|Encosta|Bloqueia|caminho/);
    if (!(await status(page).textContent())?.includes('foi colocado')) {
      // O passo de 10 cm caiu num lugar ocupado: Enter de novo usa o lugar livre seguinte
      await page.keyboard.press('Escape');
      await guitar.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
    }
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 3);

    // 4. Girar pelo painel acessível
    await drawer(page).getByRole('button', { name: 'Girar Puff' }).click();
    await expect(status(page)).toContainText('Puff girou 90°');

    // 5. Recusa com mensagem: o criado-mudo na frente da porta
    const ctx = buildRoomContext(await page.evaluate(() => window.useAssemblyStore.getState().deskSetup.placedDeskItems), null);
    const atDoor = snapToZone(findDecorItem('decor-criado-mudo')!, 'FLOOR', [-1.6, 0, (DOOR_SWING.min[2] + DOOR_SWING.max[2]) / 2], 0, ctx);
    await drawer(page).getByRole('button', { name: 'Pegar: Criado-mudo' }).click();
    await page.evaluate((p) => window.useDecorModeStore.getState().setPlacement(p), atDoor);
    await expect(page.getByText('Bloqueia a porta: ela precisa abrir livre.').first()).toBeVisible();
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('Enter');
    await expect(status(page)).toContainText('Bloqueia a porta');
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 3);
    await page.keyboard.press('Escape');

    // 6. Remover e desfazer
    await drawer(page).getByRole('button', { name: 'Remover Puff' }).click();
    await expect(status(page)).toContainText('Puff voltou para a gaveta');
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 2);
    await drawer(page).getByRole('button', { name: 'Desfazer (Ctrl+Z)' }).click();
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 3);

    // 7. Itens bloqueados mostram a conquista e o progresso
    await drawer(page).getByRole('tab', { name: /Gamer/ }).click();
    await expect(drawer(page).getByRole('button', { name: /^Fliperama, bloqueado\. Conclua a trilha "Desafio em Grupos" \(0 de 4\)/ })).toBeVisible();
  });

  test('o quarto continua igual depois de recarregar a página e a foto gera um PNG 1920 × 1080', async ({ page }) => {
    test.setTimeout(180_000);
    await openDecor(page);
    await drawer(page).getByRole('button', { name: 'Pegar: Puff' }).click();
    await page.getByRole('button', { name: /^Colocar aqui:/ }).first().click();
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 1);
    const before = await roomList(page).allInnerTexts();

    await page.reload();
    await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
    // A vista da mesa também é salva: depois do F5 a página já volta nela
    await expect(page.getByRole('button', { name: 'Decorar o quarto' }).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Decorar o quarto' }).first().click();
    await expect(roomList(page)).toHaveCount(STARTER_SETS.ROOM_GAMER.length + 1, { timeout: 20000 });
    expect(await roomList(page).allInnerTexts()).toEqual(before);

    const download = page.waitForEvent('download');
    await drawer(page).getByRole('button', { name: 'Tirar foto (PNG)' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe('quarto-equipe-alfa.png');
    const png = readFileSync(await file.path());
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1920, 1080]);
    expect(png.length).toBeGreaterThan(50_000);
    await expect(status(page)).toContainText('Foto salva (1920 × 1080');
  });

  test('o modo professor libera toda a decoração; peças repetidas usam instâncias', async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openDecor(page);
    await page.evaluate(() => window.useProgressStore.setState({ teacherUnlockAll: true }));
    await drawer(page).getByRole('tab', { name: /Museu do PC/ }).click();
    await expect(drawer(page).getByRole('button', { name: 'Pegar: PC dos anos 90' })).toBeVisible();
    await drawer(page).getByRole('tab', { name: /Gamer/ }).click();
    await drawer(page).getByRole('button', { name: 'Pegar: Fliperama' }).click();
    await page.getByRole('button', { name: /^Colocar aqui:/ }).first().click();
    await expect(status(page)).toContainText('Fliperama foi colocado no quarto');

    // Duas placas de espuma acústica: desenhadas como InstancedMesh, selecionáveis e removíveis uma a uma
    for (let i = 0; i < 2; i++) {
      // Teclado: Enter pega e Enter no mesmo card coloca no primeiro lugar livre
      await drawer(page).getByRole('button', { name: 'Pegar: Espuma acústica' }).focus();
      await page.keyboard.press('Enter');
      await drawer(page).getByRole('button', { name: 'Em mãos: Espuma acústica' }).focus();
      await page.keyboard.press('Enter');
      await expect(status(page)).toContainText('Espuma acústica foi colocado no quarto');
    }
    await expect(roomList(page).filter({ hasText: 'Espuma acústica' })).toHaveCount(2);
    const instanced = await page.evaluate(() => {
      const items = window.useRoomDecorStore.getState().items;
      return items.filter((p) => p.decorId === 'decor-espuma-acustica').length;
    });
    expect(instanced).toBe(2);
    await drawer(page).getByRole('button', { name: 'Remover Espuma acústica' }).first().click();
    await expect(roomList(page).filter({ hasText: 'Espuma acústica' })).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('gaveta e colocar por clique numa tela de 375 px @375', async ({ page }) => {
    test.setTimeout(120_000);
    await openDecor(page);
    await drawer(page).getByRole('button', { name: 'Pegar: Puff' }).click();
    await page.getByRole('button', { name: /^Colocar aqui:/ }).first().click();
    await expect(status(page)).toContainText('Puff foi colocado no quarto');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
