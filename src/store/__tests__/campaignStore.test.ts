import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectMissionSession } from '../useAssemblyStore';
import { useProgressStore } from '../useProgressStore';
import { safeStateStorage, STORAGE_KEYS } from '../safeStorage';
import { CPUS, MOTHERBOARDS } from '../../engine/hardwareCatalog';
import { encodeValidationCode } from '../../engine/validationCode';

const store = () => useAssemblyStore.getState();
const progress = () => useProgressStore.getState();

describe('Store: campanha de missões', () => {
  beforeEach(() => {
    store().startFromScratch();
  });

  it('iniciar a missão do Diego carrega o PC montado e cabeado, com peças do cliente sem custo', () => {
    store().startCampaignMission('jornada-05');
    const s = store();
    expect(s.activeCampaignMissionId).toBe('jornada-05');
    expect(s.gameMode).toBe('MISSAO');
    expect(s.assembly.psuInstalled?.id).toBe('psu-generic-200w');
    expect(s.assembly.cableAtx24PinConnected).toBe(true);
    expect(s.campaignInventory?.purchasableCategories).toEqual(['PSU']);
    expect(s.campaignInventory?.clientPartIds).toContain('gpu-rx-6700xt');
  });

  it('missão de diagnóstico carrega o caso e conclui quando ele é resolvido', () => {
    store().startCampaignMission('diagnostico-01');
    expect(store().gameMode).toBe('DIAGNOSTICO');
    expect(store().activeDiagnosticScenario?.id).toBe('case-psu-switch');
    expect(store().finishCampaignMission()?.completed).toBe(false);
    useAssemblyStore.setState({ resolvedScenarioIds: ['case-psu-switch'] });
    expect(store().finishCampaignMission()?.completed).toBe(true);
    expect(progress().missionResults['diagnostico-01']?.stars).toBeGreaterThanOrEqual(1);
  });

  it('missão da mesa abre a visão da mesa com itens e o cabo de vídeo errado já ligados', () => {
    store().startCampaignMission('mesa-03');
    const s = store();
    expect(s.activeWorkbenchView).toBe('desk');
    expect(s.deskSetup.placedDeskItems.MONITOR_MAIN).toBeDefined();
    expect(s.deskSetup.placedDeskItems.MONITOR_ARM).toBeDefined();
    expect(s.externalCabling.connections.CABLE_DISPLAY?.sourcePort).toBe('MB_HDMI');
  });

  it('erros e tentativas de POST entram no retrato da sessão', () => {
    store().startCampaignMission('jornada-01');
    store().installMotherboard(MOTHERBOARDS.find((m) => m.id === 'mb-h610m-d4')!); // sem descarregar a estática
    store().triggerPostBoot();
    const session = selectMissionSession(store());
    expect(session.errorLog.some((t) => t.includes('Descarga Eletrostática'))).toBe(true);
    expect(session.postAttempts).toBe(0); // sem placa assentada o POST nem começa
  });

  it('missão não concluída não grava progresso nem libera a próxima', () => {
    store().startCampaignMission('jornada-02');
    const evaluation = store().finishCampaignMission();
    expect(evaluation?.completed).toBe(false);
    expect(progress().missionResults['jornada-02']).toBeUndefined();
    expect(store().missionDebrief?.missionId).toBe('jornada-02');
    store().closeMissionDebrief();
    expect(store().activeCampaignMissionId).toBe('jornada-02');
  });

  it('abandonar limpa o modo missão', () => {
    store().startCampaignMission('jornada-03');
    store().abandonCampaignMission();
    expect(store().activeCampaignMissionId).toBeNull();
    expect(store().campaignInventory).toBeNull();
  });
});

describe('Persistência (#30)', () => {
  beforeEach(() => {
    store().startFromScratch();
  });

  it('salva a montagem e restaura o caso de diagnóstico com as funções do motor', async () => {
    store().startCampaignMission('diagnostico-03');
    const saved = safeStateStorage.getItem(STORAGE_KEYS.assembly);
    expect(typeof saved).toBe('string');
    expect(String(saved)).toContain('case-ram-dram-led');

    // Simula uma nova sessão: o estado em memória se perde (e é salvo), depois o salvamento antigo volta
    useAssemblyStore.setState({ activeDiagnosticScenario: null, assembly: { ...store().assembly, cpuInstalled: null } });
    safeStateStorage.setItem(STORAGE_KEYS.assembly, String(saved));
    await useAssemblyStore.persist.rehydrate();
    expect(store().activeDiagnosticScenario?.id).toBe('case-ram-dram-led');
    expect(typeof store().activeDiagnosticScenario?.isResolved).toBe('function');
  });

  it('"Começar do zero" apaga montagem, progresso e placar salvos', () => {
    store().dischargeEsd();
    store().installMotherboard(MOTHERBOARDS[0]);
    store().installCpu(CPUS[0]);
    progress().recordMissionResult('jornada-01', { stars: 3, bestTimeSeconds: 100, completedAt: 'x' });
    store().startFromScratch();
    expect(store().selectedMotherboard).toBeNull();
    expect(progress().missionResults).toEqual({});
  });

  it('placar do professor aceita só códigos verificáveis e sem duplicata (#29)', () => {
    const code = encodeValidationCode({ teamName: 'Azul', totalScore: 8000, timeSpentSeconds: 300 });
    expect(progress().addLeaderboardCode(code)).toMatchObject({ ok: true });
    expect(progress().addLeaderboardCode(code)).toEqual({ ok: false, reason: 'DUPLICATE' });
    expect(progress().addLeaderboardCode('PCA-AZUL-1-1-000000')).toEqual({ ok: false, reason: 'SEAL' });
    expect(progress().leaderboard).toHaveLength(1);
  });
});
