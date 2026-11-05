/**
 * Catálogo de decoração do quarto (#84, #88, #89). Puro.
 *
 * Cada item é um modelo do manifesto 3D (grupo DECOR, ids `decor-*`) ou um item feito por código
 * (ids `proc-*`). A pegada é a medida real aproximada do objeto, em metros: o modelo baixado é
 * ajustado a ela, e enquanto ele não é baixado a cena desenha uma versão leve feita por código.
 */
import { UnlockRule } from './decorUnlocks';
import { containsBlockedWord, looksLikeLink } from './textFilter';

export type DecorZone = 'FLOOR' | 'WALL' | 'DESK' | 'SHELF' | 'CEILING';
export type DecorPack = 'CLASSICO' | 'GAMER' | 'NERD' | 'MUSEU';

export interface DecorVariant {
  id: string;
  label: string;
}

export interface DecorItem {
  /** = id do modelo 3D (`decor-*`) ou `proc-*` para itens feitos por código */
  id: string;
  name: string;
  /** Curiosidade didática curta, lida pelo leitor de tela no card */
  description: string;
  pack: DecorPack;
  /** A primeira zona é a principal; as outras são alternativas (um console também cabe na mesa) */
  zones: DecorZone[];
  /** Largura (ao longo da parede ou do eixo X), profundidade e altura, em metros */
  footprint: { w: number; d: number; h: number };
  /** Estantes e vitrine viram superfícies para itens de prateleira */
  providesShelfSlots?: number;
  unlock: UnlockRule;
  variants?: DecorVariant[];
  maxPerRoom: number;
  /** Faces do modelo original (orçamento de desempenho) */
  faces: number;
  /** Traz animação (ventilador, neon, robô): para com movimento reduzido */
  animated: boolean;
  /** Persiana: só pode ficar sobre a janela */
  coversWindow?: boolean;
}

/** Itens planos (tapetes) ficam por baixo dos móveis e da cadeira */
export const FLAT_ITEM_MAX_HEIGHT = 0.03;
export const isFlat = (item: DecorItem) => item.footprint.h <= FLAT_ITEM_MAX_HEIGHT;

/** Arte original gerada pelo jogo para pôsteres e quadros (nada de personagens de terceiros) */
export const ART_VARIANTS: DecorVariant[] = [
  { id: 'pixel-cpu', label: 'Arte pixel: processador' },
  { id: 'mapa-soquetes', label: 'Mapa de soquetes' },
  { id: 'grafico-fps', label: 'Gráfico de FPS do seu PC' },
  { id: 'certificado', label: 'Certificado da equipe' },
  { id: 'ficha-setup', label: 'Ficha do seu setup' },
];

export const LED_VARIANTS: DecorVariant[] = [
  { id: 'tema', label: 'Cor do tema (fixa)' },
  { id: 'respirar', label: 'Respirar' },
  { id: 'arco-iris', label: 'Arco-íris' },
  { id: 'onda', label: 'Onda' },
];

export const HEX_VARIANTS: DecorVariant[] = [
  { id: 'ciano-magenta', label: 'Ciano e magenta' },
  { id: 'tema', label: 'Cor do tema' },
  { id: 'arco-iris', label: 'Arco-íris' },
];

export const NEON_COLOR_VARIANTS: DecorVariant[] = [
  { id: 'ciano', label: 'Ciano' },
  { id: 'magenta', label: 'Magenta' },
  { id: 'verde', label: 'Verde' },
  { id: 'ambar', label: 'Âmbar' },
];

/** Efeitos de LED que se movem (contam como item animado) */
export const ANIMATED_LED_VARIANTS = new Set(['respirar', 'arco-iris', 'onda']);

const DESK_RUNNING: UnlockRule = { kind: 'DESK_RUNNING' };
const missions = (count: number): UnlockRule => ({ kind: 'MISSIONS_COMPLETED', count });
const stars = (count: number): UnlockRule => ({ kind: 'THREE_STARS', count });
const diagnostics = (count: number): UnlockRule => ({ kind: 'DIAGNOSTICS_RESOLVED', count });
const answers = (count: number): UnlockRule => ({ kind: 'CORRECT_ANSWERS', count });
const firstTry = (count: number): UnlockRule => ({ kind: 'POST_FIRST_TRY', count });
const BUDGET: UnlockRule = { kind: 'BUDGET_CHALLENGE_DONE' };
const CAMPAIGN: UnlockRule = { kind: 'CAMPAIGN_COMPLETED' };

