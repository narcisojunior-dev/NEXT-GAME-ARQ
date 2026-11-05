import { test, expect } from '@playwright/test';
import { BUDGET_PROFILES, analyzeBudget, buildAssemblyFromIds } from '../src/engine/budgetChallenge';
import { findCatalogComponent } from '../src/engine/campaign';
import { calculateTotalSpent } from '../src/engine/compatibility';
import type { CaseComponent, GpuComponent, MotherboardComponent, StorageComponent } from '../src/engine/types';
import { UiBuild, assembleViaUi, powerOn, sidebar, snapshot } from './support/benchUi';

/**
 * Fluxo completo do sistema com as funcionalidades novas, só pela interface:
 * Desafio de Orçamento (mapa da campanha → prévia → briefing) → escolha da placa → montagem
 * completa na bancada 3D (saldo ao vivo e "cabe no saldo") → POST → entrega com detalhamento dos
 * pontos contra a referência → Abrir o PC → PC levado para a mesa.
 */
const PROFILE = 'JOGOS_1080P' as const;
const BUDGET = 5000;

const name = (id: string) => {
  const part = findCatalogComponent(id);
  if (!part) throw new Error(`peça ${id} fora do catálogo`);
  return part;
};

test('fluxo completo: Desafio de Orçamento do cliente até o PC na mesa (montando a melhor build possível)', async ({ page }) => {
  test.setTimeout(300_000);
  const profile = BUDGET_PROFILES[PROFILE];
  const analysis = analyzeBudget(BUDGET, profile.requirements, profile.resolution);
  const ref = analysis.reference!;
  const ids = ref.build;
  const mb = name(ids.motherboardId) as MotherboardComponent;
  const storage = name(ids.storageId) as StorageComponent;
  const pcCase = name(ids.caseId) as CaseComponent;
  const gpu = ids.gpuId ? (name(ids.gpuId) as GpuComponent) : null;
  const build: UiBuild = {
    motherboard: mb.name,
    integratedIo: mb.hasIntegratedIoShield,
    cpu: name(ids.cpuId).name,
    paste: 'Arctic MX-4 Alta Condutividade Carbono (8.5 W/mK)',
    cooler: name(ids.coolerId).name,
    ram: { name: name(ids.ramId).name, slots: ids.ramSlots },
    storage: { name: storage.name, kind: storage.storageType === 'NVMe_M2' ? 'M2' : 'SATA' },
    case: { name: pcCase.name, hasFans: pcCase.fansIncluded > 0 },
    psu: name(ids.psuId).name,
    gpu: gpu ? { name: gpu.name, needsPower: gpu.powerPins !== 'none' } : null,
  };

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as { useAssemblyStore?: unknown }).useAssemblyStore !== 'undefined');

  // 1. Campanha → trilha Desafio → Desafio de Orçamento com a prévia do analyzeBudget
  await page.getByRole('button', { name: 'Campanha' }).click();
  const map = page.getByRole('dialog', { name: 'Jornada do Técnico' });
  await map.getByRole('button', { name: /Desafio/ }).first().click();
  const setup = map.getByRole('region', { name: 'Desafio de Orçamento' });
  await setup.getByRole('radio', { name: new RegExp(profile.title) }).check();
  // Orçamento baixo demais: a prévia recusa
  await setup.getByRole('spinbutton', { name: 'Orçamento (R$)' }).fill('800');
  await expect(setup.getByRole('status')).toContainText('Abaixo do PC mais barato');
  await expect(setup.getByRole('button', { name: 'Começar Desafio de Orçamento' })).toBeDisabled();
  await setup.getByRole('spinbutton', { name: 'Orçamento (R$)' }).fill(String(BUDGET));
  await expect(setup.getByRole('status')).toContainText(`~${ref.avgFps} FPS`);
  await setup.getByRole('button', { name: 'Começar Desafio de Orçamento' }).click();

  // 2. Briefing e saldo ao vivo
  const missionPanel = page.getByRole('region', { name: /Missão em andamento: Desafio de Orçamento/ });
  await expect(missionPanel).toContainText(profile.client.name);
  await expect(page.getByRole('status').filter({ hasText: 'Saldo do cliente' })).toContainText(`R$ ${BUDGET.toLocaleString('pt-BR')}`);

  // 3. O cartão da peça mostra se cabe no saldo antes de instalar
  await sidebar(page).getByRole('textbox', { name: 'Buscar componente' }).fill(build.motherboard);
  await expect(sidebar(page).getByText(/Cabe no saldo/).first()).toBeVisible();

  // 4. Escolha da placa e montagem completa na bancada 3D
  await page.locator('button[title*="Modo 3D da Bancada"]').click();
  await assembleViaUi(page, build);
  const assembled = await snapshot(page);
  expect(calculateTotalSpent(assembled.assembly, assembled.mb)).toBe(ref.cost);
  expect(assembled.penalties).toBe(0);
  const spentRatio = ref.cost / BUDGET;
  const balance = page.getByRole('status').filter({ hasText: 'Saldo do cliente' });
  await expect(balance).toContainText(spentRatio >= 0.9 ? 'mais de 90% gasto' : `R$ ${(BUDGET - ref.cost).toLocaleString('pt-BR')}`);

  // 5. POST e entrega: igualar a referência sem penalidades no tempo-alvo vale 10.000
  await powerOn(page);
  await expect.poll(async () => (await snapshot(page)).post?.bootSuccess).toBe(true);
  await missionPanel.getByRole('button', { name: 'Entregar ao cliente' }).click();
  const debrief = page.getByRole('dialog', { name: /aprovou a entrega/ });
  await expect(debrief).toBeVisible();
  const points = debrief.getByRole('region', { name: /Pontuação do Desafio de Orçamento/ });
  await expect(points).toContainText('10.000 / 10.000');
  await expect(points.getByRole('table')).toContainText(`R$ ${ref.cost.toLocaleString('pt-BR')}`);
  await debrief.getByRole('button', { name: 'Voltar ao mapa' }).click();
  await page.getByRole('dialog', { name: 'Jornada do Técnico' }).getByRole('button', { name: 'Fechar campanha' }).click();

  // 6. Abrir o PC: os subsistemas da montagem do aluno
  await page.getByRole('button', { name: 'Abrir o PC' }).click({ noWaitAfter: true });
  const open = page.getByRole('region', { name: 'Abrir o PC' });
  await expect(open.getByRole('button', { name: 'Placa de vídeo', exact: true })).toHaveCount(gpu ? 1 : 0);
  await expect(open).toContainText('Temperatura da CPU');
  await open.getByRole('button', { name: 'Fechar o modo Abrir o PC' }).click({ noWaitAfter: true });

  // 7. O PC montado vai para a mesa
  await page.getByRole('button', { name: 'Mesa 3D' }).click();
  const desk = page.getByRole('complementary', { name: 'Inventário da mesa' });
  await desk.getByRole('button', { name: /^Pegar Mesa / }).first().click();
  await desk.getByRole('button', { name: 'Encaixar em: Mesa de Trabalho' }).click();
  await desk.getByRole('button', { name: 'Pegar Seu PC (montado na bancada) para posicionar' }).click();
  await desk.getByRole('button', { name: 'Encaixar em: Gabinete do PC (Torre)' }).click();
  await expect.poll(async () => (await snapshot(page)).desk.PC_TOWER?.itemId).toBe('student-pc');
});

