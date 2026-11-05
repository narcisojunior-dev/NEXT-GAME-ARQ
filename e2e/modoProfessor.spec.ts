import { test, expect, Page, Browser } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BUDGET_PROFILES, analyzeBudget, buildAssemblyFromIds } from '../src/engine/budgetChallenge';
import './support/windowStores';

/**
 * Modo Professor ponta a ponta (#80): um professor e duas bancadas em navegadores separados.
 * Criar conta → turma → Desafio de Orçamento → alunos entram pelo link e pelo botão do HUD →
 * montam e enviam → ranking na ordem certa → aluno vê a própria posição → encerrar → destaques,
 * relatório, CSV e telão. Roda com CLASSROOM_REPO=memory (playwright.config.ts).
 */
const BUDGET = 5000;
const profile = BUDGET_PROFILES.JOGOS_1080P;
const reference = analyzeBudget(BUDGET, profile.requirements, profile.resolution).reference!;
const refBuild = buildAssemblyFromIds(reference.build);

async function newPage(browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  return context.newPage();
}

async function waitStores(page: Page) {
  await page.waitForFunction(() => typeof window.useClassroomStore !== 'undefined');
}

/**
 * A bancada já montada com a build de referência (a montagem pela interface tem testes próprios).
 * 50 s de montagem: dentro da janela do servidor (desde a entrada) e acima do mínimo de 45 s.
 */
async function assembleReference(page: Page, penalties: number) {
  await page.evaluate(
    ({ assembly, mb, penalties }) =>
      window.useAssemblyStore.setState({ assembly: { ...assembly, psuSwitchOn: true }, selectedMotherboard: mb, elapsedSeconds: 50, penaltiesCount: penalties, missionErrorLog: penalties ? ['Encaixe Perigoso!'] : [] }),
    { assembly: refBuild.assembly, mb: refBuild.motherboard, penalties }
  );
}

