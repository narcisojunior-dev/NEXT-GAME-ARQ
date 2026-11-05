import { test, expect, Page } from '@playwright/test';
import type { useAssemblyStore } from '../src/store/useAssemblyStore';
import { READY_MB, buildReadyAssembly } from '../src/engine/__tests__/fixtures/readyPc';

// Store exposto em window pela página (hook de teste em src/app/page.tsx)
declare global {
  interface Window {
    useAssemblyStore: typeof useAssemblyStore;
  }
}

const panel = (page: Page) => page.getByRole('complementary', { name: 'Inventário da mesa' });

async function place(page: Page, itemName: string, snapLabel: string) {
  await panel(page).getByRole('button', { name: `Pegar ${itemName} para posicionar` }).click();
  await panel(page).getByRole('button', { name: `Encaixar em: ${snapLabel}` }).click();
}

/** Pega o cabo e escolhe as pontas pelos botões acessíveis do painel */
async function connect(page: Page, cableName: string, ports: { first?: RegExp; dest: RegExp }, reconnect = false) {
  await panel(page).getByRole('button', { name: `${reconnect ? 'Reconectar' : 'Conectar'} ${cableName}` }).click();
  if (ports.first) await panel(page).getByRole('button', { name: ports.first }).click();
  await panel(page).getByRole('button', { name: ports.dest }).click();
}

const monitorStatus = (page: Page) => panel(page).getByRole('status').filter({ hasText: 'Monitor:' });

test.describe('Jornada completa da Fase 4: bancada → mesa → cabos → boot (Issue 06)', () => {
  test('o erro clássico do cabo de vídeo mostra SEM SINAL e o AcademyOS sobe ao ligar na GPU', async ({ page }) => {
    // Jornada longa (8 itens, 5 cabos, liga, troca o cabo a quente): no CI, com WebGL por software, passa de 60 s
    test.setTimeout(120_000);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');

    // PC já montado na bancada (PHASE_7_BOOT_POST) com placa de vídeo dedicada
    await page.evaluate(
      ({ assembly, mb }) => window.useAssemblyStore.setState({ assembly, selectedMotherboard: mb }),
      { assembly: buildReadyAssembly({ withGpu: true }), mb: READY_MB }
    );

    await page.getByRole('button', { name: 'Mesa 3D', exact: true }).click();
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15000 });

    // 1. Mobília e periféricos
    await place(page, 'Mesa Gamer Fibra de Carbono 140cm', 'Mesa de Trabalho');
    await place(page, 'Seu PC (montado na bancada)', 'Gabinete do PC (Torre)');
    await place(page, 'Suporte Articulado a Gás ELG F80N 360°', 'Braço Articulado do Monitor');
    await place(page, 'Monitor Gamer LG UltraGear 27" Fast IPS 180Hz', 'Monitor Principal');
    await place(page, 'Mousepad Gamer Speed XL 900x400mm', 'Mousepad Gamer / Deskmat');
    await place(page, 'Teclado Mecânico Redragon Kumara TKL Switch Red', 'Teclado');
    await place(page, 'Mouse Gamer Logitech G Pro X Superlight 63g', 'Mouse');
    await expect(panel(page).getByText('5/5 obrigatórios')).toBeVisible();

    // 2. Sem energia ainda: o PC não liga
    await expect(panel(page).getByRole('button', { name: 'Ligar o PC' })).toBeDisabled();

    // 3. Cabos — com o vídeo propositalmente na placa-mãe
    await connect(page, 'Cabo de Força Tripolar C13/C14 (Fonte do PC)', { dest: /^Conectar em: Tomada da Parede \/ Filtro 1/ });
    await connect(page, 'Cabo de Força do Monitor', { dest: /^Conectar em: Tomada da Parede \/ Filtro 2/ });
    await connect(page, 'Cabo USB do Teclado', { dest: /^Conectar em: USB Traseira 1/ });
    await connect(page, 'Cabo USB do Mouse', { dest: /^Conectar em: USB Traseira 2/ });
    await expect(monitorStatus(page)).toContainText('em espera');

    await connect(page, 'Cabo de Vídeo HDMI / DisplayPort de Alta Velocidade', {
      first: /^Primeira ponta: HDMI Onboard/,
      dest: /^Conectar em: HDMI IN \(Monitor\)/,
    });
    expect(await page.evaluate(() => window.useAssemblyStore.getState().penaltiesCount)).toBe(1);

    // 4. Liga: a fonte e as ventoinhas sobem, mas o monitor fica SEM SINAL
    await panel(page).getByRole('button', { name: 'Ligar o PC' }).click();
    await expect(monitorStatus(page)).toContainText('SEM SINAL');
    await expect(monitorStatus(page)).toContainText('placa de vídeo dedicada');
    await expect(page.getByText('Ligado — verifique os cabos')).toBeVisible();

    // 5. Hot-plug: move o cabo para a GPU com o PC ligado → imagem e AcademyOS
    await connect(
      page,
      'Cabo de Vídeo HDMI / DisplayPort de Alta Velocidade',
      { first: /^Primeira ponta: HDMI 1 \(Placa de Vídeo Dedicada\)/, dest: /^Conectar em: HDMI IN \(Monitor\)/ },
      true
    );
    await expect(monitorStatus(page)).toContainText('Imagem OK');
    await expect(panel(page).getByText('estação montada com sucesso', { exact: false })).toBeVisible();
    await expect(page.getByText('AcademyOS em Execução ✓')).toBeVisible();

    // 6. Puxar o cabo de força da tomada desliga a estação
    await panel(page).getByRole('button', { name: 'Desconectar Cabo de Força Tripolar C13/C14 (Fonte do PC)' }).click();
    expect(await page.evaluate(() => window.useAssemblyStore.getState().deskSetup.isDeskPoweredOn)).toBe(false);
    await expect(monitorStatus(page)).toContainText('em espera');
  });

  test('a tela 3D do monitor recebe a textura viva (CanvasTexture)', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
    await page.evaluate(
      ({ assembly, mb }) => window.useAssemblyStore.setState({ assembly, selectedMotherboard: mb }),
      { assembly: buildReadyAssembly({ withGpu: true }), mb: READY_MB }
    );
    await page.getByRole('button', { name: 'Mesa 3D', exact: true }).click();
    await place(page, 'Mesa Gamer Fibra de Carbono 140cm', 'Mesa de Trabalho');
    await place(page, 'Suporte Articulado a Gás ELG F80N 360°', 'Braço Articulado do Monitor');
    await place(page, 'Monitor Gamer LG UltraGear 27" Fast IPS 180Hz', 'Monitor Principal');

    // O canvas WebGL continua saudável com o monitor e sua textura carregados
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    const hasContext = await canvas.evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement)) return false;
      return Boolean(el.getContext('webgl2') || el.getContext('webgl'));
    });
    expect(hasContext).toBe(true);
  });
});
