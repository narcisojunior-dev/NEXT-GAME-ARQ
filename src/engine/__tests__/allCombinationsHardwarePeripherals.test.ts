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
  StudentSetupConfig,
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
  calculateTotalTdp,
} from '../compatibility';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { AssemblyState } from '../types';
import { useAssemblyStore } from '../../store/useAssemblyStore';
import { calculateBenchmark } from '../benchmark';

describe('Bateria Exaustiva: Todas as Combinações de Hardware e Periféricos', () => {
  describe('1. Matriz Exaustiva de GPUs x Gabinetes (Comprimento Físico)', () => {
    it('testa todas as combinações de GPU x Gabinete quanto à colisão física', () => {
      let fitCount = 0;
      let collisionCount = 0;

      for (const gpu of GPUS) {
        for (const pcCase of CASES) {
          const issue = validateGpuLength(gpu, pcCase);
          if (gpu.lengthMm > pcCase.maxGpuLengthMm) {
            expect(issue).not.toBeNull();
            expect(issue?.type).toBe('ERROR');
            expect(issue?.title).toContain('Placa de Vídeo Grande Demais');
            collisionCount++;
          } else {
            expect(issue).toBeNull();
            fitCount++;
          }
        }
      }

      expect(fitCount).toBeGreaterThan(0);
      expect(collisionCount).toBeGreaterThan(0);
    });
  });

  describe('2. Matriz de GPUs com Alimentação Própria (Bus-Powered) vs Cabos PCIe Extras', () => {
    it('GPUs com powerPins="none" dão boot sem cabo PCIe; GPUs com "8pin" exigem o cabo', () => {
      const cpu = CPUS.find((c) => c.socket === 'AM4')!;
      const mb = MOTHERBOARDS.find((m) => m.socket === 'AM4' && m.supportedRam === 'DDR4')!;
      const ram = RAMS.find((r) => r.ramType === 'DDR4')!;
      const cooler = COOLERS.find((k) => k.supportedSockets.includes('AM4'))!;
      const psu = PSUS.find((p) => p.wattage >= 850)!;
      const pcCase = CASES.find((c) => c.maxGpuLengthMm >= 380)!;

      for (const gpu of GPUS) {
        const baseAssembly: AssemblyState = {
          ...INITIAL_ASSEMBLY_STATE,
          esdDischarged: true,
          standoffsInstalled: true,
          motherboardScrewed: true,
          cpuInstalled: cpu,
          socketLeverLocked: true,
          thermalPasteApplied: true,
          coolerInstalled: cooler,
          coolerFanConnected: true,
          ramInstalledSlot2: ram,
          ramInstalledSlot4: ram,
          storageInstalled: STORAGES[0],
          gpuInstalled: gpu,
          gpuScrewed: true,
          psuInstalled: psu,
          caseInstalled: pcCase,
          cableAtx24PinConnected: true,
          cableCpu8PinConnected: true,
          frontPanelPowerSwConnected: true,
          psuSwitchOn: true,
          cableGpuPcieConnected: false, // Sem o cabo conectado inicialmente
        };

        const postWithoutCable = evaluatePostTest(baseAssembly, mb);

        if (gpu.powerPins === 'none') {
          // GPUs de até 75W alimentadas pelo slot (ex: GTX 1650, RTX 3050 6GB)
          expect(
            postWithoutCable.bootSuccess,
            `GPU ${gpu.name} sem cabo deveria ligar direto pelo slot PCIe`
          ).toBe(true);
          expect(postWithoutCable.debugLed.vga).toBe('GREEN');
        } else {
          // GPUs que exigem cabo de 8 pinos
          expect(
            postWithoutCable.bootSuccess,
            `GPU ${gpu.name} exige cabo PCIe mas deu boot sem ele`
          ).toBe(false);
          expect(postWithoutCable.debugLed.vga).toBe('RED');

          // Agora conectamos o cabo PCIe e testamos novamente
          const postWithCable = evaluatePostTest(
            { ...baseAssembly, cableGpuPcieConnected: true },
            mb
          );
          expect(
            postWithCable.bootSuccess,
            `GPU ${gpu.name} com cabo PCIe conectado falhou no boot: ${JSON.stringify(postWithCable.issues)}`
          ).toBe(true);
          expect(postWithCable.debugLed.vga).toBe('GREEN');
        }
      }
    });
  });

  describe('3. Matriz de GPUs x Fontes x CPUs (Sobrecarga de Energia / Potência)', () => {
    it('detecta fonte subdimensionada para qualquer combinação cujo consumo supere a fonte', () => {
      const mb = MOTHERBOARDS[0];
      const cooler = COOLERS[0];
      const ram = RAMS[0];

      for (const gpu of GPUS) {
        for (const psu of PSUS) {
          const cpu = CPUS[0];
          const pcCase = CASES.find((c) => c.maxGpuLengthMm >= gpu.lengthMm && c.supportedFormFactors.includes(mb.formFactor)) || CASES[0];

          const state: AssemblyState = {
            ...INITIAL_ASSEMBLY_STATE,
            esdDischarged: true,
            standoffsInstalled: true,
            motherboardScrewed: true,
            cpuInstalled: cpu,
            socketLeverLocked: true,
            thermalPasteApplied: true,
            coolerInstalled: cooler,
            coolerFanConnected: true,
            ramInstalledSlot2: ram,
            ramInstalledSlot4: ram,
            storageInstalled: STORAGES[0],
            gpuInstalled: gpu,
            gpuScrewed: true,
            cableGpuPcieConnected: gpu.powerPins !== 'none',
            psuInstalled: psu,
            caseInstalled: pcCase,
            cableAtx24PinConnected: true,
            cableCpu8PinConnected: true,
            frontPanelPowerSwConnected: true,
            psuSwitchOn: true,
          };

          const totalTdp = calculateTotalTdp(state, mb);
          const minRequiredWatts = totalTdp * 1.25;
          const result = evaluatePostTest(state, mb);

          if (psu.wattage < minRequiredWatts) {
            expect(result.bootSuccess).toBe(false);
            expect(result.issues.some((i) => i.title.includes('Fonte Subdimensionada'))).toBe(true);
          }
        }
      }
    });
  });

  describe('4. Matriz Combinatória Completa de Periféricos (432 combinações)', () => {
    it('valida todas as 432 combinações possíveis de periféricos do aluno', () => {
      let count = 0;

      for (const monitor of MONITORS) {
        for (const keyboard of KEYBOARDS) {
          for (const mouse of MICE) {
            for (const stand of MONITOR_STANDS) {
              for (const audio of AUDIO_DEVICES) {
                for (const gamepad of GAMEPADS) {
                  for (const caseTheme of CASE_THEMES) {
                    const setup: StudentSetupConfig = {
                      monitor,
                      keyboard,
                      mouse,
                      stand,
                      audio,
                      gamepad,
                      caseTheme,
                    };

                    // Verifica integridade dos campos
                    expect(setup.monitor.id).toBeTruthy();
                    expect(setup.keyboard.id).toBeTruthy();
                    expect(setup.mouse.id).toBeTruthy();
                    expect(setup.stand.id).toBeTruthy();
                    expect(setup.audio.id).toBeTruthy();
                    expect(setup.gamepad.id).toBeTruthy();
                    expect(setup.caseTheme.id).toBeTruthy();

                    // Preço total dos periféricos é um número positivo
                    const totalPeripheralCost =
                      monitor.price +
                      keyboard.price +
                      mouse.price +
                      stand.price +
                      audio.price +
                      gamepad.price +
                      caseTheme.price;

                    expect(totalPeripheralCost).toBeGreaterThanOrEqual(0);
                    expect(Number.isFinite(totalPeripheralCost)).toBe(true);

                    // Especificações técnicas presentes em cada periférico
                    expect(Object.keys(setup.monitor.specs).length).toBeGreaterThan(0);
                    expect(Object.keys(setup.keyboard.specs).length).toBeGreaterThan(0);
                    expect(Object.keys(setup.mouse.specs).length).toBeGreaterThan(0);
                    expect(Object.keys(setup.caseTheme.specs).length).toBeGreaterThan(0);

                    count++;
                  }
                }
              }
            }
          }
        }
      }

      // 3 monitores * 3 teclados * 2 mouses * 2 suportes * 2 audios * 2 gamepads * 3 gabinetes = 432 combinações
      expect(count).toBe(432);
    });
  });

  describe('5. Matriz de Benchmark: Todas as GPUs x CPUs x Resoluções', () => {
    it('calcula o benchmark com consistência matemática em 1080p, 1440p e 4K', () => {
      const resolutions: ('1080p' | '1440p' | '4K')[] = ['1080p', '1440p', '4K'];
      const mb = MOTHERBOARDS[0];
      const ram = RAMS[0];
      const cooler = COOLERS[0];

      let combinationsTested = 0;

      for (const gpu of GPUS) {
        for (const cpu of CPUS) {
          for (const res of resolutions) {
            const assembly: AssemblyState = {
              ...INITIAL_ASSEMBLY_STATE,
              cpuInstalled: cpu,
              gpuInstalled: gpu,
              ramInstalledSlot2: ram,
              ramInstalledSlot4: ram,
              coolerInstalled: cooler,
              thermalPasteApplied: true,
            };

            const bench = calculateBenchmark(assembly, mb, res);

            expect(bench.resolution).toBe(res);
            expect(bench.avgFps).toBeGreaterThan(0);
            expect(bench.onePercentLowFps).toBeLessThanOrEqual(bench.avgFps);
            expect(bench.onePercentLowFps).toBeGreaterThan(0);
            expect(bench.bottleneckPercent).toBeGreaterThanOrEqual(0);
            expect(bench.bottleneckPercent).toBeLessThanOrEqual(100);
            expect(['CPU_BOUND', 'GPU_BOUND', 'BALANCED']).toContain(bench.bottleneckType);
            expect(bench.cpuTempC).toBeGreaterThanOrEqual(30);
            expect(bench.cpuTempC).toBeLessThanOrEqual(105);
            expect(bench.gpuTempC).toBeGreaterThanOrEqual(30);
            expect(bench.gpuTempC).toBeLessThanOrEqual(105);
            expect(bench.totalPowerWatts).toBeGreaterThan(0);
            expect(bench.verdictMessage).toBeTruthy();
            expect(bench.didacticTip).toBeTruthy();
            expect(bench.frametimeHistory.length).toBeGreaterThan(0);

            combinationsTested++;
          }
        }
      }

      // GPUS (14) * CPUS (6) * Resoluções (3) = 252 combinações de benchmark testadas
      expect(combinationsTested).toBe(GPUS.length * CPUS.length * resolutions.length);
    });
  });

  describe('6. Computador Completo Montado na Bancada com Todos os Periféricos', () => {
    it('executa a montagem completa com periféricos topo de linha na store Zustand', async () => {
      const store = useAssemblyStore.getState();
      store.resetAssembly();

      // Montagem completa
      store.dischargeEsd();
      store.installStandoffs();
      store.installIoShield();

      const mb = MOTHERBOARDS.find((m) => m.socket === 'AM5' && m.supportedRam === 'DDR5')!;
      store.installMotherboard(mb);
      store.screwMotherboard();

      const cpu = CPUS.find((c) => c.socket === 'AM5')!;
      store.installCpu(cpu);
      store.toggleSocketLever();

      store.applyThermalPaste();
      const cooler = COOLERS.find((k) => k.supportedSockets.includes('AM5') && k.coolerType === 'Water')!;
      store.installCooler(cooler);

      const ramDdr5 = RAMS.find((r) => r.ramType === 'DDR5')!;
      store.installRam(2, ramDdr5);
      store.installRam(4, ramDdr5);

      const ssd = STORAGES.find((s) => s.storageType.includes('M2'))!;
      store.installStorage(ssd, 'M2');

      const gpu = GPUS.find((g) => g.id === 'gpu-rtx-4070-super') || GPUS[0];
      store.installGpu(gpu);
      store.screwGpu();

      const pcCase = CASES.find((c) => c.maxGpuLengthMm >= gpu.lengthMm)!;
      store.installCase(pcCase);

      const psu = PSUS.find((p) => p.wattage >= 850)!;
      store.installPsu(psu);

      store.connectCableTo('ATX_24PIN', 'ATX_PWR');
      store.connectCableTo('EPS_8PIN', 'ATX12V');
      store.connectCableTo('CPU_FAN_CABLE', 'CPU_FAN');
      if (gpu.powerPins !== 'none') {
        store.connectCableTo('PCIE_8PIN', 'GPU_POWER');
      }
      store.connectFPanelJumper('POWER_SW', [6, 8]);
      store.togglePsuSwitch();

      // Equipar TODOS os periféricos no setup do aluno
      store.setStudentPeripheral('monitor', MONITORS[2]); // Odyssey G5 Ultrawide 144Hz
      store.setStudentPeripheral('keyboard', KEYBOARDS[2]); // HyperX 60% Clicky
      store.setStudentPeripheral('mouse', MICE[1]); // Logitech Superlight 63g
      store.setStudentPeripheral('stand', MONITOR_STANDS[1]); // Braço articulado a gás ELG F80N
      store.setStudentPeripheral('audio', AUDIO_DEVICES[1]); // HyperX Cloud II 7.1
      store.setStudentPeripheral('gamepad', GAMEPADS[1]); // 8BitDo Hall Effect
      store.setStudentPeripheral('caseTheme', CASE_THEMES[1]); // Lian Li Aquário RGB

      const currentSetup = useAssemblyStore.getState().studentSetup;
      expect(currentSetup.monitor.id).toBe('mon-34-ultrawide');
      expect(currentSetup.keyboard.id).toBe('kb-mech-60-blue');
      expect(currentSetup.mouse.id).toBe('mouse-gamer-65g');
      expect(currentSetup.stand.id).toBe('stand-gas-arm');
      expect(currentSetup.audio.id).toBe('audio-headset-71');
      expect(currentSetup.gamepad.id).toBe('gamepad-hall-effect');
      expect(currentSetup.caseTheme.id).toBe('case-aquarium-rgb');

      // Teste de Boot
      store.triggerPostBoot();
      await new Promise((r) => setTimeout(r, 800));

      const post = useAssemblyStore.getState().postResult;
      expect(post?.bootSuccess).toBe(true);
      expect(post?.debugLed.cpu).toBe('GREEN');
      expect(post?.debugLed.dram).toBe('GREEN');
      expect(post?.debugLed.vga).toBe('GREEN');
      expect(post?.debugLed.boot).toBe('GREEN');

      // Executar Benchmark na resolução do monitor ultrawide (1440p)
      const bench = calculateBenchmark(useAssemblyStore.getState().assembly, mb, '1440p');
      expect(bench.avgFps).toBeGreaterThan(60);
      expect(bench.verdictMessage).toBeTruthy();

      // Pontuação final do time
      const score = store.calculateFinalScore();
      expect(score.totalScore).toBeGreaterThan(4000);
      expect(score.hashValidation).toContain('PCA-');
    });
  });
});
