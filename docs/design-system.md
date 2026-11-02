# Design System — PC Builder Academy
### Identidade Visual, Componentes e Padrões de Interação

---

## 1. Conceito e Tom de Voz

O **PC Builder Academy** adota uma estética **Cyber-Industrial & Clean Tech Laboratory**. 
* **Público-Alvo:** Estudantes do 1º Ano do Ensino Médio (14-16 anos).
* **Sensação Visual:** Não parece um software acadêmico frio ou infantilizado; parece uma **bancada de engenharia moderna** com toques de jogos no estilo *Satisfactory*, *Hardspace: Shipbreaker* e o clássico *PC Building Simulator*, adaptado para renderização rápida e leve em qualquer navegador.
* **Tom de Voz Didático:** Direto, empolgante, encorajador e baseado em **analogias do mundo real** (evitando jargões desnecessários sem antes explicá-los).

---

## 2. Paleta de Cores (Tokens Semânticos)

A paleta foi concebida para evocar uma bancada de eletrônica profissional com iluminação LED funcional.

### 2.1 Cores Base (Bancada e Gabinete)
| Token | Cor Hex | Uso |
| :--- | :--- | :--- |
| `bg-workbench` | `#0B0F19` | Fundo principal da bancada (tapete antiestático escuro) |
| `surface-panel` | `#111827` | Painéis de controle, gaveta de inventário, cards de componentes |
| `surface-elevated`| `#1F2937` | Modais, popovers de inspeção, menus flutuantes |
| `border-subtle` | `#374151` | Divisórias e bordas secundárias |
| `border-grid` | `rgba(59, 130, 246, 0.08)` | Linhas de grade milimetrada do tapete antiestático |

### 2.2 Cores Funcionais e de Estado (LEDs & Feedback)
| Token | Cor Hex | Significado no Jogo |
| :--- | :--- | :--- |
| `tech-cyan` | `#06B6D4` | Estado ativo, conector selecionado, slot pronto para encaixe |
| `success-emerald` | `#10B981` | Encaixe correto, teste POST aprovado, Debug LED verde |
| `warning-amber` | `#F59E0B` | Atenção na montagem (ex: "Sem pasta térmica", orçamente quase no limite) |
| `danger-rose` | `#F43F5E` | Curto-circuito, incompatibilidade grave de soquete, erro crítico |
| `gold-pin` | `#EAB308` | Contatos dourados, pinos da CPU, triângulo indicador de orientação |
| `bios-blue` | `#1E40AF` | Cor clássica do cabeçalho da BIOS Legacy / UEFI moderna |

---

## 3. Tipografia

* **Fonte Principal (Interface e Títulos):** `Space Grotesk` ou `Inter` (Sans-serif moderno, geométrico, excelente legibilidade em telas de baixa resolução).
* **Fonte Monospaçada (Specs Técnicas, BIOS e Código):** `JetBrains Mono` ou `Fira Code` (para frequências em MHz, TDP em Watts, tensões e logs de boot).

```css
/* Escala Tipográfica */
--font-display: 'Space Grotesk', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

.text-hud-metric { font-family: var(--font-mono); font-size: 1.125rem; font-weight: 700; }
.text-bios-output { font-family: var(--font-mono); font-size: 0.875rem; line-height: 1.25rem; }
```

---

## 4. Design de Áudio (Feedback Háptico e Sonoro)

O áudio é fundamental para transformar uma tarefa abstrata de clicar em tela em uma **experiência tátil e gratificante**. Todos os efeitos podem ser gerados via **Web Audio API** (sem necessidade de carregar arquivos MP3 pesados, garantindo carregamento instantâneo em escolas).

| Evento de Jogo | Tipo de Som | Sensação Desejada |
| :--- | :--- | :--- |
| **Encaixe de RAM / PCIe** | Dois cliques mecânicos firmes rápidos (latches travando) | Satisfação de fixação perfeita |
| **Alavanca da CPU** | Clique metálico com tensão | Sensação de peso e precisão mecânica |
| **Pasta Térmica** | "Squish" suave de compressão fluida | Percepção de aplicação de pasta |
| **Aperto de Parafuso** | Som curto de catraca / parafusadeira (3 giros rápidos) | Segurança da fixação física |
| **Botão Power Pressionado** | Clique mecânico táctil + som de relé interno (*click*) | Início da energização |
| **Rampa de Ventoinhas** | Zumbido suave de aceleração de ar (fade-in) | Vida útil do sistema ligando |
| **Boot POST Sucesso** | **1 Bip curto a 800Hz (150ms)** | O clássico "LIGOU! DEU VÍDEO!" |
| **Erro de Hardware (POST)**| 3 bips longos ou apito contínuo de alerta | Diagnóstico de falha imediato |