test('saldo do cliente: estourar o orçamento muda cor, ícone e texto e zera o custo-benefício', async ({ page }) => {
  const profile = BUDGET_PROFILES.JOGOS_1080P;
  const analysis = analyzeBudget(BUDGET, profile.requirements, profile.resolution);
  await page.goto('/');
  await page.waitForFunction(() => typeof (window as unknown as { useAssemblyStore?: unknown }).useAssemblyStore !== 'undefined');
  await page.evaluate(
    (budget) =>
      (window as unknown as { useAssemblyStore: { getState: () => { startBudgetChallenge: (c: object) => unknown } } }).useAssemblyStore
        .getState()
        .startBudgetChallenge({ budget, profile: 'JOGOS_1080P', resolution: '1080p', targetTimeSeconds: 600 }),
    BUDGET
  );
  // Monta a referência e troca a GPU pela mais cara do catálogo
  const { assembly, motherboard } = buildAssemblyFromIds(analysis.reference!.build);
  const priciest = name('gpu-rtx-4090') as GpuComponent;
  await page.evaluate(
    ({ a, mb }) => (window as unknown as { useAssemblyStore: { setState: (s: object) => void } }).useAssemblyStore.setState({ assembly: a, selectedMotherboard: mb }),
    { a: { ...assembly, gpuInstalled: priciest }, mb: motherboard }
  );
  const balance = page.getByRole('status').filter({ hasText: 'Saldo do cliente' });
  await expect(balance).toContainText('Orçamento estourado em R$');
  await page.getByRole('region', { name: /Missão em andamento/ }).getByRole('button', { name: 'Entregar ao cliente' }).click();
  const points = page.getByRole('region', { name: /Pontuação do Desafio de Orçamento/ });
  await expect(points).toContainText('Não concluído');
  await expect(points).toContainText('Orçamento estourado em');
});
