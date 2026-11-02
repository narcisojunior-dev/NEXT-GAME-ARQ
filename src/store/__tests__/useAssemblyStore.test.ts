import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectCurrentPhase } from '../useAssemblyStore';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, STORAGES, GPUS, CASES, PSUS } from '../../engine/hardwareCatalog';
import { calculateTotalSpent } from '../../engine/compatibility';

const byId = <T extends { id: string }>(list: T[], id: string): T => list.find((x) => x.id === id)!;

const store = () => useAssemblyStore.getState();

const intelMb = byId(MOTHERBOARDS, 'mb-b760m-d5');
const atxMb = byId(MOTHERBOARDS, 'mb-z790-max');
const intelCpu = byId(CPUS, 'cpu-i5-13400f');
const amdCpu = byId(CPUS, 'cpu-r5-7600');
const amdMb = byId(MOTHERBOARDS, 'mb-b650m-am5');

describe('Store de montagem: integração das regras', () => {
  beforeEach(() => {
    store().resetAssembly();
  });

  describe('ESD', () => {
    it('bloqueia a placa-mãe e penaliza se a estática não foi descarregada', () => {
      store().installMotherboard(intelMb);
      expect(store().selectedMotherboard).toBeNull();
      expect(store().penaltiesCount).toBe(1);
      expect(store().activeAlert?.type).toBe('error');
    });

    it('permite a instalação após descarregar a estática', () => {
      store().dischargeEsd();
      store().installMotherboard(intelMb);
      expect(store().selectedMotherboard?.id).toBe(intelMb.id);
      expect(store().penaltiesCount).toBe(0);
    });
  });

  describe('Cooler e pasta térmica', () => {
    beforeEach(() => {
      store().dischargeEsd();
      store().installMotherboard(amdMb);
      store().installCpu(amdCpu);
    });

    it('recusa cooler incompatível com o soquete e penaliza', () => {
      const intelOnly = byId(COOLERS, 'cooler-intel-laminar');
      expect(store().installCooler(intelOnly)).toBe(false);
      expect(store().assembly.coolerInstalled).toBeNull();
      expect(store().penaltiesCount).toBe(1);
    });

    it('recusa pasta com o cooler já instalado e permite após remover o cooler', () => {
      store().installCooler(byId(COOLERS, 'cooler-deepcool-ag400'));
      store().connectCableTo('CPU_FAN_CABLE', 'CPU_FAN');
      store().applyThermalPaste();
      expect(store().assembly.thermalPasteApplied).toBe(false);
      expect(store().activeAlert?.type).toBe('error');

      store().removeCooler();
      expect(store().assembly.coolerInstalled).toBeNull();
      expect(store().assembly.coolerFanConnected).toBe(false);

      store().applyThermalPaste();
      expect(store().assembly.thermalPasteApplied).toBe(true);
    });

    it('remover o cooler exige pasta nova (a camada antiga fica comprometida)', () => {
      store().applyThermalPaste();
      store().installCooler(byId(COOLERS, 'cooler-deepcool-ag400'));
      store().removeCooler();
      expect(store().assembly.thermalPasteApplied).toBe(false);
    });
  });

  describe('Armazenamento', () => {
    beforeEach(() => {
      store().dischargeEsd();
      store().installMotherboard(intelMb);
    });

    it('recusa SSD SATA no slot M.2', () => {
      store().installStorage(byId(STORAGES, 'ssd-sata-480gb'), 'M2');
      expect(store().assembly.storageInstalled).toBeNull();
      expect(store().penaltiesCount).toBe(1);
    });

    it('aceita SSD SATA na baia SATA; só conta como ligado com dados E energia', () => {
      store().installPsu(PSUS[2]);
      store().installStorage(byId(STORAGES, 'ssd-sata-480gb'), 'SATA');
      expect(store().assembly.storageInstalled?.id).toBe('ssd-sata-480gb');
      expect(store().assembly.cableSataConnected).toBe(false);
      expect(store().connectCableTo('SATA_DATA', 'SATA_PORT').success).toBe(true);
      expect(store().assembly.cableSataConnected).toBe(false);
      expect(store().connectCableTo('SATA_POWER', 'DRIVE_POWER').success).toBe(true);
      expect(store().assembly.cableSataConnected).toBe(true);
    });

    it('trocar o disco desconecta os cabos SATA anteriores', () => {
      store().installPsu(PSUS[2]);
      store().installStorage(byId(STORAGES, 'ssd-sata-480gb'), 'SATA');
      store().connectCableTo('SATA_DATA', 'SATA_PORT');
      store().connectCableTo('SATA_POWER', 'DRIVE_POWER');
      store().installStorage(byId(STORAGES, 'ssd-nvme-1tb'), 'M2');
      expect(store().assembly.cableSataConnected).toBe(false);
      expect(store().cableConnections.SATA_DATA).toBeNull();
    });
  });

  describe('Gabinete', () => {
    beforeEach(() => {
      store().dischargeEsd();
    });

    it('recusa gabinete compacto para placa ATX', () => {
      store().installMotherboard(atxMb);
      store().installCase(byId(CASES, 'case-office-compact'));
      expect(store().assembly.caseInstalled).toBeNull();
      expect(store().penaltiesCount).toBe(1);
    });

    it('recusa GPU longa demais para o gabinete instalado', () => {
      store().installMotherboard(intelMb);
      store().installCase(byId(CASES, 'case-office-compact'));
      store().installGpu(byId(GPUS, 'gpu-rtx-4070-super'));
      expect(store().assembly.gpuInstalled).toBeNull();
      expect(store().penaltiesCount).toBe(1);
    });

    it('o custo do gabinete entra no total gasto da montagem', () => {
      const mesh = byId(CASES, 'case-gamer-mesh');
      store().installMotherboard(intelMb);
      store().installCase(mesh);
      expect(store().assembly.caseInstalled?.id).toBe(mesh.id);
      expect(calculateTotalSpent(store().assembly, store().selectedMotherboard)).toBe(intelMb.price + mesh.price);
    });
  });

  describe('Painel frontal (F_PANEL)', () => {
    it('reiniciar a montagem solta todos os conectores do painel frontal', () => {
      store().connectFPanelJumper('POWER_SW', [6, 8]);
      expect(store().fPanelConnections.POWER_SW).toEqual([6, 8]);
      store().resetAssembly();
      expect(store().fPanelConnections.POWER_SW).toBeNull();
    });

    it('casos de diagnóstico mostram no minigame os conectores que a montagem diz estarem ligados', () => {
      store().selectDiagnosticScenario('case-psu-switch');
      expect(store().fPanelConnections.POWER_SW).toEqual([6, 8]);

      store().selectDiagnosticScenario('case-power-sw-loose');
      expect(store().fPanelConnections.POWER_SW).toBeNull();
    });

    it('mover um conector encaixado para outro par libera os pinos antigos', () => {
      store().connectFPanelJumper('POWER_SW', [6, 8]);
      store().disconnectFPanelJumper('POWER_SW');
      expect(store().assembly.frontPanelPowerSwConnected).toBe(false);
      store().connectFPanelJumper('POWER_SW', [8, 6]);
      expect(store().fPanelConnections.POWER_SW).toEqual([8, 6]);
      expect(store().assembly.frontPanelPowerSwConnected).toBe(true);
    });
  });

  describe('Cabeamento', () => {
    beforeEach(() => {
      store().dischargeEsd();
      store().installMotherboard(intelMb);
      store().installPsu(PSUS[2]);
    });

    it('cabo no conector certo liga a flag da montagem', () => {
      const result = store().connectCableTo('ATX_24PIN', 'ATX_PWR');
      expect(result.success).toBe(true);
      expect(store().cableConnections.ATX_24PIN).toBe('ATX_PWR');
      expect(store().assembly.cableAtx24PinConnected).toBe(true);
    });

    it('cabo no conector errado é recusado; erro perigoso ainda penaliza', () => {
      store().installGpu(byId(GPUS, 'gpu-rtx-4060'));
      expect(store().connectCableTo('ATX_24PIN', 'HD_AUDIO').success).toBe(false);
      expect(store().penaltiesCount).toBe(0);

      expect(store().connectCableTo('EPS_8PIN', 'GPU_POWER').success).toBe(false);
      expect(store().penaltiesCount).toBe(1);
      expect(store().assembly.cableCpu8PinConnected).toBe(false);
    });

    it('cabo indisponível (peça ausente) não pode ser ligado', () => {
      expect(store().connectCableTo('FRONT_USB3', 'USB3_HEADER').success).toBe(false);
      expect(store().cableConnections.FRONT_USB3).toBeNull();
    });

    it('soltar um cabo desliga a flag; trocar a fonte solta os cabos dela', () => {
      store().connectCableTo('ATX_24PIN', 'ATX_PWR');
      store().disconnectCable('ATX_24PIN');
      expect(store().assembly.cableAtx24PinConnected).toBe(false);

      store().connectCableTo('EPS_8PIN', 'ATX12V');
      store().installPsu(PSUS[3]);
      expect(store().assembly.cableCpu8PinConnected).toBe(false);
    });

    it('cabos do gabinete ligam ventoinhas, USB e áudio frontais', () => {
      store().installCase(byId(CASES, 'case-gamer-mesh'));
      store().connectCableTo('CASE_FAN', 'SYS_FAN');
      store().connectCableTo('FRONT_USB3', 'USB3_HEADER');
      store().connectCableTo('FRONT_AUDIO', 'HD_AUDIO');
      expect(store().assembly).toMatchObject({ caseFansConnected: true, frontUsbConnected: true, frontAudioConnected: true });
    });

    it('casos de diagnóstico e reinício sincronizam os cabos com a montagem', () => {
      store().selectDiagnosticScenario('case-psu-switch');
      expect(store().cableConnections.ATX_24PIN).toBe('ATX_PWR');
      store().resetAssembly();
      expect(store().cableConnections.ATX_24PIN).toBeNull();
    });
  });

  describe('Fases', () => {
    it('a fase atual é derivada do estado e avança com a montagem', () => {
      expect(selectCurrentPhase(store())).toBe('PHASE_1_PREPARATION');
      store().dischargeEsd();
      expect(selectCurrentPhase(store())).toBe('PHASE_2_BENCH_ASSEMBLY');
      store().installMotherboard(intelMb);
      store().installCpu(intelCpu);
      store().toggleSocketLever();
      store().applyThermalPaste();
      store().installCooler(byId(COOLERS, 'cooler-deepcool-ag400'));
      store().connectCableTo('CPU_FAN_CABLE', 'CPU_FAN');
      store().installRam(2, byId(RAMS, 'ram-16gb-d5-dual'));
      expect(selectCurrentPhase(store())).toBe('PHASE_3_CASE_PREPARATION');
    });
  });
});