type Size = [w: number, d: number, h: number];

function item(
  id: string,
  name: string,
  pack: DecorPack,
  zones: DecorZone[],
  [w, d, h]: Size,
  unlock: UnlockRule,
  faces: number,
  description: string,
  extra: Partial<Pick<DecorItem, 'providesShelfSlots' | 'variants' | 'maxPerRoom' | 'animated' | 'coversWindow'>> = {}
): DecorItem {
  return { id, name, description, pack, zones, footprint: { w, d, h }, unlock, faces, maxPerRoom: 1, animated: false, ...extra };
}

/* ====================================================================================
 * Pacote Clássico: o quarto básico (libera quando o PC liga na mesa)
 * ==================================================================================== */
const CLASSICO: DecorItem[] = [
  item('decor-cama', 'Cama de casal', 'CLASSICO', ['FLOOR'], [1.45, 2.0, 0.9], DESK_RUNNING, 5325, 'Deixe uns 60 cm livres em volta da cama para circular sem tropeçar nos cabos.'),
  item('decor-beliche', 'Beliche', 'CLASSICO', ['FLOOR'], [1.0, 2.0, 1.6], DESK_RUNNING, 1046, 'Beliche economiza chão: sobra espaço para a mesa e o PC.'),
  item('decor-criado-mudo', 'Criado-mudo', 'CLASSICO', ['FLOOR'], [0.45, 0.4, 0.55], DESK_RUNNING, 3036, 'Ao lado da cama, segura o carregador do celular longe da mesa.', { maxPerRoom: 2 }),
  item('decor-guarda-roupa', 'Guarda-roupa', 'CLASSICO', ['FLOOR'], [1.2, 0.55, 2.0], DESK_RUNNING, 802, 'Móvel alto encostado na parede: confira se não tampa a janela nem a tomada.'),
  item('decor-estante-parede', 'Prateleira de parede', 'CLASSICO', ['WALL'], [0.9, 0.22, 0.58], DESK_RUNNING, 724, 'Dois níveis, quatro nichos para itens pequenos. Prateleira presa na parede precisa de bucha certa.', { providesShelfSlots: 4, maxPerRoom: 3 }),
  item('decor-estante-decorada', 'Estante com livros', 'CLASSICO', ['FLOOR'], [0.8, 0.3, 1.6], DESK_RUNNING, 4034, 'Estante já decorada; os dois níveis de cima recebem mais itens.', { providesShelfSlots: 4, maxPerRoom: 2 }),
  item('decor-puff', 'Puff', 'CLASSICO', ['FLOOR'], [0.75, 0.75, 0.6], DESK_RUNNING, 464, 'Bom para jogar no console, mas para estudar no PC a cadeira com encosto é melhor para a coluna.', { maxPerRoom: 2 }),
  item('decor-luminaria-mesa', 'Luminária articulada', 'CLASSICO', ['DESK'], [0.2, 0.25, 0.45], DESK_RUNNING, 2546, 'Luz de leitura do lado oposto à mão que escreve evita sombra no caderno.', { maxPerRoom: 2 }),
  item('decor-luminaria-teto', 'Luminária pendente', 'CLASSICO', ['CEILING'], [0.4, 0.4, 0.6], DESK_RUNNING, 1812, 'Luz geral no teto: a tela não deve ser a única fonte de luz do quarto.', { maxPerRoom: 3 }),
  item('decor-ventilador-teto', 'Ventilador de teto', 'CLASSICO', ['CEILING'], [1.1, 1.1, 0.4], DESK_RUNNING, 297, 'Ar circulando também ajuda o gabinete: ele puxa ar mais fresco do quarto.', { animated: true }),
  item('decor-ar-condicionado', 'Ar-condicionado split', 'CLASSICO', ['WALL'], [0.85, 0.22, 0.3], DESK_RUNNING, 1462, 'Um quarto a 24 °C deixa a CPU alguns graus mais fria do que a 32 °C.'),
  item('decor-relogio-parede', 'Relógio de parede', 'CLASSICO', ['WALL'], [0.32, 0.05, 0.32], DESK_RUNNING, 798, 'O relógio do PC vem do chip RTC, alimentado pela bateria CR2032 da placa-mãe.'),
  item('decor-persiana', 'Persiana', 'CLASSICO', ['WALL'], [1.3, 0.06, 1.3], DESK_RUNNING, 736, 'Sol batendo na tela causa reflexo: a persiana controla a luz da janela.', { coversWindow: true }),
  item('decor-moldura-poster', 'Pôster com moldura', 'CLASSICO', ['WALL'], [0.5, 0.03, 0.7], DESK_RUNNING, 70, 'A arte é gerada pelo próprio jogo: escolha uma nas opções do item.', { variants: ART_VARIANTS, maxPerRoom: 4 }),
  item('decor-poster-branco', 'Pôster 45 × 60 cm', 'CLASSICO', ['WALL'], [0.46, 0.01, 0.61], DESK_RUNNING, 512, 'Pôster sem moldura com arte original do jogo.', { variants: ART_VARIANTS, maxPerRoom: 4 }),
  item('decor-quadro', 'Quadro pequeno', 'CLASSICO', ['WALL'], [0.4, 0.03, 0.3], DESK_RUNNING, 1812, 'Quadro com arte do jogo ou a ficha do seu setup.', { variants: ART_VARIANTS, maxPerRoom: 4 }),
  item('decor-tapete-redondo', 'Tapete redondo', 'CLASSICO', ['FLOOR'], [1.2, 1.2, 0.01], DESK_RUNNING, 84, 'Tapete reduz eletricidade estática? Não: lã e sintético até aumentam. Descarregue-se antes de abrir o PC.', { maxPerRoom: 2 }),
  item('decor-tapete-retangular', 'Tapete retangular', 'CLASSICO', ['FLOOR'], [1.6, 1.0, 0.01], DESK_RUNNING, 192, 'Fica por baixo da cadeira e dos móveis.', { maxPerRoom: 2 }),
  item('decor-plantas', 'Vaso de planta', 'CLASSICO', ['FLOOR'], [0.45, 0.45, 0.9], DESK_RUNNING, 1770, 'Regar perto do PC? Mantenha vasos longe do gabinete e da régua de tomadas.', { maxPerRoom: 3 }),
  item('decor-planta-jade', 'Planta jade', 'CLASSICO', ['DESK', 'SHELF'], [0.15, 0.15, 0.22], DESK_RUNNING, 463, 'Suculenta pequena: aguenta pouca água, ótimo para não molhar a mesa.', { maxPerRoom: 3 }),
  item('decor-suculentas', 'Cactos e suculentas', 'CLASSICO', ['DESK', 'SHELF'], [0.25, 0.15, 0.15], DESK_RUNNING, 8168, 'Plantas de pouca rega para a mesa ou a prateleira.', { maxPerRoom: 2 }),
  item('decor-lixeira', 'Lixeira', 'CLASSICO', ['FLOOR'], [0.3, 0.3, 0.4], DESK_RUNNING, 1070, 'Lixo eletrônico (pilhas, placas) não vai na lixeira comum: leve a um ponto de coleta.'),
  item('decor-caneca', 'Caneca', 'CLASSICO', ['DESK', 'SHELF'], [0.12, 0.09, 0.1], DESK_RUNNING, 536, 'Bebida longe do teclado: um copo derramado é um dos defeitos mais comuns em notebooks.', { maxPerRoom: 2 }),
  item('decor-livros', 'Livros', 'CLASSICO', ['SHELF', 'DESK'], [0.3, 0.2, 0.25], DESK_RUNNING, 536, 'Manual da placa-mãe também é livro: ele mostra a ordem dos slots de memória.', { maxPerRoom: 6 }),
  item('decor-violao', 'Violão', 'CLASSICO', ['FLOOR'], [0.4, 0.25, 1.0], DESK_RUNNING, 6268, 'Encostado na parede, longe do sol, para a madeira não empenar.'),
  item('decor-skate', 'Skate', 'CLASSICO', ['FLOOR'], [0.8, 0.22, 0.12], DESK_RUNNING, 5464, 'Skate no chão do quarto: guarde-o fora do caminho da cadeira.'),
  item('decor-bola-futebol', 'Bola de futebol', 'CLASSICO', ['FLOOR'], [0.22, 0.22, 0.22], DESK_RUNNING, 7044, 'Uma bola tem 32 gomos; um processador tem bilhões de transistores.'),
  item('decor-caixa-som-bt', 'Caixa de som Bluetooth', 'CLASSICO', ['DESK', 'SHELF'], [0.2, 0.08, 0.1], DESK_RUNNING, 1080, 'Bluetooth usa a faixa de 2,4 GHz, a mesma do Wi-Fi: muitos aparelhos juntos podem interferir.'),
  item('decor-lava', 'Lâmpada de lava', 'CLASSICO', ['DESK'], [0.12, 0.12, 0.4], DESK_RUNNING, 3192, 'A cera sobe quando a lâmpada a aquece e desce ao esfriar: convecção, como o ar dentro do gabinete.'),
];

