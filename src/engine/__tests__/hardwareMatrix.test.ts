import { describe, it, expect } from 'vitest';
import {
  CPUS,
  MOTHERBOARDS,
  RAMS,
  COOLERS,
  THERMAL_PASTES,
  GPUS,
  STORAGES,
  PSUS,
  CASES,
  CLIENT_MISSIONS,
} from '../hardwareCatalog';
import {
  MONITORS,
  KEYBOARDS,
  MICE,
  MONITOR_STANDS,
  AUDIO_DEVICES,
  GAMEPADS,
  CASE_THEMES,
} from '../peripheralsCatalog';
import {
  validateSocket,
  validateRamType,
  validateCoolerSocket,
  validateCoolerCapacity,
  validateCaseFormFactor,
  validateGpuLength,
  validateStorageSlot,
  validateThermalPasteApplication,
  validateEsdDischarged,
  evaluatePostTest,
  calculateTotalSpent,
} from '../compatibility';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { AssemblyState, CpuSocket, RamType } from '../types';
import { useAssemblyStore } from '../../store/useAssemblyStore';
import { calculateBenchmark } from '../benchmark';

describe('Matriz Combinatória de Hardware e Integridade do Jogo', () => {
  describe('1. Integridade de Catálogo e Dados de Hardware', () => {
    it('todas as CPUs possuem atributos válidos, TDP positivo e soquete definido', () => {
      expect(CPUS.length).toBeGreaterThan(0);
      const ids = new Set<string>();

      for (const cpu of CPUS) {
        expect(ids.has(cpu.id), `ID duplicado: ${cpu.id}`).toBe(false);
        ids.add(cpu.id);
        expect(cpu.name).toBeTruthy();
        expect(cpu.price).toBeGreaterThan(0);
        expect(cpu.tdpWatts).toBeGreaterThan(0);
        expect(['AM4', 'AM5', 'LGA1700']).toContain(cpu.socket);
        expect(cpu.cores).toBeGreaterThan(0);
        expect(cpu.threads).toBeGreaterThanOrEqual(cpu.cores);
        expect(typeof cpu.hasIntegratedGpu).toBe('boolean');
        expect(cpu.supportedRam.length).toBeGreaterThan(0);
      }
    });

    it('todas as Placas-Mãe possuem dimensões, soquetes e suporte de RAM consistentes', () => {
      expect(MOTHERBOARDS.length).toBeGreaterThan(0);
      const ids = new Set<string>();

      for (const mb of MOTHERBOARDS) {
        expect(ids.has(mb.id), `ID duplicado: ${mb.id}`).toBe(false);
        ids.add(mb.id);
        expect(mb.price).toBeGreaterThan(0);
        expect(['AM4', 'AM5', 'LGA1700']).toContain(mb.socket);
        expect(['ATX', 'Micro-ATX', 'Mini-ITX']).toContain(mb.formFactor);
        expect(['DDR4', 'DDR5']).toContain(mb.supportedRam);
        expect(mb.ramSlotsCount).toBeGreaterThanOrEqual(2);
      }
    });

    it('todas as memórias RAM possuem capacidades, módulos e frequências válidas', () => {
      expect(RAMS.length).toBeGreaterThan(0);
      for (const ram of RAMS) {
        expect(ram.price).toBeGreaterThan(0);
        expect(['DDR4', 'DDR5']).toContain(ram.ramType);
        expect(ram.capacityGb).toBeGreaterThan(0);
        expect([1, 2, 4]).toContain(ram.moduleCount);
        expect(ram.frequencyMhz).toBeGreaterThan(2000);
      }
    });

    it('todos os coolers cobrem soquetes reais e possuem TDP máximo coerente', () => {
      expect(COOLERS.length).toBeGreaterThan(0);
      for (const cooler of COOLERS) {
        expect(cooler.price).toBeGreaterThan(0);
        expect(cooler.maxTdpWatts).toBeGreaterThan(40);
        expect(['Air', 'Water']).toContain(cooler.coolerType);
        expect(cooler.supportedSockets.length).toBeGreaterThan(0);
      }
    });

    it('todas as GPUs possuem especificações de comprimento, TDP e VRAM válidas', () => {
      expect(GPUS.length).toBeGreaterThan(0);
      for (const gpu of GPUS) {
        expect(gpu.price).toBeGreaterThan(0);
        expect(gpu.tdpWatts).toBeGreaterThan(0);
        expect(gpu.lengthMm).toBeGreaterThan(100);
        expect(gpu.vramGb).toBeGreaterThan(0);
        expect(gpu.requiredPsuWatts).toBeGreaterThanOrEqual(gpu.tdpWatts);
      }
    });

    it('todos os gabinetes suportam placas e possuem limites físicos válidos', () => {
      expect(CASES.length).toBeGreaterThan(0);
      for (const pcCase of CASES) {
        expect(pcCase.price).toBeGreaterThan(0);
        expect(pcCase.maxGpuLengthMm).toBeGreaterThan(200);
        expect(pcCase.supportedFormFactors.length).toBeGreaterThan(0);
      }
    });

    it('todas as fontes possuem potência e certificações elétricas adequadas', () => {
      expect(PSUS.length).toBeGreaterThan(0);
      for (const psu of PSUS) {
        expect(psu.price).toBeGreaterThan(0);
        expect(psu.wattage).toBeGreaterThanOrEqual(200);
        expect(psu.efficiencyRating).toBeTruthy();
      }
    });
  });

  describe('2. Integridade do Catálogo de Periféricos', () => {
    it('todos os periféricos possuem categorias, nomes, preços e especificações técnicas', () => {
      const catalogs = [
        { name: 'Monitores', items: MONITORS },
        { name: 'Teclados', items: KEYBOARDS },
        { name: 'Mouses', items: MICE },
        { name: 'Suportes', items: MONITOR_STANDS },
        { name: 'Áudio', items: AUDIO_DEVICES },
        { name: 'Gamepads', items: GAMEPADS },
        { name: 'Temas de Gabinete', items: CASE_THEMES },
      ];

      for (const cat of catalogs) {
        expect(cat.items.length, `${cat.name} vazio`).toBeGreaterThan(0);
        for (const item of cat.items) {
          expect(item.id).toBeTruthy();
          expect(item.name).toBeTruthy();
          expect(item.price).toBeGreaterThanOrEqual(0);
          expect(Object.keys(item.specs).length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('3. Matriz Exaustiva de Compatibilidade Física e Lógica', () => {
    it('valida o soquete para TODAS as combinações possíveis de CPU x Placa-Mãe', () => {
      let matchCount = 0;
      let mismatchCount = 0;

      for (const cpu of CPUS) {
        for (const mb of MOTHERBOARDS) {
          const issue = validateSocket(cpu, mb);
          if (cpu.socket === mb.socket) {
            expect(issue, `Deveria ser compatível: ${cpu.name} no soquete ${mb.name}`).toBeNull();
            matchCount++;
          } else {
            expect(issue, `Deveria ser incompatível: ${cpu.name} (${cpu.socket}) em ${mb.name} (${mb.socket})`).not.toBeNull();
            expect(issue?.type).toBe('ERROR');
            mismatchCount++;
          }
        }
      }

      expect(matchCount).toBeGreaterThan(0);
      expect(mismatchCount).toBeGreaterThan(0);
    });

    it('valida o tipo de memória para TODAS as combinações de RAM x Placa-Mãe', () => {
      let matchCount = 0;
      let mismatchCount = 0;

      for (const ram of RAMS) {
        for (const mb of MOTHERBOARDS) {
          const issue = validateRamType(ram, mb);
          const isSupported = mb.supportedRam === ram.ramType;

          if (isSupported) {
            expect(issue, `RAM ${ram.ramType} deveria ser aceita na placa ${mb.name}`).toBeNull();
            matchCount++;
          } else {
            expect(issue, `RAM ${ram.ramType} NÃO deveria ser aceita na placa ${mb.name} (${mb.supportedRam})`).not.toBeNull();
            expect(issue?.type).toBe('ERROR');
            mismatchCount++;
          }
        }
      }

      expect(matchCount).toBeGreaterThan(0);
      expect(mismatchCount).toBeGreaterThan(0);
    });

    it('valida o soquete e capacidade térmica para TODAS as combinações de Cooler x CPU', () => {
      for (const cooler of COOLERS) {
        for (const cpu of CPUS) {
          const socketIssue = validateCoolerSocket(cooler, cpu);
          const supportsSocket = cooler.supportedSockets.includes(cpu.socket);

          if (supportsSocket) {
            expect(socketIssue, `Cooler ${cooler.name} deveria suportar soquete ${cpu.socket}`).toBeNull();
            const capacityIssue = validateCoolerCapacity(cooler, cpu);
            if (cpu.tdpWatts > cooler.maxTdpWatts) {
              expect(capacityIssue, `Cooler ${cooler.name} (${cooler.maxTdpWatts}W) deveria alertar sobre CPU ${cpu.name} (${cpu.tdpWatts}W)`).not.toBeNull();
              expect(capacityIssue?.type).toBe('WARNING');
            } else {
              expect(capacityIssue).toBeNull();
            }
          } else {
            expect(socketIssue, `Cooler ${cooler.name} não suporta soquete ${cpu.socket}`).not.toBeNull();
            expect(socketIssue?.type).toBe('ERROR');
          }
        }
      }
    });

    it('valida o formato de placa para TODAS as combinações de Gabinete x Placa-Mãe', () => {
      for (const pcCase of CASES) {
        for (const mb of MOTHERBOARDS) {
          const issue = validateCaseFormFactor(pcCase, mb);
          const supportsFormFactor = pcCase.supportedFormFactors.includes(mb.formFactor);

          if (supportsFormFactor) {
            expect(issue, `Gabinete ${pcCase.name} deveria suportar placa ${mb.formFactor}`).toBeNull();
          } else {
            expect(issue, `Gabinete ${pcCase.name} NÃO deveria suportar placa ${mb.formFactor}`).not.toBeNull();
            expect(issue?.type).toBe('ERROR');
          }
        }
      }
    });

    it('valida o comprimento para TODAS as combinações de GPU x Gabinete', () => {
      for (const gpu of GPUS) {
        for (const pcCase of CASES) {
          const issue = validateGpuLength(gpu, pcCase);
          if (gpu.lengthMm > pcCase.maxGpuLengthMm) {
            expect(issue, `GPU ${gpu.name} (${gpu.lengthMm}mm) deveria colidir no gabinete ${pcCase.name} (max ${pcCase.maxGpuLengthMm}mm)`).not.toBeNull();
            expect(issue?.type).toBe('ERROR');
          } else {
            expect(issue).toBeNull();
          }
        }
      }
    });

    it('valida o encaixe de armazenamento nos slots M.2 e SATA', () => {
      for (const st of STORAGES) {
        if (st.storageType.includes('M2') || st.storageType.includes('NVMe')) {
          expect(validateStorageSlot(st, 'M2')).toBeNull();
          expect(validateStorageSlot(st, 'SATA')?.type).toBe('ERROR');
        } else {
          expect(validateStorageSlot(st, 'SATA')).toBeNull();
          expect(validateStorageSlot(st, 'M2')?.type).toBe('ERROR');
        }
      }
    });
  });

  describe('4. Teste de POST Boot para Sistemas Completos em Cada Plataforma', () => {
    interface PlatformTestSpec {
      name: string;
      socket: CpuSocket;
      ramType: RamType;
      cpuId: string;
      hasDedicatedGpu: boolean;
    }

    const platforms: PlatformTestSpec[] = [
      {
        name: 'Intel LGA1700 com GPU Integrada (i3-12100)',
        socket: 'LGA1700',
        ramType: 'DDR4',
        cpuId: 'cpu-i3-12100',
        hasDedicatedGpu: false,
      },
      {
        name: 'Intel LGA1700 com GPU Dedicada (i5-12400F + RTX 3060)',
        socket: 'LGA1700',
        ramType: 'DDR4',
        cpuId: 'cpu-i5-12400f',
        hasDedicatedGpu: true,
      },
      {
        name: 'AMD AM4 com GPU Dedicada (Ryzen 5 5600 + RX 6700 XT)',
        socket: 'AM4',
        ramType: 'DDR4',
        cpuId: 'cpu-r5-5600',
        hasDedicatedGpu: true,
      },
      {
        name: 'AMD AM5 DDR5 com GPU Dedicada (Ryzen 5 7600 + RTX 4070)',
        socket: 'AM5',
        ramType: 'DDR5',
        cpuId: 'cpu-r5-7600',
        hasDedicatedGpu: true,
      },
    ];

    for (const plat of platforms) {
      it(`executa o teste de boot com sucesso para a plataforma: ${plat.name}`, () => {
        const cpu = CPUS.find((c) => c.id === plat.cpuId)!;
        const mb = MOTHERBOARDS.find((m) => m.socket === plat.socket && m.supportedRam === plat.ramType)!;
        const ram = RAMS.find((r) => r.ramType === plat.ramType)!;
        const cooler = COOLERS.find((k) => k.supportedSockets.includes(cpu.socket) && k.maxTdpWatts >= cpu.tdpWatts)!;
        const gpu = plat.hasDedicatedGpu ? GPUS[0] : null;
        const storage = STORAGES.find((s) => s.storageType.includes('M2'))!;
        const psu = PSUS.find((p) => p.wattage >= 650)!;
        const pcCase = CASES.find((c) => c.supportedFormFactors.includes(mb.formFactor) && (!gpu || c.maxGpuLengthMm >= gpu.lengthMm))!;

        const baseState: AssemblyState = {
          ...INITIAL_ASSEMBLY_STATE,
          esdDischarged: true,
          standoffsInstalled: true,
          ioShieldInstalled: true,
          motherboardScrewed: true,
          cpuInstalled: cpu,
          socketLeverLocked: true,
          thermalPasteApplied: true,
          coolerInstalled: cooler,
          coolerFanConnected: true,
          ramInstalledSlot2: ram,
          ramInstalledSlot4: ram,
          storageInstalled: storage,
          gpuInstalled: gpu ?? null,
          gpuScrewed: Boolean(gpu),
          cableGpuPcieConnected: Boolean(gpu),
          psuInstalled: psu,
          caseInstalled: pcCase,
          cableAtx24PinConnected: true,
          cableCpu8PinConnected: true,
          frontPanelPowerSwConnected: true,
          psuSwitchOn: true,
        };

        const result = evaluatePostTest(baseState, mb);

        expect(result.canPowerOn, `canPowerOn falhou em ${plat.name}: ${JSON.stringify(result.issues)}`).toBe(true);
        expect(result.bootSuccess, `bootSuccess falhou em ${plat.name}: ${JSON.stringify(result.issues)}`).toBe(true);
        expect(result.debugLed.cpu).toBe('GREEN');
        expect(result.debugLed.dram).toBe('GREEN');
        expect(result.debugLed.vga).toBe('GREEN');
        expect(result.debugLed.boot).toBe('GREEN');
        expect(result.issues.filter((i) => i.type === 'ERROR').length).toBe(0);
      });
    }

    it('acusa erro de VGA (LED vermelho) quando a CPU não tem vídeo integrado e falta placa de vídeo', () => {
      const cpuSemVideo = CPUS.find((c) => !c.hasIntegratedGpu && c.socket === 'LGA1700')!;
      const mb = MOTHERBOARDS.find((m) => m.socket === 'LGA1700')!;
      const ram = RAMS.find((r) => mb.supportedRam === r.ramType)!;
      const cooler = COOLERS.find((k) => k.supportedSockets.includes('LGA1700'))!;
      const storage = STORAGES[0];
      const psu = PSUS.find((p) => p.wattage >= 500)!;
      const pcCase = CASES[0];

      const state: AssemblyState = {
        ...INITIAL_ASSEMBLY_STATE,
        esdDischarged: true,
        standoffsInstalled: true,
        cpuInstalled: cpuSemVideo,
        socketLeverLocked: true,
        thermalPasteApplied: true,
        coolerInstalled: cooler,
        coolerFanConnected: true,
        ramInstalledSlot2: ram,
        storageInstalled: storage,
        gpuInstalled: null, // SEM GPU
        psuInstalled: psu,
        caseInstalled: pcCase,
        cableAtx24PinConnected: true,
        cableCpu8PinConnected: true,
        frontPanelPowerSwConnected: true,
        psuSwitchOn: true,
      };

      const result = evaluatePostTest(state, mb);
      expect(result.bootSuccess).toBe(false);
      expect(result.debugLed.vga).toBe('RED');
      expect(result.issues.some((i) => i.title.toLowerCase().includes('vídeo') || i.title.toLowerCase().includes('video'))).toBe(true);
    });

    it('acusa erro de fonte quando a potência em watts é insuficiente para o sistema', () => {
      const cpu = CPUS.find((c) => c.tdpWatts >= 100)!;
      const mb = MOTHERBOARDS.find((m) => m.socket === cpu.socket)!;
      const ram = RAMS.find((r) => mb.supportedRam === r.ramType)!;
      const cooler = COOLERS.find((k) => k.supportedSockets.includes(cpu.socket))!;
      const gpuGastona = GPUS.find((g) => g.tdpWatts >= 250)!;
      const psuFraca = PSUS.find((p) => p.wattage <= 250)!; // 200W com sistema que consome > 350W

      const state: AssemblyState = {
        ...INITIAL_ASSEMBLY_STATE,
        esdDischarged: true,
        standoffsInstalled: true,
        cpuInstalled: cpu,
        socketLeverLocked: true,
        thermalPasteApplied: true,
        coolerInstalled: cooler,
        coolerFanConnected: true,
        ramInstalledSlot2: ram,
        storageInstalled: STORAGES[0],
        gpuInstalled: gpuGastona,
        cableGpuPcieConnected: true,
        gpuScrewed: true,
        psuInstalled: psuFraca,
        caseInstalled: CASES.find((c) => c.supportedFormFactors.includes(mb.formFactor) && c.maxGpuLengthMm >= gpuGastona.lengthMm)!,
        cableAtx24PinConnected: true,
        cableCpu8PinConnected: true,
        frontPanelPowerSwConnected: true,
        psuSwitchOn: true,
      };

      const result = evaluatePostTest(state, mb);
      expect(result.bootSuccess).toBe(false);
      expect(result.issues.some((i) => i.title.toLowerCase().includes('fonte') || i.title.toLowerCase().includes('potência'))).toBe(true);
    });
  });

  describe('5. Simulação Completa na Store (Bancada + Periféricos + Benchmark + Score)', () => {
    it('executa a montagem ponta a ponta na Zustand Store com periféricos e atinge score máximo', async () => {
      const store = useAssemblyStore.getState();
      store.resetAssembly();

      // 1. Seleciona a primeira missão
      const mission = CLIENT_MISSIONS[0];
      store.selectMission(mission.id);

      // 2. Proteção ESD
      store.dischargeEsd();
      expect(useAssemblyStore.getState().assembly.esdDischarged).toBe(true);

      // 3. Espaçadores e Espelho
      store.installStandoffs();
      store.installIoShield();
      expect(useAssemblyStore.getState().assembly.standoffsInstalled).toBe(true);
      expect(useAssemblyStore.getState().assembly.ioShieldInstalled).toBe(true);

      // 4. Placa-Mãe AM4 compatível
      const mb = MOTHERBOARDS.find((m) => m.socket === 'AM4' && m.supportedRam === 'DDR4')!;
      store.installMotherboard(mb);
      store.screwMotherboard();
      expect(useAssemblyStore.getState().selectedMotherboard?.id).toBe(mb.id);
      expect(useAssemblyStore.getState().assembly.motherboardScrewed).toBe(true);

      // 5. CPU AM4
      const cpu = CPUS.find((c) => c.socket === 'AM4')!;
      store.installCpu(cpu);
      store.toggleSocketLever();
      expect(useAssemblyStore.getState().assembly.cpuInstalled?.id).toBe(cpu.id);
      expect(useAssemblyStore.getState().assembly.socketLeverLocked).toBe(true);

      // 6. Pasta Térmica e Cooler AM4
      store.applyThermalPaste();
      expect(useAssemblyStore.getState().assembly.thermalPasteApplied).toBe(true);
      const cooler = COOLERS.find((k) => k.supportedSockets.includes('AM4') && k.maxTdpWatts >= cpu.tdpWatts)!;
      store.installCooler(cooler);
      expect(useAssemblyStore.getState().assembly.coolerInstalled?.id).toBe(cooler.id);

      // 7. RAM DDR4 Dual Channel (Slots 2 e 4)
      const ram = RAMS.find((r) => r.ramType === 'DDR4')!;
      store.installRam(2, ram);
      store.installRam(4, ram);
      expect(useAssemblyStore.getState().assembly.ramInstalledSlot2?.id).toBe(ram.id);
      expect(useAssemblyStore.getState().assembly.ramInstalledSlot4?.id).toBe(ram.id);

      // 8. SSD M.2 NVMe
      const ssd = STORAGES.find((s) => s.storageType.includes('M2'))!;
      store.installStorage(ssd, 'M2');
      expect(useAssemblyStore.getState().assembly.storageInstalled?.id).toBe(ssd.id);

      // 9. GPU Dedicada
      const gpu = GPUS.find((g) => g.price <= 2000)!;
      store.installGpu(gpu);
      store.screwGpu();
      expect(useAssemblyStore.getState().assembly.gpuInstalled?.id).toBe(gpu.id);
      expect(useAssemblyStore.getState().assembly.gpuScrewed).toBe(true);

      // 10. Gabinete e Fonte
      const pcCase = CASES.find((c) => c.supportedFormFactors.includes(mb.formFactor) && c.maxGpuLengthMm >= gpu.lengthMm)!;
      store.installCase(pcCase);
      const psu = PSUS.find((p) => p.wattage >= 650)!;
      store.installPsu(psu);

      // 11. Cabeamento Completo com IDs canônicos
      store.connectCableTo('ATX_24PIN', 'ATX_PWR');
      store.connectCableTo('EPS_8PIN', 'ATX12V');
      store.connectCableTo('CPU_FAN_CABLE', 'CPU_FAN');
      store.connectCableTo('PCIE_8PIN', 'GPU_POWER');
      store.connectFPanelJumper('POWER_SW', [6, 8]);

      // 12. Ligar Chave da Fonte
      store.togglePsuSwitch();
      expect(useAssemblyStore.getState().assembly.psuSwitchOn).toBe(true);

      // 13. Equipar Periféricos do Aluno
      store.setStudentPeripheral('monitor', MONITORS[0]);
      store.setStudentPeripheral('keyboard', KEYBOARDS[0]);
      store.setStudentPeripheral('mouse', MICE[0]);
      store.setStudentPeripheral('audio', AUDIO_DEVICES[0]);
      expect(useAssemblyStore.getState().studentSetup.monitor?.id).toBe(MONITORS[0].id);

      // 14. POST Boot
      store.triggerPostBoot();
      await new Promise((resolve) => setTimeout(resolve, 800));
      const post = useAssemblyStore.getState().postResult;
      expect(post).not.toBeNull();
      expect(post?.canPowerOn).toBe(true);
      expect(post?.bootSuccess).toBe(true);
      expect(post?.debugLed.cpu).toBe('GREEN');
      expect(post?.debugLed.dram).toBe('GREEN');
      expect(post?.debugLed.vga).toBe('GREEN');
      expect(post?.debugLed.boot).toBe('GREEN');

      // 15. Benchmark
      const bench = calculateBenchmark(useAssemblyStore.getState().assembly, mb, '1080p');
      expect(bench.avgFps).toBeGreaterThan(30);
      expect(bench.verdictMessage).toBeTruthy();

      // 16. Score Final
      const score = store.calculateFinalScore();
      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.hashValidation).toBeTruthy();
    });
  });
});
