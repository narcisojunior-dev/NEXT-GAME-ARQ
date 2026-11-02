# ADR-001: Seleção de Stack e Plataforma Web

## Status
Aprovado

## Contexto
O objetivo é desenvolver um jogo educativo e interativo de montagem de computadores voltado para alunos do 1º Ano do Ensino Médio. As restrições e requisitos do ambiente escolar incluem:
* **Ambiente Escolar Heterogêneo:** Salas de informática contam com máquinas de especificações variadas (muitas vezes com placas de vídeo integradas antigas, memória RAM limitada e sistemas operacionais variados como Windows, Linux Educacional ou ChromeOS).
* **Bloqueio de Instalação:** Escolas públicas e privadas frequentemente possuem bloqueios administrativos que impedem os alunos ou professores de instalar executáveis (`.exe`) ou plugins pesados.
* **Necessidade de Acesso Universal:** O jogo precisa rodar diretamente no navegador, sem downloads pesados, e ser facilmente acessível tanto em sala de aula quanto em casa para tarefas de estudo.
* **Alta Interatividade e Responsividade:** A montagem exige animações suaves, feedback visual de encaixe, drag-and-drop e inspeção de peças.

## Decisão
Adotamos uma arquitetura **100% Web moderna** baseada em:
1. **Framework Principal:** **Next.js 15+ (App Router) com React 19 e TypeScript**.
   * *Motivo:* Permite renderização híbrida rápida, tipagem estática rigorosa para o catálogo de hardware e regras de compatibilidade, além de facilidade de implantação em provedores estáticos e edge (Vercel, Netlify, GitHub Pages).
2. **Estilização e Design System:** **Tailwind CSS v4 / PostCSS**.
   * *Motivo:* Utilitários atômicos para estilização consistente, tokens semânticos de cores e tamanhos reduzidos de CSS em produção (essencial para carregamento veloz em conexões lentas de escolas).
3. **Ícones e Assets Vetoriais:** **Lucide React + SVGs customizados de hardware**.
   * *Motivo:* Escalabilidade infinita sem perda de nitidez em qualquer densidade de tela (DPI), com peso de download ínfimo em comparação com texturas 3D rasterizadas pesadas.

## Alternativas Consideradas e Rejeitadas
* **Engine 3D Pesada (Unity / Unreal via WebGL/WebGPU):**
  * *Rejeitado porque:* Cria arquivos de build gigantes (100MB+), consome muita VRAM e trava com frequência em computadores modestos de salas de informática, além de ter tempo de carregamento inicial que consome preciosos minutos da aula.
* **Aplicativo Desktop Nativo (Electron / Godot Desktop):**
  * *Rejeitado porque:* Exige instalação e permissões de administrador no computador da escola, inviabilizando o uso na maioria dos laboratórios escolares.
* **HTML/CSS/JS puro sem framework:**
  * *Rejeitado porque:* A complexidade do estado da montagem (dezenas de slots, pinos, compatibilidades cruzadas, timers e modos de jogo) se tornaria frágil e difícil de manter e expandir.

## Consequências
* **Positivas:**
  * Acesso instantâneo via link (zero atrito de entrada).
  * Desempenho garantido a 60 FPS mesmo em hardware escolar simples.
  * Código modular e manutenível, facilitando futuras expansões (novas peças, novas missões).
* **Negativas / Mitigações:**
  * Não oferece rotação de câmera 3D de alta densidade poligonal; no entanto, a visão isométrica/2D de bancada com zoom e camadas resolve o problema pedagógico com muito maior clareza visual.

