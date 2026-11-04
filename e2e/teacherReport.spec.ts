import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { encodeValidationCode } from '../src/engine/validationCode';
import { addToTally, tallyToCounts } from '../src/engine/classReport';

const codeWith = (team: string, score: number, errors: string[]) =>
  encodeValidationCode({ teamName: team, totalScore: score, timeSpentSeconds: 420, errorCounts: tallyToCounts(errors.reduce(addToTally, {})) });

test('relatório da turma: erros mais comuns pelos códigos das bancadas e exportação CSV (#34)', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as any).useAssemblyStore !== 'undefined');
  await page.getByRole('button', { name: /Professor/ }).click();
  const input = page.getByPlaceholder('PCA-EQUIPE-PONTOS-TEMPO-SELO');
  for (const code of [
    codeWith('Bancada 1', 8100, ['Polaridade Invertida (+/-)', 'Soquete Incompatível!']),
    codeWith('Bancada 2', 7600, ['Polaridade Invertida (+/-)', 'Polaridade Invertida (+/-)']),
  ]) {
    // Adicionar ao placar volta para o projetor: reabre o validador a cada código
    await page.getByRole('button', { name: /Validar Hash/ }).click();
    await input.fill(code);
    await page.getByRole('button', { name: 'Verificar' }).click();
    await page.getByRole('button', { name: 'Adicionar ao placar' }).click();
  }

  await page.getByRole('button', { name: 'Relatório da Turma' }).click();
  const common = page.getByRole('region', { name: 'Erros mais comuns da turma' });
  await expect(common.getByRole('listitem').first()).toContainText('Polaridade');
  await expect(common.getByRole('listitem').first()).toContainText('3 erros · 2 equipes');
  await expect(page.getByRole('region', { name: 'Habilidades do certificado × BNCC' })).toContainText('EM13CO16');

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar CSV' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^relatorio-turma-\d{4}-\d{2}-\d{2}\.csv$/);
  const csv = readFileSync((await download.path())!, 'utf-8');
  expect(csv).toContain('BANCADA 1;8100;420;');
  expect(csv).toContain('EM13CO16');
});
