import { describe, it, expect } from 'vitest';
import {
  CampaignMission,
  MissionPartsPreset,
  MissionSession,
  buildMissionInitialState,
  calculateMissionSpent,
  evaluateMission,
  getMissionStatus,
} from '../campaign';
import { CAMPAIGN_MISSIONS, CAMPAIGN_TRACKS, findMission, missionsOfTrack } from '../campaignMissions';
import { DIAGNOSTIC_SCENARIOS } from '../diagnosticCases';
import { createInitialExternalCablesState } from '../externalCabling';
import { AUDIO_DEVICES, DEFAULT_STUDENT_SETUP, MONITORS } from '../peripheralsCatalog';
import { REQUIRED_DESK_ITEMS, deskItem } from './fixtures/readyPc';

const mission = (id: string): CampaignMission => {
  const m = findMission(id);
  if (!m) throw new Error(`missão ${id} não existe`);
  return m;
};

/** Sessão com um PC montado e cabeado a partir das peças informadas */
function sessionWith(m: CampaignMission, parts: MissionPartsPreset, extra: Partial<MissionSession> = {}): MissionSession {
  const { assembly, motherboard } = buildMissionInitialState({ ...m.setup, installed: parts, prepared: 'FULL' });
  return {
    assembly: { ...assembly, thermalPasteApplied: true, coolerFanConnected: Boolean(assembly.coolerInstalled) },
    motherboard,
    elapsedSeconds: 200,
    penaltiesCount: 0,
    errorLog: [],
    postAttempts: 1,
    clientPartIds: m.setup.clientPartIds ?? [],
    placedDeskItems: {},
    externalCabling: createInitialExternalCablesState(),
    isDeskPoweredOn: false,
    resolvedScenarioIds: [],
    studentSetup: DEFAULT_STUDENT_SETUP,
    ...extra,
  };
}

const unmet = (m: CampaignMission, s: MissionSession) =>
  evaluateMission(m, s).required.filter((r) => !r.met).map((r) => r.objective.kind);

