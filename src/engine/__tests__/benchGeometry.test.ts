import { describe, it, expect } from 'vitest';
import { BENCH_BOARDS, BOARD_WIDTH, BenchPartId, PASTE_LAYER, benchBoardBox, benchPartPlacements } from '../benchGeometry';
import { fitsInsideXZ, overlapRatio } from '../geometry3d';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { COOLERS, CPUS, GPUS, MOTHERBOARDS, RAMS, STORAGES } from '../hardwareCatalog';
import { AssemblyState, MotherboardComponent } from '../types';
import { resolveWorkbenchModelId } from '../workbenchModels';

const EPS = 1e-6;
/** Sobreposição máxima tolerada entre duas peças (fração do volume da menor) */
const MAX_OVERLAP = 0.02;

interface Combo {
  label: string;
  assembly: AssemblyState;
  motherboard: MotherboardComponent;
}

/** Todas as montagens fisicamente válidas do catálogo (soquete, geração de RAM, suporte do cooler) */
function* allValidCombos(): Generator<Combo> {
  for (const mb of MOTHERBOARDS) {
    for (const cpu of CPUS.filter((c) => c.socket === mb.socket)) {
      for (const ram of RAMS.filter((r) => r.ramType === mb.supportedRam)) {
        for (const cooler of COOLERS.filter((k) => k.supportedSockets.includes(cpu.socket))) {
          for (const gpu of [null, ...GPUS]) {
            for (const storage of [null, ...STORAGES]) {
              yield {
                label: `${mb.id} + ${cpu.id} + ${ram.id} + ${cooler.id} + ${gpu?.id ?? 'sem GPU'} + ${storage?.id ?? 'sem disco'}`,
                motherboard: mb,
                assembly: {
                  ...INITIAL_ASSEMBLY_STATE,
                  cpuInstalled: cpu,
                  coolerInstalled: cooler,
                  thermalPasteApplied: true,
                  ramInstalledSlot2: ram,
                  ramInstalledSlot4: ram.moduleCount >= 2 ? ram : null,
                  gpuInstalled: gpu,
                  storageInstalled: storage,
                },
              };
            }
          }
        }
      }
    }
  }
}

/** Assinatura geométrica: combinações com a mesma assinatura ocupam exatamente o mesmo espaço */
function geometrySignature({ assembly, motherboard }: Combo): string {
  const a = assembly;
  return [
    resolveWorkbenchModelId(motherboard),
    a.cpuInstalled && resolveWorkbenchModelId(a.cpuInstalled),
    a.ramInstalledSlot2 && resolveWorkbenchModelId(a.ramInstalledSlot2),
    Boolean(a.ramInstalledSlot4),
    a.coolerInstalled?.coolerType,
    a.gpuInstalled ? `${resolveWorkbenchModelId(a.gpuInstalled)}:${a.gpuInstalled.lengthMm}` : '-',
    a.storageInstalled?.storageType ?? '-',
  ].join('|');
}

/** Lista os problemas de encaixe de uma montagem (vazia = tudo no lugar) */
function fitProblems(combo: Combo): string[] {
  const { parts, board, ihsTopY } = benchPartPlacements(combo.assembly, combo.motherboard);
  const boardBox = benchBoardBox(board);
  const problems: string[] = [];
  const byId = (id: BenchPartId) => parts.find((p) => p.part === id);

  parts.forEach((p) => {
    // 1. Dentro da placa (a GPU pode passar da borda direita: placas longas são maiores que uma Micro-ATX)
    if (p.part === 'SATA_DRIVE') {
      // No tapete (y = 0), à frente da borda inferior da placa e alinhado à borda direita
      if (Math.abs(p.box.min[1]) > EPS || p.box.min[2] <= boardBox.max[2]) problems.push('disco SATA fora da baia no tapete');
      return;
    }
    const inside =
      p.part === 'GPU'
        ? p.box.min[2] >= boardBox.min[2] - EPS && p.box.max[2] <= boardBox.max[2] + EPS && Math.abs(p.box.min[0] + BOARD_WIDTH / 2) < 1e-3
        : fitsInsideXZ(boardBox, p.box, 0.02);
    if (!inside) problems.push(`${p.part} fora da placa`);
  });

  // 2. Assentamento físico: cada peça apoiada onde deve
  const { layout } = board;
  const seated = (id: BenchPartId, y: number) => {
    const part = byId(id);
    if (part && Math.abs(part.box.min[1] - y) > 1e-6) problems.push(`${id} não assentada (base ${part.box.min[1].toFixed(3)} ≠ ${y.toFixed(3)})`);
  };
  seated('CPU', layout.CPU_SOCKET[1]);
  seated('COOLER', ihsTopY + PASTE_LAYER);
  seated('RAM_2', layout.RAM_SLOT_2[1]);
  seated('RAM_4', layout.RAM_SLOT_4[1]);
  seated('M2_SSD', layout.M2_SLOT[1]);
  seated('GPU', layout.PCIE_SLOT[1]);

  // 3. Sem sobreposição exagerada entre peças
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const ratio = overlapRatio(parts[i].box, parts[j].box);
      if (ratio > MAX_OVERLAP) problems.push(`${parts[i].part} × ${parts[j].part} sobrepostas em ${(ratio * 100).toFixed(1)}%`);
    }
  }
  return problems;
}