/* ====================================================================================
 * Pacote Gamer
 * ==================================================================================== */
const DESAFIO: UnlockRule = { kind: 'TRACK_COMPLETED', track: 'DESAFIO' };
const MESA: UnlockRule = { kind: 'TRACK_COMPLETED', track: 'MESA' };
const OFICINA: UnlockRule = { kind: 'TRACK_COMPLETED', track: 'OFICINA' };

const GAMER: DecorItem[] = [
  item('decor-fliperama', 'Fliperama', 'GAMER', ['FLOOR'], [0.7, 0.75, 1.8], DESAFIO, 1616, 'Os fliperamas dos anos 80 tinham uma placa dedicada a um único jogo; o seu PC roda qualquer um.'),
  item('decor-maquina-garra', 'Máquina de garra', 'GAMER', ['FLOOR'], [0.8, 0.8, 1.85], DESAFIO, 12095, 'A força da garra é controlada por um microcontrolador, um computador bem pequeno.'),
  item('decor-tv-crt', 'TV de tubo', 'GAMER', ['DESK', 'SHELF'], [0.55, 0.45, 0.45], missions(3), 3326, 'TV de tubo (CRT) desenha a imagem com um feixe de elétrons, linha por linha, 60 vezes por segundo.'),
  item('decor-console-retro', 'Console retrô', 'GAMER', ['SHELF', 'DESK'], [0.27, 0.19, 0.06], missions(5), 268, 'Consoles dos anos 90 tinham cerca de 2 MB de RAM; o seu PC tem milhares de vezes mais.'),
  item('decor-atari', 'Atari 2600', 'GAMER', ['SHELF', 'DESK'], [0.34, 0.23, 0.09], missions(8), 8298, 'Atari 2600 (1977): um dos primeiros consoles com cartuchos trocáveis, com apenas 128 bytes de RAM.'),
  item('decor-arcade-stick', 'Arcade stick', 'GAMER', ['DESK'], [0.4, 0.25, 0.15], firstTry(3), 3194, 'Cada botão fecha um contato, como os pinos do painel frontal (F_PANEL).', { animated: true }),
  item('decor-portatil-retro', 'Portátil retrô', 'GAMER', ['SHELF', 'DESK'], [0.09, 0.03, 0.15], missions(6), 1616, 'Videogames portáteis dos anos 90 rodavam horas com pilhas AA graças a um processador de 4 MHz.'),
  item('decor-oculos-vr', 'Óculos de realidade virtual', 'GAMER', ['DESK', 'SHELF'], [0.19, 0.2, 0.12], MESA, 10504, 'Realidade virtual precisa de 90 FPS ou mais para não causar enjoo: é aí que a GPU faz diferença.'),
  item('decor-cadeira-gamer', 'Cadeira gamer', 'GAMER', ['FLOOR'], [0.7, 0.7, 1.3], MESA, 13529, 'Ergonomia: pés apoiados, joelhos a 90° e a tela na altura dos olhos.'),
  item('decor-neon-controle', 'Neon de controle', 'GAMER', ['WALL'], [0.6, 0.03, 0.4], firstTry(3), 348, 'Letreiro de LED em tubo flexível: consome bem menos que o neon de gás antigo.', { maxPerRoom: 2 }),
  item('decor-neon-cyberpunk', 'Letreiro neon animado', 'GAMER', ['WALL'], [0.3, 0.03, 0.8], firstTry(5), 328, 'Ideograma genérico em LED que pisca em sequência.', { animated: true }),
  item('decor-espuma-acustica', 'Espuma acústica', 'GAMER', ['WALL'], [0.5, 0.05, 0.5], OFICINA, 1086, 'Espuma reduz o eco do quarto (melhora o microfone), mas não isola o som de fora.', { maxPerRoom: 12 }),
  item('decor-suporte-headset', 'Suporte de headset', 'GAMER', ['DESK'], [0.14, 0.14, 0.27], OFICINA, 5204, 'Guardar o headset pendurado preserva a espuma e o cabo.'),
  item('decor-frigobar', 'Frigobar', 'GAMER', ['FLOOR'], [0.48, 0.5, 0.85], missions(10), 1196, 'Geladeira também dissipa calor pela traseira: deixe espaço atrás dela, como no gabinete.'),
  item('decor-pelucias-garra', 'Ursinhos da garra', 'GAMER', ['SHELF', 'DESK'], [0.3, 0.15, 0.18], stars(3), 4180, 'Prêmios da máquina de garra.', { animated: true, maxPerRoom: 2 }),
  item('decor-pelucia-tubarao', 'Pelúcia de tubarão', 'GAMER', ['SHELF', 'DESK'], [0.4, 0.15, 0.15], stars(5), 3708, 'Mascote da estante.', { maxPerRoom: 2 }),
  item('decor-vitrine', 'Vitrine de troféus', 'GAMER', ['FLOOR'], [0.6, 0.4, 1.8], stars(1), 5328, 'Mostra um troféu para cada missão com 3 estrelas e ainda recebe colecionáveis.', { providesShelfSlots: 4 }),
  item('decor-trofeu', 'Troféu', 'GAMER', ['SHELF', 'DESK'], [0.12, 0.12, 0.24], stars(1), 8062, 'Recompensa por montar com perfeição.', { maxPerRoom: 3 }),
  item('decor-cubo-magico', 'Cubo mágico', 'GAMER', ['DESK', 'SHELF'], [0.06, 0.06, 0.06], answers(3), 1724, 'O cubo tem 43 quintilhões de combinações; um computador acha a solução em menos de um segundo.'),
];

