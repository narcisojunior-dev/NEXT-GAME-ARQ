import { test, expect } from '@playwright/test';
import { DIAGNOSTIC_CAUSES, DIAGNOSTIC_SCENARIOS } from '../src/engine/diagnosticCases';

test('modo detetive: bancada lacrada até a hipótese certa, sem checklist entregando a resposta (#32)', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as any).useAssemblyStore !== 'undefined');
  await page.getByRole('button', { name: 'Diagnóstico' }).click();

  const scenarioId: string = await page.evaluate(() => (window as any).useAssemblyStore.getState().activeDiagnosticScenario.id);
  const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === scenarioId)!;

  // Sem checklist nem dica da fase; bancada lacrada
  await expect(page.getByText('Objetivo Atual da Bancada', { exact: false })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Bancada lacrada' })).toBeVisible();

  const form = page.getByRole('group', { name: /Hipótese: qual é a causa mais provável/ });
  const options = await form.getByRole('radio').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  const wrong = options.find((o) => o !== scenario.cause)!;

  await form.getByRole('radio', { name: DIAGNOSTIC_CAUSES[wrong as keyof typeof DIAGNOSTIC_CAUSES] }).check();
  await page.getByRole('button', { name: 'Registrar hipótese' }).click();
  await expect(page.getByText(/hipótese descartada/i).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Bancada lacrada' })).toBeVisible();

  await form.getByRole('radio', { name: DIAGNOSTIC_CAUSES[scenario.cause] }).check();
  await page.getByRole('button', { name: 'Registrar hipótese' }).click();
  await expect(page.getByRole('region', { name: 'Bancada lacrada' })).toHaveCount(0);
  await expect(page.getByText(`Vale ${Math.round(scenario.rewardPoints * 0.75)} XP`)).toBeVisible();
});
