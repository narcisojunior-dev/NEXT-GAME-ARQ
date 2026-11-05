# Atualização do PWA em sala de aula (#24)

## Como funciona
- `ServiceWorkerUpdater` registra `/sw.js?v=<id do build>`. O id vem de `NEXT_PUBLIC_BUILD_ID`
  (commit da Vercel ou `git rev-parse` + carimbo de tempo), gerado em `next.config.mjs`.
  Cada build muda a URL do worker, então o navegador baixa a versão nova sem edição manual.
- Navegação (`request.mode === 'navigate'`): rede primeiro, cache só como fallback offline.
- Arquivos com hash (`/_next/static/`), ícones e modelos GLB: cache primeiro.
- A primeira instalação assume na hora. Uma atualização fica **em espera** e mostra
  "Nova versão disponível — Atualizar". O aluno escolhe quando trocar; o progresso é salvo
  no `localStorage` (#30), então recarregar não perde a montagem.
- Ao ativar, a versão nova apaga os caches das versões antigas.
- Em desenvolvimento (`npm run dev`) o worker não é registrado.

## Teste manual (deploy novo + recarregar)
1. `npm run build && npm start`; abra `http://localhost:3000` e espere carregar (DevTools →
   Application → Service Workers mostra `sw.js?v=<id>` ativo).
2. Monte algumas peças na bancada.
3. Pare o servidor, faça um commit qualquer (ou só rode o build de novo), `npm run build && npm start`.
4. Na aba já aberta, navegue ou recarregue: o aviso "Nova versão disponível" aparece e a
   montagem continua na tela.
5. Toque em **Atualizar**: a página recarrega uma vez, o console não mostra erro de hidratação
   nem de chunk ausente, e as peças montadas continuam lá.
6. Offline (DevTools → Network → Offline) e recarregar: o jogo abre pelo cache.
