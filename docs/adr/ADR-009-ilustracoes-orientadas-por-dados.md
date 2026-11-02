# ADR-009: Ilustrações Orientadas por Dados e Selo de Compatibilidade

## Status
Aprovado (v2.1).

## Contexto
Na v2.0, o componente `HardwareImage` tinha um único desenho por categoria, escolhido procurando palavras no nome comercial. Isso causava:
* os três gabinetes e todas as fontes com o mesmo desenho, e selo 80 Plus dourado em qualquer fonte;
* textos fixos ou errados (todo processador mostrava "MALAYSIA • 3.8GHz", o Ryzen 5 5600 aparecia como "R5 7600");
* RGB arco-íris em toda memória, contrariando o design system;
* gradientes SVG com o mesmo `id` repetidos em cada card;
* nenhuma pista visual do que importa para a compatibilidade (comprimento da GPU, formato da placa, quantidade de pentes).

Além disso, o aluno só descobria que uma peça não combinava depois de tentar encaixá-la.

## Decisão

### 1. Ilustração a partir do objeto da peça
`HardwareImage` recebe o componente inteiro (`component: HardwareComponent`), não mais o nome. Cada categoria tem uma função de desenho que lê os dados:

| Categoria | Dados usados no desenho |
| :--- | :--- |
| CPU | Soquete (LGA1700 retangular, AM4/AM5 quadrado, recortes do AM5), núcleos, threads e clock |
| RAM | `moduleCount` (1 ou 2 pentes), geração (posição do chanfro), RGB só se a peça tiver |
| GPU | `lengthMm` em escala fixa (1 unidade = 1 mm) com régua, número de ventoinhas pelo comprimento, conector de energia se `powerPins` existir |
| PSU | `efficiencyRating` (cor do selo ou "Sem Selo"), `isModular` (conectores ou cabos fixos) |
| Placa-mãe | `formFactor` (ATX mais alta), quantidade de slots de RAM, M.2 e PCIe, chipset |
| Gabinete | Formatos aceitos (mid-tower ou compacto), vidro, tela mesh, ventoinhas incluídas |
| Cooler | Tipo (AIO, box ou torre) e capacidade (número de heatpipes) |

A mesma ilustração é desenhada dentro da placa-mãe quando a peça é instalada (SVG aninhado com `svgProps` de posição e tamanho).

### 2. Materiais SVG compartilhados
`HardwareMaterials` monta uma única vez na página os gradientes de metal, alumínio, cobre, contatos dourados, PCB, vidro e RGB (ids com prefixo `hw-`). Todas as ilustrações referenciam esses ids, com luz sempre vinda do canto superior esquerdo. O SVG de definições fica com tamanho zero, mas não com `display: none`, porque alguns navegadores deixam de aplicar gradientes definidos em elementos ocultos.

### 3. Selo de compatibilidade e faixa de preço como funções puras
`src/engine/cardInsights.ts`:
* `getCompatibilityHint(peça, montagem, placa)` → `{ status: 'INSTALLED' | 'OK' | 'INFO' | 'WARNING' | 'DANGER', label }` ou `null` quando ainda não há com o que comparar. Reaproveita os validadores do motor de regras.
* `getPriceTier(peça)` → terço de preço dentro da categoria (Entrada, Intermediário, Topo de linha).

O card usa um seletor raso do Zustand (`useShallow`) e só redesenha quando a montagem ou a peça em mãos mudam, não a cada segundo do relógio.

### 4. Tipografia e movimento
* Space Grotesk e JetBrains Mono via `next/font`, que embute as fontes no build e mantém o PWA funcionando offline.
* Framer Motion com `LazyMotion` + `domAnimation` (só os recursos usados) e `MotionConfig reducedMotion="user"`.

## Alternativas Consideradas e Rejeitadas
* **Imagens PNG/WebP por produto:** rejeitado pelo peso no PWA, pela impossibilidade de mostrar dados variáveis (régua, quantidade de pentes) e por questões de direito de imagem.
* **`useId` para gradientes em cada ilustração:** resolveria os ids duplicados, mas repetiria dezenas de definições idênticas no DOM. O conjunto compartilhado é mais leve.
* **Framer Motion completo (`motion.*`):** rejeitado pelo peso na primeira carga; trocar por `LazyMotion` reduziu a página de 210 para 199 kB.

## Consequências
* **Positivas:**
  * O aluno vê a compatibilidade antes de encaixar e entende visualmente por que uma GPU não cabe.
  * Uma peça nova no catálogo ganha ilustração correta sem código novo, desde que use os campos existentes.
* **Negativas:**
  * A expansão do catálogo feita na `main` (#18) precisa ser adaptada a esse contrato (ver backlog do PRD, seção 7).