describe('Bancada 3D: todas as combinações de peças encaixam no lugar, sem sobreposição', () => {
  it('cada montagem válida do catálogo passa nas regras de encaixe', () => {
    const checked = new Map<string, string[]>();
    const failures: string[] = [];
    let total = 0;
    for (const combo of allValidCombos()) {
      total++;
      const signature = geometrySignature(combo);
      let problems = checked.get(signature);
      if (!problems) {
        problems = fitProblems(combo);
        checked.set(signature, problems);
      }
      if (problems.length > 0 && failures.length < 15) failures.push(`${combo.label}: ${problems.join('; ')}`);
    }
    // Registro para o relatório: quantas montagens e quantos arranjos geométricos distintos
    console.info(`[bancada] ${total.toLocaleString('pt-BR')} montagens verificadas (${checked.size} arranjos geométricos distintos)`);
    expect(total).toBeGreaterThan(10000);
    expect(failures).toEqual([]);
  });

  it('o cooler assenta sobre o IHS da CPU (com a camada de pasta), nunca dentro dela', () => {
    for (const cpu of CPUS) {
      const mb = MOTHERBOARDS.find((m) => m.socket === cpu.socket);
      if (!mb) continue;
      const { parts } = benchPartPlacements(
        { ...INITIAL_ASSEMBLY_STATE, cpuInstalled: cpu, coolerInstalled: COOLERS.find((k) => k.supportedSockets.includes(cpu.socket)) ?? null },
        mb
      );
      const cpuBox = parts.find((p) => p.part === 'CPU')?.box;
      const coolerBox = parts.find((p) => p.part === 'COOLER')?.box;
      expect(cpuBox && coolerBox && coolerBox.min[1] - cpuBox.max[1]).toBeCloseTo(PASTE_LAYER, 6);
    }
  });

  it('pentes ficam em pé dentro do slot: mais altos que largos e com o comprimento real (133 mm)', () => {
    Object.values(BENCH_BOARDS).forEach((board) => {
      RAMS.forEach((ram) => {
        const mb = MOTHERBOARDS.find((m) => m.supportedRam === ram.ramType && resolveWorkbenchModelId(m) === board.modelId);
        if (!mb) return;
        const stick = benchPartPlacements({ ...INITIAL_ASSEMBLY_STATE, ramInstalledSlot2: ram }, mb).parts.find((p) => p.part === 'RAM_2');
        if (!stick) throw new Error('pente não posicionado');
        const [w, h, d] = [stick.box.max[0] - stick.box.min[0], stick.box.max[1] - stick.box.min[1], stick.box.max[2] - stick.box.min[2]];
        expect(h, `${ram.id} em pé`).toBeGreaterThan(w);
        expect(d * board.mmPerUnit, `${ram.id} comprimento`).toBeCloseTo(133, 0);
      });
    });
  });

  it('GPUs são desenhadas no comprimento real do catálogo', () => {
    const mb = MOTHERBOARDS.find((m) => m.id === 'mb-z790-max')!;
    GPUS.forEach((gpu) => {
      const { parts, board } = benchPartPlacements({ ...INITIAL_ASSEMBLY_STATE, gpuInstalled: gpu }, mb);
      const box = parts.find((p) => p.part === 'GPU')!.box;
      expect((box.max[0] - box.min[0]) * board.mmPerUnit, gpu.id).toBeCloseTo(gpu.lengthMm, 0);
    });
  });
});