/* ====================================================================================
 * Pacote Nerd & Ciência
 * ==================================================================================== */
const NERD: DecorItem[] = [
  item('decor-d20', 'Dado de 20 faces', 'NERD', ['DESK', 'SHELF'], [0.05, 0.05, 0.05], diagnostics(1), 476, 'O d20 é um icosaedro, um dos cinco sólidos de Platão.'),
  item('decor-dados-rpg', 'Conjunto de dados de RPG', 'NERD', ['DESK', 'SHELF'], [0.18, 0.1, 0.04], diagnostics(2), 4900, 'O computador sorteia números com geradores pseudoaleatórios: os chamados do modo detetive usam um.'),
  item('decor-xadrez', 'Tabuleiro de xadrez', 'NERD', ['DESK', 'SHELF'], [0.4, 0.4, 0.1], answers(5), 8564, 'Em 1997, o computador Deep Blue venceu o campeão mundial de xadrez.'),
  item('decor-telescopio', 'Telescópio', 'NERD', ['FLOOR'], [0.6, 0.6, 1.5], answers(8), 17533, 'A lente objetiva junta luz; a ocular aumenta a imagem.'),
  item('decor-capacete-astronauta', 'Capacete de astronauta', 'NERD', ['SHELF', 'DESK'], [0.3, 0.3, 0.24], answers(8), 10828, 'O computador de bordo da Apollo 11 tinha cerca de 4 KB de RAM.', { animated: true }),
  item('decor-terra', 'Terra (móbile)', 'NERD', ['CEILING'], [0.3, 0.3, 0.6], answers(8), 960, 'Satélites de GPS usam relógios atômicos para o seu celular saber onde está.'),
  item('decor-sol', 'Sol (móbile)', 'NERD', ['CEILING'], [0.4, 0.4, 0.7], answers(8), 960, 'A luz do Sol leva cerca de 8 minutos para chegar à Terra.'),
  item('decor-jupiter', 'Júpiter (móbile)', 'NERD', ['CEILING'], [0.35, 0.35, 0.65], answers(8), 3072, 'Júpiter caberia mais de mil Terras.', { animated: true }),
  item('decor-robo', 'Robô', 'NERD', ['SHELF', 'DESK'], [0.15, 0.12, 0.24], diagnostics(3), 5521, 'Robôs combinam sensores, um processador e motores: entrada, processamento e saída.'),
  item('decor-robo-fofo', 'Robozinho', 'NERD', ['SHELF', 'DESK'], [0.12, 0.1, 0.15], diagnostics(5), 3330, 'Robozinho que acena.', { animated: true }),
  item('decor-microscopio', 'Microscópio', 'NERD', ['DESK', 'SHELF'], [0.2, 0.25, 0.38], diagnostics(3), 4679, 'Os transistores de um processador atual são menores que um vírus: nem o microscópio óptico os enxerga.'),
  item('decor-raspberry-pi', 'Raspberry Pi', 'NERD', ['DESK', 'SHELF'], [0.09, 0.06, 0.02], BUDGET, 6851, 'Raspberry Pi: um computador inteiro numa placa do tamanho de um cartão, criado para ensinar programação.'),
  item('decor-arduino', 'Arduino UNO', 'NERD', ['DESK', 'SHELF'], [0.07, 0.055, 0.015], BUDGET, 2196, 'Arduino é um microcontrolador: lê sensores e aciona motores, base de muitos projetos de robótica.'),
  item('decor-drone', 'Drone', 'NERD', ['SHELF', 'DESK'], [0.3, 0.3, 0.1], { kind: 'ALL', rules: [BUDGET, diagnostics(3)] }, 2080, 'O drone se equilibra porque um processador ajusta os quatro motores centenas de vezes por segundo.'),
  item('decor-toca-discos', 'Toca-discos', 'NERD', ['DESK', 'SHELF'], [0.45, 0.35, 0.13], { kind: 'TRACK_COMPLETED', track: 'DIAGNOSTICO' }, 5008, 'O vinil guarda o som de forma analógica; o MP3 guarda números (digital).'),
  item('decor-globo', 'Globo terrestre', 'NERD', ['DESK', 'SHELF'], [0.3, 0.3, 0.42], answers(3), 9540, 'A internet entre continentes passa por cabos de fibra óptica no fundo do mar.'),
];

