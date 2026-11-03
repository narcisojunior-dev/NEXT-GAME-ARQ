import { test, expect } from '@playwright/test';

test.describe('Menu Lateral de Escolha de Componentes e Verificação do Painel Frontal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('renderiza o menu lateral de componentes ao lado da bancada e permite alternar abas e categorias', async ({ page }) => {
    // 1. O menu lateral de escolha de componentes deve estar visível
    const lateralMenu = page.locator('aside[aria-label="Menu Lateral de Escolha de Componentes e Cabeamento"]');
    await expect(lateralMenu).toBeVisible();

    // 2. Abas de Peças e Cabos no menu lateral
    const pecasTab = lateralMenu.getByRole('button', { name: /Peças/i });
    const cabosTab = lateralMenu.getByRole('button', { name: /Cabos/i });
    await expect(pecasTab).toBeVisible();
    await expect(cabosTab).toBeVisible();

    // 3. Testa alternar para a aba de Cabos
    await cabosTab.click();
    await expect(lateralMenu.getByRole('heading', { name: 'Cabos', exact: true })).toBeVisible();

    // 4. Retorna para a aba de Peças
    await pecasTab.click();

    // 5. Filtra por categoria "CPU"
    const cpuChip = lateralMenu.getByRole('button', { name: 'CPU', exact: true });
    await expect(cpuChip).toBeVisible();
    await cpuChip.click();

    // Deve exibir CPUs (ex: AMD Ryzen 5 5600)
    const cpuCard = lateralMenu.getByText('AMD Ryzen 5 5600').first();
    await expect(cpuCard).toBeVisible();

    // 6. Clica em "Usar" em um componente para pegá-lo na mão
    const usarBtn = lateralMenu.getByRole('button', { name: 'Usar' }).first();
    await usarBtn.click();

    // O banner de "Na Mão" deve aparecer no topo do menu lateral
    const naMaoBanner = lateralMenu.locator('text=Na Mão: Encaixe na Bancada ao Lado');
    await expect(naMaoBanner).toBeVisible();

    // Solta a peça
    const soltarBtn = lateralMenu.getByRole('button', { name: 'Soltar' });
    await soltarBtn.click();
    await expect(naMaoBanner).not.toBeVisible();
  });

  test('conecta o painel frontal via Q-Connector, verifica conexão e não solicita ligação novamente', async ({ page }) => {
    // 1. Abre o minigame de Zoom do Painel Frontal (F_PANEL)
    const fPanelBtn = page.getByRole('button', { name: /Ligar Painel Frontal \(F_PANEL\)/i });
    await expect(fPanelBtn).toBeVisible();
    await fPanelBtn.click();

    // 2. Modal do F_PANEL deve estar visível
    const modalHeading = page.locator('#fpanel-title');
    await expect(modalHeading).toBeVisible();

    // 3. Clica no botão de acessibilidade Q-Connector Rápido
    const qConnectorBtn = page.getByRole('button', { name: 'Q-Connector Rápido' });
    await expect(qConnectorBtn).toBeVisible();
    await qConnectorBtn.click();

    // 4. Deve exibir o banner verde de confirmação com botão de concluir
    const bannerSuccess = page.locator('text=Todos os 4 conectores do Painel Frontal ligados com perfeição!');
    await expect(bannerSuccess).toBeVisible();

    const concluirBtn = page.getByRole('button', { name: 'Concluir e Voltar à Bancada' });
    await expect(concluirBtn).toBeVisible();
    await concluirBtn.click();

    // 5. O modal deve ter fechado
    await expect(modalHeading).not.toBeVisible();

    // 6. O botão da bancada agora deve indicar "Painel Frontal Conectado ✓"
    const fPanelStatusBtn = page.getByRole('button', { name: /Painel Frontal Conectado/i });
    await expect(fPanelStatusBtn).toBeVisible();

    // 7. No Checklist de Montagem, o passo 10 do F_PANEL deve estar marcado como concluído
    const checklistStep = page.locator('text=10. Ligar Painel Frontal (F_PANEL)');
    await expect(checklistStep).toBeVisible();

    // 8. No Menu Lateral, na aba de Cabos, o Painel Frontal deve exibir LIGADO ✓ e não solicitar ligar de novo
    const lateralMenu = page.locator('aside[aria-label="Menu Lateral de Escolha de Componentes e Cabeamento"]');
    const cabosTab = lateralMenu.getByRole('button', { name: /Cabos/i });
    await cabosTab.click();

    const fPanelInTray = lateralMenu.locator('text=LIGADO ✓');
    await expect(fPanelInTray).toBeVisible();

    // Não deve conter botão de "Ligar" com estilo de pendência para o painel frontal
    const ligarBtnInCase = lateralMenu.locator('li:has-text("Painel frontal")').getByRole('button', { name: 'Ligar' });
    await expect(ligarBtnInCase).not.toBeVisible();

    // Deve oferecer apenas "Ver pinos"
    const verPinosBtn = lateralMenu.locator('li:has-text("Painel frontal")').getByRole('button', { name: 'Ver pinos' });
    await expect(verPinosBtn).toBeVisible();
  });
});
