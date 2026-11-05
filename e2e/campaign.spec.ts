import { test, expect, Page } from '@playwright/test';
import type { useAssemblyStore } from '../src/store/useAssemblyStore';
import { encodeValidationCode } from '../src/engine/validationCode';

// Store exposto em window pela página depois da hidratação (src/app/page.tsx)
declare global {
  interface Window {
    useAssemblyStore: typeof useAssemblyStore;
  }
}

const map = (page: Page) => page.getByRole('dialog', { name: 'Jornada do Técnico' });

async function freshStart(page: Page) {
  // Movimento reduzido (#28): sem animações infinitas, os botões ficam estáveis para o clique
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => typeof window.useAssemblyStore !== 'undefined');
}

test.describe('Campanha: missões sequenciais por módulo (#43, #44) e progresso salvo (#30)', () => {
  test('a missão 2 só libera depois da 1; concluir mostra estrelas, pergunta e a próxima missão', async ({ page }) => {
    await freshStart(page);
    await page.getByRole('button', { name: 'Campanha', exact: true }).click();
    await expect(map(page)).toBeVisible();

    // Oficina Guiada: a 1 disponível, a 2 bloqueada
    await map(page).getByRole('button', { name: /Bancada Segura/ }).click();
    await expect(map(page).getByRole('button', { name: 'Começar missão' })).toBeEnabled();
    await map(page).getByRole('button', { name: /Pré-Gabinete/ }).click();
    await expect(map(page).getByRole('button', { name: 'Conclua a missão anterior para liberar' })).toBeDisabled();

    // Joga a missão 1
    await map(page).getByRole('button', { name: /Bancada Segura/ }).click();
    await map(page).getByRole('button', { name: 'Começar missão' }).click();
    const panel = page.getByRole('region', { name: /Missão em andamento: Bancada Segura/ });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('status')).toContainText('0/1 cumpridos');

    await page.getByRole('button', { name: /Toque para Descarregar Estática/ }).click();
    await expect(panel.getByRole('status')).toContainText('1/1 cumpridos');
    await panel.getByRole('button', { name: 'Entregar ao cliente' }).click();

    const debrief = page.getByRole('dialog', { name: /aprovou a entrega/ });
    await expect(debrief).toBeVisible();
    await expect(debrief.getByLabel(/de 3 estrelas/)).toBeVisible();
    await debrief.getByRole('button', { name: 'Para não danificar os chips com uma descarga' }).click();
    await expect(debrief.getByRole('status')).toContainText('Correto!');

    // A próxima missão do mesmo módulo foi liberada
    await debrief.getByRole('button', { name: /Próxima missão: Pré-Gabinete/ }).click();
    await expect(page.getByRole('region', { name: /Missão em andamento: Pré-Gabinete/ })).toBeVisible();

    // O progresso sobrevive a um F5
    await page.reload();
    await page.getByRole('button', { name: 'Campanha', exact: true }).click();
    await expect(map(page).getByRole('button', { name: /Bancada Segura.*Concluída/ })).toBeVisible();
    await expect(map(page).getByRole('button', { name: /Pré-Gabinete.*Em andamento/ })).toBeVisible();
  });

  test('entregar sem cumprir os objetivos explica o que falta e não libera a próxima', async ({ page }) => {
    await freshStart(page);
    await page.evaluate(() => window.useAssemblyStore.getState().startCampaignMission('jornada-02'));
    const panel = page.getByRole('region', { name: /O Processador Já Foi Comprado/ });
    await panel.getByRole('button', { name: 'Entregar ao cliente' }).click();
    const debrief = page.getByRole('dialog', { name: 'Ainda não dá para entregar' });
    await expect(debrief).toContainText('Placa-mãe com soquete AM4');
    await debrief.getByRole('button', { name: 'Continuar a missão' }).click();
    await expect(panel).toBeVisible();
  });

  test('cada módulo de jogo tem a sua trilha de missões', async ({ page }) => {
    await freshStart(page);
    await page.getByRole('button', { name: 'Campanha', exact: true }).click();
    for (const track of ['Oficina Guiada', 'Jornada do Técnico', 'Laboratório de Diagnóstico', 'Mesa & Battlestation', 'Desafio em Grupos']) {
      await map(page).getByRole('navigation', { name: 'Módulos da campanha' }).getByRole('button', { name: new RegExp(track) }).click();
      await expect(map(page).getByRole('list', { name: new RegExp(track) }).getByRole('listitem')).not.toHaveCount(0);
    }
  });

  test('o botão de mudo fica salvo entre sessões (#28)', async ({ page }) => {
    await freshStart(page);
    await page.getByRole('button', { name: 'Silenciar o som' }).click();
    await expect(page.getByRole('button', { name: 'Ativar o som' })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Ativar o som' })).toBeVisible();
  });

  test('o professor só aceita códigos com selo válido (#29)', async ({ page }) => {
    await freshStart(page);
    const code = encodeValidationCode({ teamName: 'Equipe Azul', totalScore: 8400, timeSpentSeconds: 365 });
    await page.getByRole('button', { name: /Professor/ }).click();
    await page.getByRole('button', { name: /Validar Hash/ }).click();
    const input = page.getByPlaceholder('PCA-EQUIPE-PONTOS-TEMPO-SELO');

    await input.fill(code.replace(/-(\w+)-(\w+)-(\w+)$/, '-ZZZ-$2-$3'));
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'CÓDIGO INVÁLIDO' })).toBeVisible();

    await input.fill(code);
    await page.getByRole('button', { name: 'Verificar' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'CÓDIGO AUTÊNTICO' })).toContainText('EQUIPE AZUL');
    await page.getByRole('button', { name: 'Adicionar ao placar' }).click();
    await expect(page.getByRole('cell', { name: 'EQUIPE AZUL', exact: true })).toBeVisible();
  });
});