describe('Campanha: integridade dos dados', () => {
  it('cada módulo de jogo tem várias missões, numeradas 1..N sem buracos', () => {
    CAMPAIGN_TRACKS.forEach((track) => {
      const list = missionsOfTrack(track.id);
      expect(list.length, track.id).toBeGreaterThanOrEqual(4);
      expect(list.map((m) => m.order)).toEqual(list.map((_, i) => i + 1));
    });
  });

  it('ids únicos, pergunta de fixação válida e pelo menos um objetivo obrigatório', () => {
    const ids = CAMPAIGN_MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    CAMPAIGN_MISSIONS.forEach((m) => {
      expect(m.objectives.length, m.id).toBeGreaterThan(0);
      expect(m.question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(m.question.correctIndex).toBeLessThan(m.question.options.length);
    });
  });

  it('toda peça citada nas missões existe no catálogo e todo caso de diagnóstico existe', () => {
    const scenarios = new Set(DIAGNOSTIC_SCENARIOS.map((s) => s.id));
    CAMPAIGN_MISSIONS.forEach((m) => {
      expect(() => buildMissionInitialState(m.setup), m.id).not.toThrow();
      (m.setup.clientPartIds ?? []).forEach((id) => {
        expect(() => buildMissionInitialState({ gameMode: 'MISSAO', installed: { cpuId: id.startsWith('cpu') ? id : undefined } })).not.toThrow();
      });
      if (m.setup.diagnosticScenarioId) expect(scenarios.has(m.setup.diagnosticScenarioId), m.id).toBe(true);
    });
  });

  it('peças do cliente não entram no orçamento', () => {
    const m = mission('jornada-05');
    const s = sessionWith(m, { ...m.setup.installed, psuId: 'psu-650w-bronze' });
    expect(calculateMissionSpent(s.assembly, s.motherboard, s.clientPartIds)).toBe(360);
  });
});

describe('Campanha: desbloqueio sequencial (LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED)', () => {
  const track = missionsOfTrack('JORNADA');
  const [m1, m2, m3] = track;

  it('a primeira missão está disponível e as demais bloqueadas', () => {
    const done = new Set<string>();
    expect(getMissionStatus(m1, track, done, null)).toBe('AVAILABLE');
    expect(getMissionStatus(m2, track, done, null)).toBe('LOCKED');
  });

  it('concluir a N libera só a N+1', () => {
    const done = new Set([m1.id]);
    expect(getMissionStatus(m1, track, done, null)).toBe('COMPLETED');
    expect(getMissionStatus(m2, track, done, null)).toBe('AVAILABLE');
    expect(getMissionStatus(m3, track, done, null)).toBe('LOCKED');
  });

  it('missão ativa aparece em andamento; o modo professor libera todas', () => {
    expect(getMissionStatus(m2, track, new Set([m1.id]), m2.id)).toBe('IN_PROGRESS');
    expect(getMissionStatus(m3, track, new Set(), null, true)).toBe('AVAILABLE');
  });

  it('o progresso de um módulo não libera missões de outro', () => {
    const diag = missionsOfTrack('DIAGNOSTICO');
    expect(getMissionStatus(diag[1], diag, new Set([m1.id, m2.id]), null)).toBe('LOCKED');
  });
});

describe('Campanha: a referência conclui e a armadilha falha na lição (RNF11)', () => {
  it('Jornada 02 — soquete: placa AM4 conclui; H610M (LGA1700) falha', () => {
    const m = mission('jornada-02');
    const ok = sessionWith(m, { motherboardId: 'mb-gigabyte-b550m-ds3h', cpuId: 'cpu-r5-4600g', coolerId: 'cooler-box-stock', ramId: 'ram-8gb-d4-single', storageId: 'ssd-sata-480gb', psuId: 'psu-500w-white', caseId: 'case-office-compact' });
    expect(evaluateMission(m, ok).completed).toBe(true);
    const trap = sessionWith(m, { motherboardId: 'mb-h610m-d4', cpuId: 'cpu-r5-4600g', coolerId: 'cooler-box-stock', ramId: 'ram-8gb-d4-single', storageId: 'ssd-sata-480gb', psuId: 'psu-500w-white', caseId: 'case-office-compact' });
    expect(unmet(m, trap)).toContain('SOCKET');
  });

  it('Jornada 03 — DDR5 dual conclui; pente DDR5 único falha no dual channel', () => {
    const m = mission('jornada-03');
    const base = { motherboardId: 'mb-msi-b650m-mortar', cpuId: 'cpu-r5-7600', coolerId: 'cooler-box-stock', storageId: 'ssd-sata-480gb', psuId: 'psu-500w-white', caseId: 'case-office-compact' };
    expect(evaluateMission(m, sessionWith(m, { ...base, ramId: 'ram-16gb-d5-dual' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...base, ramId: 'ram-16gb-d5-single' }))).toContain('DUAL_CHANNEL');
  });

  it('Jornada 04 — i3-12100 com vídeo integrado conclui; i3-12100F falha (tela preta)', () => {
    const m = mission('jornada-04');
    const base = { motherboardId: 'mb-h610m-d4', ramId: 'ram-8gb-d4-single', storageId: 'ssd-sata-480gb', psuId: 'psu-500w-white', caseId: 'case-office-compact', coolerId: 'cooler-intel-laminar' };
    expect(evaluateMission(m, sessionWith(m, { ...base, cpuId: 'cpu-i3-12100' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...base, cpuId: 'cpu-i3-12100f' }))).toContain('INTEGRATED_VIDEO');
  });

  it('Jornada 05 — fonte de 650 W conclui; 550 W falha na recomendação da GPU', () => {
    const m = mission('jornada-05');
    expect(evaluateMission(m, sessionWith(m, { ...m.setup.installed, psuId: 'psu-650w-bronze' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...m.setup.installed, psuId: 'psu-coolermaster-550w' }))).toContain('PSU_RECOMMENDED');
  });

  it('Jornada 06 — Peerless Assassin conclui; Intel Laminar superaquece', () => {
    const m = mission('jornada-06');
    expect(evaluateMission(m, sessionWith(m, { ...m.setup.installed, coolerId: 'cooler-thermalright-peerless' })).completed).toBe(true);
    const trap = unmet(m, sessionWith(m, { ...m.setup.installed, coolerId: 'cooler-intel-laminar' }));
    expect(trap).toEqual(expect.arrayContaining(['COOLER_OK', 'CPU_TEMP_MAX']));
  });

  it('Jornada 08 — B550M + RX 6600 cabe e passa de 120 FPS; GTX 1650 cabe mas não chega', () => {
    const m = mission('jornada-08');
    const base = { motherboardId: 'mb-gigabyte-b550m-ds3h', cpuId: 'cpu-r5-5600', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-nvme-1tb', psuId: 'psu-coolermaster-550w', coolerId: 'cooler-box-stock', caseId: 'case-office-compact' };
    expect(evaluateMission(m, sessionWith(m, { ...base, gpuId: 'gpu-rx-6600' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...base, gpuId: 'gpu-gtx-1650' }))).toContain('FPS_MIN');
    expect(unmet(m, sessionWith(m, { ...base, gpuId: 'gpu-rtx-3060-12gb' }))).toContain('FITS_CASE');
  });

  it('Jornada 09 — PC equilibrado conclui; GPU fraca demais cria gargalo', () => {
    const m = mission('jornada-09');
    const base = { motherboardId: 'mb-gigabyte-b550m-ds3h', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-sata-480gb', psuId: 'psu-650w-bronze', caseId: 'case-gamer-mesh', coolerId: 'cooler-box-stock' };
    expect(evaluateMission(m, sessionWith(m, { ...base, cpuId: 'cpu-r5-3600', gpuId: 'gpu-rx-6700xt' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...base, cpuId: 'cpu-r5-5600', gpuId: 'gpu-rtx-4060' }))).toContain('BOTTLENECK_MAX');
  });

  it('Jornada 10 — NVMe rápido conclui; HD de 2 TB falha na velocidade', () => {
    const m = mission('jornada-10');
    expect(evaluateMission(m, sessionWith(m, { ...m.setup.installed, storageId: 'ssd-nvme-1tb' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...m.setup.installed, storageId: 'hdd-seagate-2tb' }))).toContain('STORAGE_MIN');
  });

  it('Jornada 11 — trocar só a GPU dobra o desempenho; RTX 3060 fica abaixo da fonte recomendada', () => {
    const m = mission('jornada-11');
    expect(evaluateMission(m, sessionWith(m, { ...m.setup.installed, gpuId: 'gpu-rtx-4060' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...m.setup.installed, gpuId: 'gpu-rtx-3060-12gb' }))).toContain('PSU_RECOMMENDED');
    expect(unmet(m, sessionWith(m, m.setup.installed ?? {}))).toContain('SCORE_MIN');
  });

  it('Jornada 12 — monitor de 75 Hz + headset conclui; 180 Hz num PC de 58 FPS falha', () => {
    const m = mission('jornada-12');
    const coherent = { ...DEFAULT_STUDENT_SETUP, monitor: MONITORS[0], audio: AUDIO_DEVICES[1] };
    expect(evaluateMission(m, sessionWith(m, m.setup.installed ?? {}, { studentSetup: coherent })).completed).toBe(true);
    const trap = { ...DEFAULT_STUDENT_SETUP, monitor: MONITORS[1], audio: AUDIO_DEVICES[0] };
    expect(unmet(m, sessionWith(m, m.setup.installed ?? {}, { studentSetup: trap }))).toEqual(
      expect.arrayContaining(['MONITOR_REFRESH_COHERENT', 'HEADSET'])
    );
  });

  it('Jornada 13 — prova final: a referência conclui; Ryzen 9 + RTX 4060 não chega a 120 FPS em 1440p', () => {
    const m = mission('jornada-13');
    const base = { motherboardId: 'mb-b650m-am5', ramId: 'ram-corsair-32gb-d5', storageId: 'ssd-kingston-kc3000-2tb', psuId: 'psu-750w-gold', caseId: 'case-corsair-4000d', coolerId: 'cooler-thermalright-peerless' };
    expect(evaluateMission(m, sessionWith(m, { ...base, cpuId: 'cpu-r7-7800x3d', gpuId: 'gpu-rx-7800xt' })).completed).toBe(true);
    expect(unmet(m, sessionWith(m, { ...base, cpuId: 'cpu-r9-7950x', gpuId: 'gpu-rtx-4060' }))).toContain('FPS_MIN');
    expect(unmet(m, sessionWith(m, { ...base, cpuId: 'cpu-r7-7800x3d', gpuId: 'gpu-rx-7800xt' }, { postAttempts: 2 }))).toContain('POST_FIRST_TRY');
  });

  it('Desafios Bronze a Platina são alcançáveis dentro do orçamento', () => {
    const builds: Record<string, MissionPartsPreset> = {
      'desafio-01': { motherboardId: 'mb-h610m-d4', cpuId: 'cpu-i3-12100', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-sata-480gb', psuId: 'psu-500w-white', caseId: 'case-office-compact', coolerId: 'cooler-intel-laminar', gpuId: 'gpu-gtx-1650' },
      'desafio-02': { motherboardId: 'mb-gigabyte-b550m-ds3h', cpuId: 'cpu-r5-5600', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-nvme-1tb', psuId: 'psu-500w-white', caseId: 'case-gamer-mesh', coolerId: 'cooler-deepcool-ag400', gpuId: 'gpu-rx-6600' },
      'desafio-03': { motherboardId: 'mb-gigabyte-b550m-ds3h', cpuId: 'cpu-r5-5600', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-nvme-1tb', psuId: 'psu-650w-bronze', caseId: 'case-gamer-mesh', coolerId: 'cooler-deepcool-ag400', gpuId: 'gpu-rx-6700xt' },
      'desafio-04': { motherboardId: 'mb-b650m-am5', cpuId: 'cpu-r5-7600', ramId: 'ram-16gb-d5-dual', storageId: 'ssd-nvme-1tb', psuId: 'psu-750w-gold', caseId: 'case-corsair-4000d', coolerId: 'cooler-deepcool-ag400', gpuId: 'gpu-rx-7800xt' },
    };
    Object.entries(builds).forEach(([id, parts]) => {
      const evaluation = evaluateMission(mission(id), sessionWith(mission(id), parts));
      expect(evaluation.required.filter((r) => !r.met).map((r) => r.label), id).toEqual([]);
    });
  });

  it('Mesa 03 — vídeo na placa-mãe não conclui; vídeo na GPU com a estação ligada conclui', () => {
    const m = mission('mesa-03');
    const desk = { ...REQUIRED_DESK_ITEMS, MONITOR_ARM: deskItem('MONITOR_ARM', 'STAND') };
    const cables = { ...createInitialExternalCablesState().connections, ...m.setup.desk?.cables };
    const base = sessionWith(m, m.setup.installed ?? {}, { placedDeskItems: desk, isDeskPoweredOn: true, externalCabling: { connections: cables } });
    expect(unmet(m, base)).toContain('MONITOR_SIGNAL');
    const fixed = { connections: { ...cables, CABLE_DISPLAY: { sourcePort: 'GPU_HDMI_1' as const, destPort: 'MONITOR_HDMI_IN' as const } } };
    expect(evaluateMission(m, { ...base, externalCabling: fixed }).completed).toBe(true);
  });

  it('Diagnóstico — só conclui com o caso resolvido; estrelas pelos bônus', () => {
    const m = mission('diagnostico-01');
    const s = sessionWith(m, {}, { resolvedScenarioIds: [] });
    expect(evaluateMission(m, s).completed).toBe(false);
    expect(evaluateMission(m, { ...s, resolvedScenarioIds: ['case-psu-switch'], elapsedSeconds: 100 }).stars).toBe(3);
    expect(evaluateMission(m, { ...s, resolvedScenarioIds: ['case-psu-switch'], penaltiesCount: 2, elapsedSeconds: 900 }).stars).toBe(1);
  });

  it('Jornada 01 — erro de estática registrado reprova a missão de segurança', () => {
    const m = mission('jornada-01');
    const parts = { motherboardId: 'mb-h610m-d4', cpuId: 'cpu-i3-12100', ramId: 'ram-8gb-d4-single', storageId: 'ssd-nvme-1tb', psuId: 'psu-500w-white', coolerId: 'cooler-intel-laminar', caseId: 'case-office-compact' };
    expect(evaluateMission(m, sessionWith(m, parts)).completed).toBe(true);
    expect(unmet(m, sessionWith(m, parts, { errorLog: ['Risco de Descarga Eletrostática (ESD)!'] }))).toContain('NO_ERROR');
  });
});