test('professor e duas bancadas: turma, Desafio de Orçamento, envios, ranking, relatório, CSV e telão', async ({ browser }) => {
  test.setTimeout(240_000);
  const username = `prof${Date.now().toString(36)}`;

  // 1. Professor cria a conta: código de recuperação exibido uma vez
  const prof = await newPage(browser);
  await prof.goto('/professor');
  await prof.getByRole('tab', { name: 'Criar conta' }).click();
  await prof.getByLabel('Seu nome').fill('Profa. Ana');
  await prof.getByLabel('Usuário').fill(username);
  await prof.getByLabel('Senha').fill('senha-forte-1');
  await prof.getByRole('button', { name: 'Criar conta de professor' }).click();
  await expect(prof.getByRole('heading', { name: 'Guarde o seu código de recuperação' })).toBeVisible();
  await expect(prof.getByText(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)).toBeVisible();
  await expect(prof.getByRole('button', { name: 'Ir para as minhas turmas' })).toBeDisabled();
  await prof.getByLabel('Anotei o código em um lugar seguro').check();
  await prof.getByRole('button', { name: 'Ir para as minhas turmas' }).click();

  // 2. Turma e atividade do Modo Orçamento com a prévia de viabilidade
  await prof.getByLabel('Nome da turma').fill('1º Ano B — Informática');
  await prof.getByRole('button', { name: 'Criar turma' }).click();
  await expect(prof.getByRole('heading', { name: '1º Ano B — Informática' })).toBeVisible();
  const code = (await prof.locator('p[aria-label^="Código "]').textContent())!.trim();
  expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
  await prof.getByText('Nova atividade').click();
  const form = prof.getByRole('form', { name: 'Nova atividade' });
  await form.getByLabel('Cliente (perfil)').selectOption('JOGOS_1080P');
  await form.getByLabel('Orçamento (R$)').fill('800');
  await expect(form.getByText(/Abaixo do PC mais barato/)).toBeVisible();
  await expect(form.getByRole('button', { name: 'Criar atividade (rascunho)' })).toBeDisabled();
  await form.getByLabel('Orçamento (R$)').fill(String(BUDGET));
  await expect(form.getByText(`~${reference.avgFps} FPS`, { exact: false })).toBeVisible();
  await form.getByText('Mais opções').click();
  await form.getByLabel('Quem vê o ranking').selectOption('AO_VIVO');
  await form.getByRole('button', { name: 'Criar atividade (rascunho)' }).click();
  await expect(prof.getByText(/criada como rascunho/)).toBeVisible();
  await prof.getByRole('button', { name: 'Ativar' }).click();
  await expect(prof.getByText(/ativa: os alunos recebem/)).toBeVisible();

  // 3. Bancada 1 entra pelo link da turma (/t/CODIGO)
  const ana = await newPage(browser);
  await ana.goto(`/t/${code}`);
  await waitStores(ana);
  const joinAna = ana.getByRole('dialog', { name: 'Entrar na turma' });
  await expect(joinAna.getByLabel('Código da turma')).toHaveValue(code);
  await joinAna.getByLabel('Apelido da bancada').fill('Ana – Bancada 1');
  await joinAna.getByRole('button', { name: 'Entrar' }).click();
  const bannerAna = ana.getByRole('region', { name: /^Turma / });
  await expect(bannerAna).toContainText('Orçamento: Gamer Iniciante');
  await bannerAna.getByRole('button', { name: 'Começar atividade' }).click();
  await expect(ana.getByRole('region', { name: /Missão em andamento: Desafio de Orçamento/ })).toBeVisible();

  // 4. Bancada 2 entra pelo botão do HUD, digitando o código
  const leo = await newPage(browser);
  await leo.goto('/');
  await waitStores(leo);
  await leo.getByRole('button', { name: 'Entrar na turma' }).click();
  const joinLeo = leo.getByRole('dialog', { name: 'Entrar na turma' });
  await joinLeo.getByLabel('Código da turma').fill(code.toLowerCase());
  await joinLeo.getByLabel('Apelido da bancada').fill('ana – bancada 1');
  await joinLeo.getByRole('button', { name: 'Entrar' }).click();
  await expect(joinLeo.getByRole('alert')).toContainText('Esse apelido já está na turma');
  await joinLeo.getByLabel('Apelido da bancada').fill('Léo – Bancada 2');
  await joinLeo.getByRole('button', { name: 'Entrar' }).click();
  const bannerLeo = leo.getByRole('region', { name: /^Turma / });
  await bannerLeo.getByRole('button', { name: 'Começar atividade' }).click();

  // 5. O painel ao vivo mostra as duas bancadas
  await expect(prof.getByRole('list', { name: 'Bancadas' }).getByRole('listitem')).toHaveCount(2, { timeout: 15000 });

  // 6. Envios: a referência sem erros vale 10.000; com 2 penalidades, 9.000
  await assembleReference(ana, 0);
  await bannerAna.getByRole('button', { name: 'Enviar resultado' }).click();
  await expect(bannerAna).toContainText('Pontuação oficial: 10.000 / 10.000 · concluído');
  await expect(bannerAna).toContainText('Você está em 1º de 1');
  await assembleReference(leo, 2);
  await bannerLeo.getByRole('button', { name: 'Enviar resultado' }).click();
  await expect(bannerLeo).toContainText('Pontuação oficial: 9.000 / 10.000');
  await expect(bannerLeo).toContainText('Você está em 2º de 2');
  await expect(bannerLeo.getByRole('list', { name: 'Top 10 da atividade' })).toContainText('1º Ana – Bancada 1 — 10.000');

  // 7. Ranking ao vivo na ordem certa e telão
  const ranking = prof.getByRole('table').filter({ hasText: 'Ranking da atividade ativa' });
  await expect(ranking.getByRole('row')).toHaveCount(3, { timeout: 15000 });
  await expect(ranking.getByRole('rowheader').first()).toContainText('Ana – Bancada 1');
  await prof.getByRole('link', { name: 'Projetar no telão' }).click();
  await expect(prof.getByRole('list', { name: 'Pódio' })).toContainText('Ana – Bancada 1');
  await expect(prof.getByText(code).first()).toBeVisible();
  await prof.getByRole('link', { name: 'Sair do telão' }).click();

  // 8. Encerrar: destaques, relatório e CSV
  await prof.getByRole('button', { name: 'Encerrar' }).click();
  await expect(prof.getByText(/encerrada\./)).toBeVisible();
  await prof.getByRole('link', { name: 'Resultados' }).click();
  await expect(prof.getByRole('region', { name: 'Destaques' })).toContainText('🎯 Montagem limpa (zero penalidades)');
  await expect(prof.getByRole('region', { name: 'Destaques' })).toContainText('Ana – Bancada 1');
  await expect(prof.getByRole('region', { name: 'Erros mais comuns da turma' })).toBeVisible();
  const download = prof.waitForEvent('download');
  await prof.getByRole('link', { name: 'Baixar planilha (CSV)' }).click();
  const csv = readFileSync(await (await download).path(), 'utf8');
  expect(csv).toContain('Apelido;Posição;Pontuação');
  expect(csv).toMatch(/Ana – Bancada 1;1;10000;sim;/);
  expect(csv).toMatch(/Léo – Bancada 2;2;9000;sim;/);

  // 9. Depois de encerrar, o aluno não envia mais
  await assembleReference(ana, 0);
  await bannerAna.getByRole('button', { name: 'Atualizar a atividade da turma' }).click();
  await expect(bannerAna).toContainText('aguardando o professor ativar uma atividade', { timeout: 20000 });
});

test('o link do painel do professor exige login e a turma inexistente é explicada ao aluno', async ({ page }) => {
  await page.goto('/professor/turmas');
  await expect(page).toHaveURL(/\/professor$/);
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await page.goto('/t/ZZZZZZ');
  await waitStores(page);
  const dialog = page.getByRole('dialog', { name: 'Entrar na turma' });
  await dialog.getByLabel('Apelido da bancada').fill('Bia');
  await dialog.getByRole('button', { name: 'Entrar' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Turma não encontrada');
});