---

## 5. Anatomia dos Componentes de Interface

```
+-----------------------------------------------------------------------------------------+
| [TOP HUD]  Missão: PC Gamer  |  Orçamento: R$ 4.500 (Resta R$ 1.200)  |  Timer: 03:45   |
+-----------------------------------------------------------------------------------------+
|                                  |                                                      |
|   [GAVETA DE INVENTÁRIO]         |             [BANCADA VIRTUAL DE MONTAGEM]            |
|   - Processadores (CPUs)         |                                                      |
|   - Placas-Mãe                   |      +-----------------------------------------+     |
|   - Memórias RAM                 |      |              PLACA-MÃE ATX              |     |
|   - Coolers & Fans               |      |                                         |     |
|   - Placas de Vídeo (GPUs)       |      |   [Slot CPU]        [Slots RAM 1 2 3 4] |     |
|   - Armazenamento (NVMe/SSD)     |      |    (Destaque        (Chanfro animado)   |     |
|   - Fontes (PSUs)                |      |      Ciano)                             |     |
|   - Gabinetes                    |      |                                         |     |
|                                  |      |   [Slot PCIe x16]   [M.2 NVMe Slot]     |     |
|   [CARD SELECIONADO]             |      |                                         |     |
|   "Core i5-13400F / LGA1700"     |      +-----------------------------------------+     |
|   - Preço: R$ 1.100              |                                                      |
|   - TDP: 65W                     |      [BARRA DE CONTROLE: Girar | Zoom | Ligar PC]   |
+----------------------------------+------------------------------------------------------+
| [ASSISTENTE DIDÁTICO / DICAS]: "Dica: Lembre-se de alinhar o triângulo dourado da CPU!" |
+-----------------------------------------------------------------------------------------+
```

### 5.1 O Card de Inventário (`ComponentCard`)
* **Elementos:**
  1. Ícone vetorial detalhado da peça.
  2. Nome comercial fictício/educativo (ex: *Apex Core i5 - 10 núcleos*).
  3. Badges de especificação rápida: `Soquete LGA1700`, `DDR5`, `TDP 65W`.
  4. Tag de Preço: `R$ 1.150`.
  5. Botão "Inspecionar" (abre ficha didática detalhada para estudo).

### 5.2 O Slot de Encaixe (`DropZoneSlot`)
* **Estados Visuais:**
  * **Vazio / Neutro:** Contorno pontilhado cinza sutil.
  * **Hover Compatível:** Borda pulsante em `tech-cyan` com ícone de imã ou seta indicativa.
  * **Hover Incompatível:** Borda vermelha `danger-rose` com ícone de proibição e tooltip explicando o motivo (ex: *"Este soquete é AM5, mas a CPU selecionada é LGA1700"*).
  * **Ocupado / Montado:** Peça renderizada com travas fechadas e destaque sutil de iluminação.

### 5.3 O Assistente Didático Flutuante (`TeachingCompanion`)
* Mascote/mentor carismático estilo robô de laboratório que reage às ações do aluno:
  * **Neutro:** Aguardando próximo passo.
  * **Feliz:** Comemora encaixes corretos ("*Perfeito! A memória entrou no slot 2 para ativar Dual Channel!*").
  * **Alerta:** Interrompe erros graves com dicas preventivas (*"Cuidado! Não feche a alavanca se a CPU não estiver assentada por completo, senão os pinos vão quebrar!"*).

