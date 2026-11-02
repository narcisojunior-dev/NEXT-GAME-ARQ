# ADR-006: Customizador de Setup, Sala Virtual e Exportador de Imagem

## Status
Aprovado

## Contexto
O usuário solicitou expandir a experiência do aluno para **além da bancada de componentes**:
* O aluno deve poder escolher o gabinete, periféricos completos (monitor, mouse, teclado, suporte articulado, gamepad, caixas de som).
* O aluno deve escolher o ambiente virtual onde o computador ficará (Quarto Gamer, Escritório Minimalista, Laboratório Escolar).
* Deve ser possível **salvar como imagem de alta resolução (PNG)** o setup completo e a sala virtual do aluno para guardar como recordação, compartilhar ou entregar ao professor.

Desafios técnicos:
* O ambiente escolar não possui servidores de backend dedicados para renderizar imagens (Puppeteer ou servidores Node na nuvem gerariam custos insustentáveis).
* A renderização precisa ser **100% no cliente (client-side)** e rodar instantaneamente em computadores escolares modestos.

## Decisão
1. **Composição em Camadas Vetoriais (Layered Canvas & SVG):**
   * O ambiente da Sala Virtual é desenhado em camadas desacopladas:
     * *Camada 0:* Parede e Iluminação do Quarto (Neon, Madeira ou Laboratório).
     * *Camada 1:* Móveis (Mesa de trabalho, Cadeira gamer/ergonômica, Prateleiras).
     * *Camada 2:* Periféricos de Base (Mousepad estendido, Suporte de monitor a gás).
     * *Camada 3:* Dispositivos Centrais (Gabinete montado com as peças escolhidas visíveis através do vidro, Monitores com tela ligada, Teclado mecânico com iluminação RGB e Mouse).
     * *Camada 4:* Acessórios (Gamepad sobre o suporte, Headset, Caixas de som).
2. **Exportador de Imagem 100% Client-Side via HTML5 Canvas:**
   * Uma função puramente em JavaScript/Canvas desenha a composição final em um `<canvas>` oculto em resolução Full HD (1920x1080) e gera o arquivo PNG através de:
     ```typescript
     canvas.toDataURL('image/png')
     ```
   * O download é acionado diretamente no navegador através de um link com atributo `download="meu-setup-pc-academy.png"`, sem requisições de rede e com tempo de renderização inferior a 300 milissegundos.
3. **Selo de Autenticidade do Aluno:**
   * A imagem exportada estampa no canto inferior um selo estilizado com:
     * Nome do Aluno / Equipe.
     * Especificações do PC (CPU, GPU, RAM, Armazenamento).
     * Pontuação obtida na montagem e data da conclusão.

## Consequências
* **Positivas:**
  * Zero custo de servidor e zero tráfego de rede para salvar imagens.
  * Forte apelo emocional e motivacional: os alunos sentem orgulho de ver o "quarto dos sonhos" montado por eles mesmos.
  * Facilidade de avaliação para os professores.
* **Negativas / Mitigações:**
  * Não se trata de renderização 3D fotorrealista com Ray Tracing; no entanto, a estética vetorial limpa Cyber-Industrial e isométrica garante identidade visual marcante e performance fluida a 60 FPS.

