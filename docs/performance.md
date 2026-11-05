# Desempenho da interface (#31)

## Regras
- Todo componente lê a store com seletor. Seletor que devolve objeto ou array usa `useShallow`
  (verificado por varredura: nenhum `useAssemblyStore((s) => ({ ... }))` sem `useShallow`).
- O cronômetro fica em `HudClock` (dentro do `TopHUD`): é o único componente que re-renderiza a
  cada segundo. Nada fora dele lê `elapsedSeconds`, exceto a missão ativa, e só enquanto há
  uma missão em andamento (objetivos de tempo).

## Medição com o React Profiler
Montagem parada na bancada, cronômetro correndo, 10 s de ociosidade, servidor de desenvolvimento,
`<Profiler>` em volta de cada bloco da página (instrumentação temporária, fora do código final).

| Bloco | Antes (commits / tempo de render) | Depois |
|---|---|---|
| TopHUD (inclui o relógio) | 10 / 29,3 ms | 11 / 0,9 ms (só o `HudClock`) |
| ActiveMissionPanel (sem missão) | 10 / 0,5 ms | 0 |
| TeamChallengeBanner (fora do modo desafio) | 10 / 0,2 ms | 0 |
| Checklist, tutor, bancada, diagnóstico | 0 | 0 |

O `TeamChallengeBanner` assinava `elapsedSeconds` sem usar o valor; o `ActiveMissionPanel`
lia a sessão inteira (com o cronômetro) mesmo sem missão ativa.

## 60 FPS em 1366x768 com vídeo integrado (RNF07)
- A bancada 3D tem níveis de qualidade (#63): em vídeo integrado, pixel ratio 1, sombras de 512 px
  e sem antialias; o nível é escolhido pela detecção do WebGL e pode ser trocado pelo aluno.
- Ociosa, a página só faz o trabalho do relógio (tabela acima).
- A medição de FPS precisa ser feita no hardware da escola (o Chrome do CI renderiza WebGL por
  software e não representa uma GPU integrada). Roteiro: abrir a bancada 3D em 1366x768, DevTools →
  Rendering → Frame Rendering Stats, girar a câmera por 10 s com a montagem completa e anotar
  o FPS médio por nível de qualidade.

## Modo Decorar o Quarto (#91)
**Bundle.** Build de produção antes e depois da feature: o JS inicial da página `/` foi de
291 kB para 292 kB (First Load). O catálogo, as regras, a cena e a gaveta ficam em chunks baixados
sob demanda (12 a 15 kB gzip cada): a cena só depois que o PC liga na mesa, a gaveta só ao abrir o
modo. Na página inicial entram apenas o store efêmero do modo (item em mãos, seleção) e o nome da
chave do `localStorage`.

**Orçamento por nível de qualidade** (verificado em `canPlace`, que recusa com `LIMITE_DO_QUARTO`):

| Limite | Alta | Leve (vídeo integrado) |
|---|---:|---:|
| Itens no quarto | 24 | 12 |
| Faces somadas dos modelos | 150 mil | 75 mil |
| Textura dos pôsteres | 512 px | 512 px |
| Itens animados | 4 | 4 |

Com movimento reduzido nenhuma peça anima. Peças repetidas e estáticas viram uma `InstancedMesh`
por primitiva (os 12 hexágonos são sempre uma só), e geometrias, materiais e texturas de canvas são
liberados ao sair da mesa. Enquanto os modelos do Sketchfab não são baixados, cada peça é uma
versão por código de até 30 primitivas.

**Medição pendente no hardware da escola.** Roteiro: 1366x768, nível Leve, quarto cheio (12 itens,
incluindo 4 animados), DevTools → Rendering → Frame Rendering Stats, girar a câmera por 10 s em cada
uma das três vistas e anotar o FPS médio; em seguida, Memory → heap snapshot ao entrar e ao sair do
Modo Decorar, para conferir a liberação.