/* ====================================================================================
 * Museu do PC: linha do tempo da computação (ao concluir a campanha)
 * ==================================================================================== */
const MUSEU: DecorItem[] = [
  item('decor-pc-anos-90', 'PC dos anos 90', 'MUSEU', ['SHELF', 'DESK'], [0.42, 0.45, 0.42], CAMPAIGN, 2416, 'Anos 90: processador de 66 MHz, 8 MB de RAM e disco de 500 MB. O seu tem milhares de vezes mais.'),
  item('decor-terminal-ibm', 'Terminal de mainframe', 'MUSEU', ['SHELF', 'DESK'], [0.36, 0.4, 0.36], CAMPAIGN, 4442, 'Anos 80: o terminal não processava nada, só mostrava o que o mainframe da sala ao lado calculava.'),
  item('decor-pc-retro-psx', 'Microcomputador retrô', 'MUSEU', ['SHELF', 'DESK'], [0.2, 0.15, 0.18], CAMPAIGN, 194, 'Microcomputadores pessoais levaram o computador para dentro de casa nos anos 80.'),
  item('decor-computadores-antigos', 'Computadores antigos', 'MUSEU', ['FLOOR'], [1.2, 0.5, 1.2], CAMPAIGN, 16056, 'Coleção de máquinas antigas: compare as gerações de processador e memória.'),
  item('proc-linha-do-tempo', 'Estante "Linha do tempo"', 'MUSEU', ['FLOOR'], [0.95, 0.45, 1.3], CAMPAIGN, 400, 'Placas de ano de 1977 até hoje, terminando no PC que você montou.', { providesShelfSlots: 4 }),
];