### 5.4 A Tela de Boot e Diagnóstico (`BIOSSimulatorModal`)
* Interface estilizada em tela cheia com visual de monitor CRT/LED:
  ```
  ACADEMY BIOS v4.20 - DUAL CHANNEL UEFI READY
  CPU: Apex Core i5-13400F @ 2.50GHz (10 Cores, 16 Threads) ........... [OK]
  DRAM: 16384 MB DDR5 @ 5200MHz (Slots 2 & 4 - DUAL CHANNEL ACTIVE) ... [OK]
  STORAGE: NVMe 1TB PCIe 4.0 x4 ....................................... [OK]
  GPU: Apex RTX 4060 8GB GDDR6 (PCIe 4.0 x16 Link) .................... [OK]
  POWER DRAW: 285W / PSU CAPACITY: 650W (Safety Headroom: 56%) ........ [OK]
  CPU TEMPERATURE: 38°C (Cooler Fan: 1200 RPM) ........................ [OK]

  STATUS: ALL SYSTEMS NOMINAL. READY TO BOOT OPERATING SYSTEM!
  ```

---

## 6. Acessibilidade e Inclusão (WCAG 2.2 AA)

1. **Alto Contraste de Texto:** Relação mínima de contraste de 4.5:1 para todos os textos instrutivos e labels de soquetes.
2. **Duplo Feedback (Cor + Ícone/Texto):** Nenhum status depende exclusivamente de cor. Erros usam cor vermelha + ícone de alerta + mensagem de texto descritiva.
3. **Alternativa para Arrastar e Soltar:** Alunos com dificuldades motoras ou usando touchpad com defeito podem clicar para selecionar e clicar no slot de destino para encaixar (Click-to-Place), além do Drag-and-Drop nativo.
4. **Modo Silencioso / Closed Captions:** Todos os bips e avisos sonoros possuem representação visual concomitante (ex: indicador de bip piscando na tela).



---

## 7. Design de Interface da Sala Virtual e Periféricos (v2.0)

### 7.1 Paleta de Cores dos Ambientes Virtuais
| Ambiente | Fundo Primário | Acento Luminoso | Estética |
| :--- | :--- | :--- | :--- |
| **Quarto Gamer RGB** | `#080B14` (Deep Indigo) | `#EC4899` (Neon Pink) / `#06B6D4` (Cyan) | Parede acústica escura com fitas LED neon e prateleiras |
| **Escritório Minimalista** | `#1C1917` (Warm Stone) | `#F59E0B` (Amber Solar) / `#E2E8F0` (Off-white) | Painel ripado de madeira clara, plantas e luz natural |
| **Laboratório Escolar Tech** | `#0F172A` (Slate Lab) | `#10B981` (Emerald) / `#38BDF8` (Sky) | Quadro de ferramentas, bancada antiestática e posters |
| **Vaporwave Retrô** | `#2E1065` (Purple Sunset) | `#F43F5E` (Rose Sunset) / `#22D3EE` (Teal) | Pôr do sol digital, grelha vetorial anos 80 e tons degradê |

### 7.2 Anatomia dos Periféricos
* **Monitores:**
  * Painel com moldura ultrafina de 2mm.
  * Tela interativa exibindo o papel de parede ou o jogo do benchmark em execução.
  * Suporte articulado a gás desenhado com braço mecânico de alumínio e mola integrada.
* **Teclados Mecânicos:**
  * Perfil TKL (sem numérico) ou 60% compacto.
  * Teclas com iluminação per-key e switches coloridos visíveis na ficha de inspeção.
* **Mouses:**
  * Formato ergonômico com patins de teflon brancos na base e cabo paracord flexível.
* **Gabinete com Visão Interna:**
  * Painel frontal e lateral em vidro temperado com reflexos vetoriais semi-transparentes, permitindo visualizar a placa-mãe montada, a rotação dos coolers e os LEDs do circuito em pleno funcionamento.

### 7.3 Selo de Certificação do Setup (Exportação PNG)
No canto inferior direito da imagem Full HD (1920x1080) gerada para o aluno:
```
+-------------------------------------------------------------+
|  PC BUILDER ACADEMY — CERTIFIED HARDWARE RIG                |
|  PILOTO / ALUNO: Lucas Mendes (1º Ano E.M. - Turma B)       |
|  HARDWARE: Core i5-13400F • RTX 4060 • 16GB DDR5 DUAL       |
|  RESOLUÇÃO ALVO: 1080p @ 144Hz • EFICIÊNCIA POST: 100%      |
|  AUTENTICAÇÃO ESCOLAR: PCA-982X14 • DATA: 02/11/2026        |
+-------------------------------------------------------------+
```
