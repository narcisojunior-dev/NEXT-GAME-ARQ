import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectCurrentPhase } from '../useAssemblyStore';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, STORAGES, GPUS, CASES } from '../../engine/hardwareCatalog';
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
      store().connectCoolerFan();
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

    it('aceita SSD SATA na baia SATA e conecta os cabos SATA', () => {
      store().installStorage(byId(STORAGES, 'ssd-sata-480gb'), 'SATA');
      expect(store().assembly.storageInstalled?.id).toBe('ssd-sata-480gb');
      expect(store().assembly.cableSataConnected).toBe(false);
      store().connectCable('SATA');
      expect(store().assembly.cableSataConnected).toBe(true);
    });

    it('trocar o disco desconecta os cabos SATA anteriores', () => {
      store().installStorage(byId(STORAGES, 'ssd-sata-480gb'), 'SATA');
      store().connectCable('SATA');
      store().installStorage(byId(STORAGES, 'ssd-nvme-1tb'), 'M2');
      expect(store().assembly.cableSataConnected).toBe(false);
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
      store().connectCoolerFan();
      store().installRam(2, byId(RAMS, 'ram-16gb-d5-dual'));
      expect(selectCurrentPhase(store())).toBe('PHASE_3_CASE_PREPARATION');
    });
  });
});
