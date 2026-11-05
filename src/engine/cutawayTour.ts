import { CUTAWAY_SUBSYSTEMS, CutawaySubsystem } from './cutaway';

/**
 * Roteiro puro do tour do modo "Abrir o PC" (#62): só anda sozinho enquanto ninguém segura o
 * controle (≈25 s de silêncio); qualquer entrada devolve o controle ao aluno. Cada passo tem
 * legenda visível (equivalente ao áudio). O tour não altera a montagem nem a pontuação.
 */
export const TOUR_IDLE_MS = 25000;

export interface TourStep {
  /** null = volta ao conjunto (vista explodida inteira) */
  subsystem: CutawaySubsystem | null;
  durationMs: number;
  caption: string;
}

const CAPTIONS: Record<CutawaySubsystem, string> = {
  CPU_COOLER:
    'Sistema térmico: o processador transforma energia em calor; a pasta térmica e o cooler levam esse calor embora. Veja a temperatura e a rotação da ventoinha.',
  PSU: 'Energia: a fonte converte a tomada em 12 V, 5 V e 3,3 V. Compare o consumo estimado com a capacidade da fonte.',
  MEMORY: 'Memória: dois pentes nos slots certos ativam o dual channel e dobram a largura de banda para o processador.',
  GPU: 'Vídeo: a placa de vídeo desenha a imagem do jogo. O gargalo mostra se a CPU acompanha a GPU.',
  STORAGE: 'Armazenamento: o SSD guarda o sistema e os jogos. Quanto maior a leitura em MB/s, mais rápido tudo abre.',
};

export function buildTourScript(subsystems: readonly CutawaySubsystem[]): TourStep[] {
  const steps: TourStep[] = CUTAWAY_SUBSYSTEMS.filter((s) => subsystems.includes(s)).map((s) => ({
    subsystem: s,
    durationMs: 6000,
    caption: CAPTIONS[s],
  }));
  return [
    ...steps,
    { subsystem: null, durationMs: 5000, caption: 'Conjunto completo: cada subsistema depende dos outros para o PC funcionar.' },
  ];
}

/** Passo do tour depois de `idleMs` sem entrada do aluno (null = ainda não começou) */
export function tourStepAt(script: readonly TourStep[], idleMs: number): { index: number; step: TourStep } | null {
  if (idleMs < TOUR_IDLE_MS || script.length === 0) return null;
  const total = script.reduce((sum, s) => sum + s.durationMs, 0);
  let t = (idleMs - TOUR_IDLE_MS) % total;
  for (let index = 0; index < script.length; index++) {
    if (t < script[index].durationMs) return { index, step: script[index] };
    t -= script[index].durationMs;
  }
  return { index: 0, step: script[0] };
}
