import { test, expect } from '@playwright/test';
import { READY_MB, buildReadyAssembly } from '../src/engine/__tests__/fixtures/readyPc';
import { powerOn } from './support/benchUi';
import { openRunningDesk } from './support/deskRunning';
import './support/windowStores';

/**
 * Jornada guiada: o jogo sugere o próximo passo. PC aprovado no POST → montar a estação na mesa;
 * estação ligada → decorar o quarto.
 */
test('PC aprovado no POST: a bancada sugere levar o PC para a Mesa 3D', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
  await page.evaluate(({ assembly, mb }) => window.useAssemblyStore.setState({ assembly, selectedMotherboard: mb }), { assembly: buildReadyAssembly({ withGpu: true }), mb: READY_MB });
  const next = page.getByRole('region', { name: 'Próxima etapa: montar a estação na mesa' });
  await expect(next).toHaveCount(0);
  await powerOn(page);
  await expect(next).toBeVisible();
  await expect(next).toContainText('PC aprovado no POST!');
  await next.getByRole('button', { name: 'Levar o PC para a Mesa 3D' }).click();
  await expect(page.getByRole('complementary', { name: 'Inventário da mesa' })).toBeVisible();
  await expect(next).toHaveCount(0);
});

test('estação ligada: a mesa convida para decorar o quarto, e o convite some depois de abrir o modo', async ({ page }) => {
  test.setTimeout(120_000);
  await openRunningDesk(page);
  const invite = page.getByRole('region', { name: 'Próxima etapa: decorar o quarto' });
  await expect(invite).toBeVisible();
  await invite.getByRole('button', { name: 'Decorar o quarto' }).click();
  await expect(page.getByRole('complementary', { name: 'Gaveta de decoração' })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Sair do Modo Decorar' }).click();
  await expect(invite).toHaveCount(0);
});

test('o convite pode ser dispensado com "Agora não"', async ({ page }) => {
  await openRunningDesk(page);
  const invite = page.getByRole('region', { name: 'Próxima etapa: decorar o quarto' });
  await invite.getByRole('button', { name: 'Agora não' }).click();
  await expect(invite).toHaveCount(0);
  // O botão da barra continua disponível
  await expect(page.getByRole('button', { name: 'Decorar o quarto' })).toHaveCount(1);
});
