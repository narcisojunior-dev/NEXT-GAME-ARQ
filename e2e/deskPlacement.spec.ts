import { test, expect, Page } from '@playwright/test';
import type { useAssemblyStore } from '../src/store/useAssemblyStore';

// Store exposto em window pela página (hook de teste em src/app/page.tsx)
declare global {
  interface Window {
    useAssemblyStore: typeof useAssemblyStore;
  }
}

const inventory = (page: Page) => page.getByRole('complementary', { name: 'Inventário da mesa' });

async function openDesk(page: Page) {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
  await page.getByRole('button', { name: 'Mesa 3D' }).click();
  await expect(inventory(page)).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });
}

/** Caminho acessível (teclado/leitor de tela): pegar o item e usar "Encaixar em" */
async function placeViaButtons(page: Page, itemName: string, snapLabel: string) {
  await inventory(page).getByRole('button', { name: `Pegar ${itemName} para posicionar` }).click();
  await inventory(page).getByRole('button', { name: `Encaixar em: ${snapLabel}` }).click();
}

test.describe('Mesa Battlestation: snap points e hologramas (Fase 4 · Issue 03)', () => {
  test('monta a mesa pelo inventário acessível, respeitando a ordem física', async ({ page }) => {
    await openDesk(page);
    await expect(inventory(page).getByText('0/5 obrigatórios')).toBeVisible();

    // Periférico antes da mesa: recusado com aviso didático, sem penalidade
    await placeViaButtons(page, 'Teclado Mecânico Redragon Kumara TKL Switch Red', 'Teclado');
    const afterEarlyKeyboard = await page.evaluate(() => {
      const s = window.useAssemblyStore.getState();
      return { placed: Object.keys(s.deskSetup.placedDeskItems), penalties: s.penaltiesCount };
    });
    expect(afterEarlyKeyboard.placed).toEqual([]);
    expect(afterEarlyKeyboard.penalties).toBe(0);
    await page.keyboard.press('Escape');

    await placeViaButtons(page, 'Mesa Gamer Fibra de Carbono 140cm', 'Mesa de Trabalho');
    await placeViaButtons(page, 'Cadeira Ergonômica Mesh NR-17', 'Cadeira do Aluno');
    await placeViaButtons(page, 'Suporte Articulado a Gás ELG F80N 360°', 'Braço Articulado do Monitor');
    await placeViaButtons(page, 'Monitor Gamer LG UltraGear 27" Fast IPS 180Hz', 'Monitor Principal');
    await placeViaButtons(page, 'Mousepad Gamer Speed XL 900x400mm', 'Mousepad Gamer / Deskmat');
    await placeViaButtons(page, 'Teclado Mecânico Redragon Kumara TKL Switch Red', 'Teclado');
    await placeViaButtons(page, 'Mouse Gamer Logitech G Pro X Superlight 63g', 'Mouse');

    await expect(inventory(page).getByText('4/5 obrigatórios')).toBeVisible();

    // O PC ainda não foi montado na bancada: o gabinete continua bloqueado
    await inventory(page).getByRole('button', { name: 'Pegar Seu PC (montado na bancada) para posicionar' }).click();
    await inventory(page).getByRole('button', { name: 'Encaixar em: Gabinete do PC (Torre)' }).click();
    const pc = await page.evaluate(() => {
      const s = window.useAssemblyStore.getState();
      return { hasPc: Boolean(s.deskSetup.placedDeskItems.PC_TOWER), alert: s.activeAlert?.message ?? '' };
    });
    expect(pc.hasPc).toBe(false);
    expect(pc.alert).toMatch(/Finalize a montagem/);
  });

  test('arrastar um item do inventário até a cena encaixa no snap point (atração magnética)', async ({ page }) => {
    await openDesk(page);
    await placeViaButtons(page, 'Mesa Gamer Fibra de Carbono 140cm', 'Mesa de Trabalho');

    await inventory(page)
      .getByRole('button', { name: 'Pegar Mousepad Gamer Speed XL 900x400mm para posicionar' })
      .dragTo(page.locator('canvas').first());

    await expect
      .poll(() => page.evaluate(() => Boolean(window.useAssemblyStore.getState().deskSetup.placedDeskItems.MOUSEPAD)))
      .toBe(true);
  });

  test('retirar itens respeita as dependências (mesa só sai vazia)', async ({ page }) => {
    await openDesk(page);
    await placeViaButtons(page, 'Mesa Gamer Fibra de Carbono 140cm', 'Mesa de Trabalho');
    await placeViaButtons(page, 'Mousepad Gamer Speed XL 900x400mm', 'Mousepad Gamer / Deskmat');

    await inventory(page).getByRole('button', { name: 'Retirar Mesa Gamer Fibra de Carbono 140cm da mesa' }).click();
    expect(await page.evaluate(() => Boolean(window.useAssemblyStore.getState().deskSetup.placedDeskItems.DESK_BASE))).toBe(true);

    await inventory(page).getByRole('button', { name: 'Retirar Mousepad Gamer Speed XL 900x400mm da mesa' }).click();
    await inventory(page).getByRole('button', { name: 'Retirar Mesa Gamer Fibra de Carbono 140cm da mesa' }).click();
    expect(await page.evaluate(() => Object.keys(window.useAssemblyStore.getState().deskSetup.placedDeskItems))).toEqual([]);
  });
});
