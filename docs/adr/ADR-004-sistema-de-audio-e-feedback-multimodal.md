# ADR-004: Sistema de Áudio Procedural e Feedback Multimodal

## Status
Aprovado

## Contexto
O som tem um papel primordial na montagem de computadores:
* O som tátil de um pente de memória travando com firmeza no slot DIMM.
* A tensão mecânica da alavanca do soquete da CPU.
* O clássico e aguardado **bip único da BIOS (Power-On Self Test)**, que é o ápice emocional de qualquer pessoa que monta um PC pela primeira vez.
* Códigos de erro sonoros (bips longos ou curtos da placa-mãe) usados historicamente por técnicos para diagnosticar problemas quando o computador não dá vídeo.

No entanto, em ambientes escolares:
* A banda de internet pode ser instável, tornando inviável o download de dezenas de megabytes de arquivos `.mp3` ou `.wav`.
* Alguns alunos podem ter fones de ouvido, outros podem estar em caixas de som silenciosas, e alunos com deficiência auditiva precisam de alternativas visuais completas (WCAG 2.2).

## Decisão
1. **Síntese Sonora Procedural via Web Audio API:**
   * Todos os sons fundamentais do jogo (bips de BIOS, cliques mecânicos de slots, ruídos de catraca de parafusos, zumbido de ventoinhas em rampa de aceleração e cliques de relé da fonte) são **gerados matematicamente em tempo de execução via Web Audio API** utilizando osciladores (`OscillatorNode`), filtros (`BiquadFilterNode`) e geradores de envelope de ganho (`GainNode`).
   * *Peso em disco:* **Zero kilobytes de áudio externo**. O código de síntese tem menos de 5kb em JavaScript.
2. **Exemplo do Gerador de Bip da BIOS:**
   * Onda senoidal pura a 800 Hz com envelope de ataque/decaimento de 150 ms para o bip padrão de inicialização bem-sucedida da placa-mãe.
   * Modulações em onda quadrada/dente de serra para alertas de falha de hardware.
3. **Equivalência Multimodal (Acessibilidade Auditiva):**
   * Todo som tem uma contrapartida visual direta e sincronizada:
     * O bip de POST faz o LED de diagnóstico na placa-mãe pulsar em verde e exibe a mensagem de status na tela.
     * Os cliques de fixação de slots exibem pequenas ondas de choque vetoriais (micro-animating pulse) no ponto de contato.
     * Há suporte a legendas de som ativáveis nas opções de acessibilidade.

## Consequências
* **Positivas:**
  * Carregamento 100% instantâneo mesmo na internet mais lenta.
  * Baixa latência: sons disparam no exato milissegundo da interação, sem delay de buffer de streaming de áudio.
  * Inclusão garantida para alunos com diferentes necessidades sensoriais.