/* ====================================================================================
 * Feitos por código (#88): sem download e sem risco de licença
 * ==================================================================================== */
const PROCEDURAL: DecorItem[] = [
  item('proc-aparador', 'Aparador', 'CLASSICO', ['FLOOR'], [1.2, 0.45, 0.75], DESK_RUNNING, 36, 'Móvel baixo com dois espaços no tampo: a mesa do PC fica livre para teclado e mouse.', { providesShelfSlots: 2, maxPerRoom: 2 }),
  item('proc-fita-led', 'Fita LED', 'CLASSICO', ['WALL'], [1.2, 0.02, 0.03], DESK_RUNNING, 24, 'Fita de LEDs RGB: cada LED mistura vermelho, verde e azul para formar a cor.', { variants: LED_VARIANTS, maxPerRoom: 3 }),
  item('proc-poster', 'Pôster do jogo', 'CLASSICO', ['WALL'], [0.6, 0.01, 0.8], DESK_RUNNING, 12, 'Arte original gerada pelo jogo, com os dados do seu PC.', { variants: ART_VARIANTS, maxPerRoom: 4 }),
  item('proc-hexagonos', 'Painéis hexagonais', 'GAMER', ['WALL'], [1.0, 0.03, 0.6], stars(2), 288, 'Doze painéis de luz em colmeia: o hexágono cobre a parede sem deixar buracos.', { variants: HEX_VARIANTS }),
  item('proc-neon-texto', 'Neon com texto', 'GAMER', ['WALL'], [0.9, 0.04, 0.25], missions(3), 48, 'Escreva até 12 letras, como o nome da sua equipe.', { variants: NEON_COLOR_VARIANTS, maxPerRoom: 2 }),
];

export const DECOR_ITEMS: DecorItem[] = [...CLASSICO, ...GAMER, ...NERD, ...MUSEU, ...PROCEDURAL];

const BY_ID = new Map(DECOR_ITEMS.map((i) => [i.id, i]));
export const findDecorItem = (id: string): DecorItem | null => BY_ID.get(id) ?? null;

export const isProcedural = (id: string) => id.startsWith('proc-');

export const DECOR_PACKS: { id: DecorPack; title: string; description: string }[] = [
  { id: 'CLASSICO', title: 'Clássico', description: 'Móveis, plantas, luz e objetos do dia a dia.' },
  { id: 'GAMER', title: 'Gamer', description: 'Fliperama, retrô, neon e streaming.' },
  { id: 'NERD', title: 'Nerd & Ciência', description: 'RPG, espaço, robótica e laboratório.' },
  { id: 'MUSEU', title: 'Museu do PC', description: 'A linha do tempo da computação.' },
];

export const ZONE_LABELS: Record<DecorZone, string> = {
  FLOOR: 'no chão',
  WALL: 'na parede',
  DESK: 'na mesa',
  SHELF: 'na prateleira',
  CEILING: 'no teto',
};

/** Linha do tempo do Museu do PC: placas das prateleiras da estante */
export const MUSEUM_TIMELINE: { year: string; label: string }[] = [
  { year: '1977', label: 'Consoles com cartucho' },
  { year: '1983', label: 'Terminais de mainframe' },
  { year: '1995', label: 'PC com monitor de tubo' },
  { year: 'Hoje', label: 'O PC que você montou' },
];

/** Neon com texto do aluno: até 12 caracteres, sem endereços e sem palavrões */
export const NEON_TEXT_MAX = 12;
export function validateNeonText(raw: string): { ok: true; text: string } | { ok: false; message: string } {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return { ok: false, message: 'Escreva o texto do neon.' };
  if (text.length > NEON_TEXT_MAX) return { ok: false, message: `O neon cabe até ${NEON_TEXT_MAX} caracteres.` };
  if (looksLikeLink(text)) return { ok: false, message: 'Endereços e links não podem ir no neon.' };
  if (!/^[\p{L}\p{N} !?#&+\-]+$/u.test(text)) return { ok: false, message: 'Use só letras, números, espaço e ! ? # & + -' };
  if (containsBlockedWord(text)) return { ok: false, message: 'Esse texto não pode ir para o neon da escola.' };
  return { ok: true, text };
}
