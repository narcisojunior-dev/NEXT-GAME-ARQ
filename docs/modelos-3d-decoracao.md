# Modelos 3D de Decoração do Quarto — Candidatos para Download

> Curadoria para o **Modo Decorar o Quarto** ([especificação](./modo-decorar-quarto.md)). Os modelos ainda **não foram baixados**.
> Dados de máquina: [`modelos-3d-decoracao.json`](./modelos-3d-decoracao.json) (68 itens, no formato do `models3d.data.json` com o grupo `DECOR`).

Todos os 68 modelos foram conferidos **um a um** na API pública do Sketchfab em **04/11/2026**: licença **CC BY 4.0** e download liberado. Faces e tamanho do `.glb` são os do arquivo original; o `npm run models:optimize` reduz bastante os dois.

## Critérios da curadoria

| Critério | Regra |
| :--- | :--- |
| Licença | CC BY, CC BY-SA ou CC0 (igual ao `ALLOWED_3D_LICENSES`). Crédito ao autor obrigatório na tela de créditos. |
| Peso | Até 20 mil faces e `.glb` original de até 12 MB. Item de decoração não pode custar mais que uma peça de hardware. |
| Propriedade intelectual | **Nenhum personagem, logotipo ou arte de franquia** (jogos, filmes, animes, quadrinhos, times). Hardware real (consoles, Raspberry Pi, VR) segue a mesma política dos periféricos já aprovados, como o controle de PS5. |
| Escola | Nada de armas, terror ou conteúdo impróprio para menores. |
| Estilo | Low poly ou estilizado, coerente com a bancada. Conferir o visual no link antes de baixar. |

## Como baixar e integrar

1. Abra o link, confira o visual e marque o ☐ da tabela.
2. Copie a entrada correspondente de [`modelos-3d-decoracao.json`](./modelos-3d-decoracao.json) para `src/engine/models3d.data.json` (depende da issue que cria o grupo `DECOR`).
3. Rode `SKETCHFAB_API_TOKEN=... node scripts/download-models.mjs` e depois `npm run models:optimize`, como nos demais modelos ([modelos-3d.md](./modelos-3d.md)).
4. Itens marcados como **pesados** (cadeira gamer, telescópio, computadores antigos, máquina de garra): confira faces e tamanho depois da otimização. Se passar do orçamento da seção 7 da especificação, descarte ou troque.

Campos extras do JSON, usados pelo catálogo de decoração e não pelo visualizador 3D:
- `pack`: `CLASSICO`, `GAMER`, `NERD` ou `MUSEU`;
- `zone`: onde o item pode ficar (`FLOOR`, `WALL`, `DESK`, `SHELF`, `CEILING`);
- `animated`: o `.glb` traz animação (ventilador, neon, robô);
- `sourceGlbMB` / `maxTextureSource`: tamanho e textura máxima antes da otimização.

## Modelos por pacote

### Pacote Clássico — o quarto básico

Base de qualquer tema. Desbloqueado assim que o PC liga na mesa. 29 modelos · 61.343 faces · 39,1 MB antes da otimização.

| ☐ | id | Modelo | Autor | Faces | .glb | Onde fica | Observação |
| :---: | :--- | :--- | :--- | ---: | ---: | :--- | :--- |
| ☐ | `decor-cama` | [Poliform_Bed](https://sketchfab.com/3d-models/16070c2e6faa405391ab7ada8bb0aed6) | [lex_ram](https://sketchfab.com/lex_ram) | 5.325 | 2,6 MB | chão | Cama de casal moderna. |
| ☐ | `decor-beliche` | [Bunk Bed](https://sketchfab.com/3d-models/f342f50a8eda4e6fafcdb4f057be5792) | [pythagean](https://sketchfab.com/pythagean) | 1.046 | 0,2 MB | chão | Beliche leve, sem textura. |
| ☐ | `decor-criado-mudo` | [Adjustable Bedside Table](https://sketchfab.com/3d-models/e3ef6fd54af440efa31984214dd6f11d) | [EDIIIC](https://sketchfab.com/EDIIIC) | 3.036 | 3,8 MB | chão | Criado-mudo ao lado da cama. |
| ☐ | `decor-guarda-roupa` | [Stylized Wardrobe](https://sketchfab.com/3d-models/66aa34d1c9964289860e4c557036d99e) | [stefanhagewoud](https://sketchfab.com/stefanhagewoud) | 802 | 1,5 MB | chão | Guarda-roupa estilizado. |
| ☐ | `decor-estante-parede` | [Wooden Wall Bookshelf](https://sketchfab.com/3d-models/96a804790eff41b3b2376f3608fde7df) | [sanzid](https://sketchfab.com/sanzid) | 724 | 2,0 MB | parede | Prateleira de parede: recebe itens pequenos. |
| ☐ | `decor-estante-decorada` | [Low Poly Bookshelf with Books, Plants and Bear](https://sketchfab.com/3d-models/793a35b77b6342ed94d00c812ff1dc5f) | [aleksandran2899](https://sketchfab.com/aleksandran2899) | 4.034 | 0,4 MB | chão | Estante já com livros, plantas e urso. |
| ☐ | `decor-puff` | [Bean Bag Chair](https://sketchfab.com/3d-models/9b59c5bb20704c0b83853af05e7fff5c) | [khanhnguyen1189](https://sketchfab.com/khanhnguyen1189) | 464 | 1,2 MB | chão | Puff (bean bag). |
| ☐ | `decor-luminaria-mesa` | [office lamp](https://sketchfab.com/3d-models/d934c6b791c34e0fafc30e9625b4c55c) | [maxdragon](https://sketchfab.com/maxdragon) | 2.546 | 0,2 MB | mesa | Luminária articulada de mesa. |
| ☐ | `decor-luminaria-teto` | [ceiling lamps](https://sketchfab.com/3d-models/d6cee77afe814624b12a99b0dafa2ce7) | [lucq22](https://sketchfab.com/lucq22) | 1.812 | 3,0 MB | teto | Pacote de luminárias pendentes. |
| ☐ | `decor-ventilador-teto` | [Ceiling Fan](https://sketchfab.com/3d-models/ec2c6087d4824211abc827f2a4c2b578) | [mozillareality](https://sketchfab.com/mozillareality) | 297 | 0,2 MB | teto | Ventilador de teto leve (pode girar). 🎞️ animado. |
| ☐ | `decor-ar-condicionado` | [Air conditioner pack](https://sketchfab.com/3d-models/3b930497c77f47269847e75b9ee85b20) | [ngdkh](https://sketchfab.com/ngdkh) | 1.462 | 2,5 MB | parede | Pacote de ar-condicionado split. |
| ☐ | `decor-relogio-parede` | [Wall Clock](https://sketchfab.com/3d-models/2e964ac0242e4b1789adfd9549c653dc) | [felipeprodev](https://sketchfab.com/felipeprodev) | 798 | 3,7 MB | parede | Relógio de parede (ponteiros podem marcar a hora real). |
| ☐ | `decor-persiana` | [Window Blinds](https://sketchfab.com/3d-models/883b037fccfd48d1910e1c1b799381c5) | [james](https://sketchfab.com/james) | 736 | 0,1 MB | parede | Persiana para a janela. |
| ☐ | `decor-moldura-poster` | [Poster Frame](https://sketchfab.com/3d-models/fb500d75d785433c8b82fdafac9e18cb) | [rkochstudent](https://sketchfab.com/rkochstudent) | 70 | 0,0 MB | parede | Moldura simples: recebe arte gerada pelo jogo. |
| ☐ | `decor-poster-branco` | [Blank Poster (18x24 inches)](https://sketchfab.com/3d-models/f49d0da5b0d0438981641daf1269befd) | [Marghunk](https://sketchfab.com/Marghunk) | 512 | 0,0 MB | parede | Pôster em branco 18x24: recebe arte original/conquistas. |
| ☐ | `decor-quadro` | [Picture Frame](https://sketchfab.com/3d-models/0ad9f5f4d1644317814a1c7934ff9624) | [XMorningstar](https://sketchfab.com/XMorningstar) | 1.812 | 0,1 MB | parede | Porta-retrato/quadro sem textura. |
| ☐ | `decor-tapete-redondo` | [Low-Poly Circle Rug](https://sketchfab.com/3d-models/2482ea3b59a545c7848bde5ecc06da08) | [Ellemieke25](https://sketchfab.com/Ellemieke25) | 84 | 0,0 MB | chão | Tapete redondo. |
| ☐ | `decor-tapete-retangular` | [Carpet FREE](https://sketchfab.com/3d-models/91beecf53c424974977ceda4d0ce23bf) | [malovsky](https://sketchfab.com/malovsky) | 192 | 1,3 MB | chão | Tapete retangular. |
| ☐ | `decor-plantas` | [Optimized Potted Plants](https://sketchfab.com/3d-models/967b4bf23fac4098993776fcfc2d3318) | [Nicholas01](https://sketchfab.com/Nicholas01) | 1.770 | 2,1 MB | chão | Pacote de vasos (chão e mesa). |
| ☐ | `decor-planta-jade` | [🪴pot plant - Jade plant🪴](https://sketchfab.com/3d-models/8eca20f60a97426daa07df0b9de50fd6) | [gulvtaepper](https://sketchfab.com/gulvtaepper) | 463 | 0,1 MB | mesa | Planta jade pequena para a mesa. |
| ☐ | `decor-suculentas` | [Cactuses and succulents](https://sketchfab.com/3d-models/69cb0c80e51a41a0b6fea471d2141922) | [xenia.lipilina](https://sketchfab.com/xenia.lipilina) | 8.168 | 0,4 MB | mesa | Cactos e suculentas. |
| ☐ | `decor-lixeira` | [Trash Can](https://sketchfab.com/3d-models/0ad3407cd8104ba58f71885c0e58ca9a) | [Tim0](https://sketchfab.com/Tim0) | 1.070 | 3,1 MB | chão | Lixeira. |
| ☐ | `decor-caneca` | [Coffee Mug (School Project)](https://sketchfab.com/3d-models/5f5ccee1514c440887c072fae8e0d699) | [FrenchBaguette](https://sketchfab.com/FrenchBaguette) | 536 | 0,6 MB | mesa | Caneca (projeto escolar do autor). |
| ☐ | `decor-livros` | [Low poly books](https://sketchfab.com/3d-models/89c9071f045a4bc8ac4e662368086508) | [spicybamer](https://sketchfab.com/spicybamer) | 536 | 1,5 MB | prateleira | Livros low poly. |
| ☐ | `decor-violao` | [DD Acoustic Guitar](https://sketchfab.com/3d-models/4eeb8f55c0de4521af948a343094baa4) | [piscopancer](https://sketchfab.com/piscopancer) | 6.268 | 0,5 MB | chão | Violão encostado na parede. |
| ☐ | `decor-skate` | [Skateboard](https://sketchfab.com/3d-models/0f7b8ea366654674b217a743959798e7) | [Jamoues](https://sketchfab.com/Jamoues) | 5.464 | 3,6 MB | chão | Skate (mesmo autor do HD 3,5"). |
| ☐ | `decor-bola-futebol` | [Soccer Ball](https://sketchfab.com/3d-models/46c91864ef384158b0078e20bdbfe3e9) | [typhomnt](https://sketchfab.com/typhomnt) | 7.044 | 2,7 MB | chão | Bola de futebol genérica. |
| ☐ | `decor-caixa-som-bt` | [Bluetooth Speaker](https://sketchfab.com/3d-models/45f7cf92b5b94d14aa214b478df678b3) | [Ramanan](https://sketchfab.com/Ramanan) | 1.080 | 1,5 MB | mesa | Caixa de som bluetooth genérica. |
| ☐ | `decor-lava` | [Lava Lamp](https://sketchfab.com/3d-models/482f9944e47d4084990605c356684407) | [lauren.obj](https://sketchfab.com/lauren.obj) | 3.192 | 0,2 MB | mesa | Lâmpada de lava. |

### Pacote Gamer

Fliperama, retrô, neon e streaming. Desbloqueado por conquistas de montagem e desafio. 19 modelos · 85.610 faces · 45,5 MB antes da otimização.

| ☐ | id | Modelo | Autor | Faces | .glb | Onde fica | Observação |
| :---: | :--- | :--- | :--- | ---: | ---: | :--- | :--- |
| ☐ | `decor-fliperama` | [Cyberpunk Arcade Machine](https://sketchfab.com/3d-models/5a2ec1fb48be42efa91f44f4de90201e) | [goldie](https://sketchfab.com/goldie) | 1.616 | 8,0 MB | chão | Fliperama estilo cyberpunk. Conferir a arte da tela (sem marcas de jogos). |
| ☐ | `decor-maquina-garra` | [Claw Machine](https://sketchfab.com/3d-models/1bb221027d914639907eb6ea7f1551af) | [reinhold](https://sketchfab.com/reinhold) | 12.095 | 7,0 MB | chão | Máquina de pegar bichinho. |
| ☐ | `decor-tv-crt` | [Vintage TV Free](https://sketchfab.com/3d-models/ed92cac6b8d64ea48ea4f91ce9bf350b) | [donnichols](https://sketchfab.com/donnichols) | 3.326 | 3,0 MB | mesa | TV de tubo para o canto retrô. |
| ☐ | `decor-console-retro` | [PSX PS1 Console & Controller](https://sketchfab.com/3d-models/21ce3135bf6c41ec86c3e7de1c233d7d) | [Tomitos_](https://sketchfab.com/Tomitos_) | 268 | 0,1 MB | prateleira | Console retrô + controle (hardware real, mesma política do controle de PS5 já usado). |
| ☐ | `decor-atari` | [Atari 2600](https://sketchfab.com/3d-models/a72bfe5653f2458fb8be1c6165ed0d8a) | [juanotron](https://sketchfab.com/juanotron) | 8.298 | 0,5 MB | prateleira | Console clássico de 1977 (hardware real; vira peça do Museu do PC também). |
| ☐ | `decor-arcade-stick` | [Arcade Stick](https://sketchfab.com/3d-models/bf69ebc422bd442c9019092efae91d6f) | [thomasnalevaiko](https://sketchfab.com/thomasnalevaiko) | 3.194 | 3,3 MB | mesa | Controle arcade (arcade stick). 🎞️ animado. |
| ☐ | `decor-portatil-retro` | [Gameboy Challenge](https://sketchfab.com/3d-models/1c7378f4de9b4ff99e58d01ca132ad89) | [Rika.Mardjaja](https://sketchfab.com/Rika.Mardjaja) | 1.616 | 0,8 MB | prateleira | Portátil retrô (hardware real). |
| ☐ | `decor-oculos-vr` | [Oculus Quest VR Headset](https://sketchfab.com/3d-models/0d6c1d6aa3f747a5b35f8105ed585418) | [blackcube4](https://sketchfab.com/blackcube4) | 10.504 | 3,1 MB | mesa | Óculos de realidade virtual (mesmo autor da RAM Crucial). |
| ☐ | `decor-cadeira-gamer` | [Gaming Chair](https://sketchfab.com/3d-models/ccb3ada5917a4b90b689e1d1bf852dc2) | [Kiiba](https://sketchfab.com/Kiiba) | 13.529 | 10,3 MB | chão | Cadeira gamer. Pesada: conferir resultado do models:optimize. |
| ☐ | `decor-neon-controle` | [neon game controller](https://sketchfab.com/3d-models/c78e6569e8084bd3b5ab5df8ad25f033) | [alina_dreiman](https://sketchfab.com/alina_dreiman) | 348 | 0,0 MB | parede | Neon em forma de controle de videogame. |
| ☐ | `decor-neon-cyberpunk` | [Cyberpunk animated japanese LED neon sign](https://sketchfab.com/3d-models/fab087c62fc3459a8b7664757d980c28) | [ydvisual](https://sketchfab.com/ydvisual) | 328 | 3,4 MB | parede | Letreiro neon ANIMADO (ideograma japonês genérico). 🎞️ animado. |
| ☐ | `decor-espuma-acustica` | [Acoustic Foam Tile](https://sketchfab.com/3d-models/b9cb9e2957c147a88fd6b07e885c6ade) | [bloobloo](https://sketchfab.com/bloobloo) | 1.086 | 0,3 MB | parede | Placa de espuma acústica (repetida em grade na parede). |
| ☐ | `decor-suporte-headset` | [Free Headphone Stand](https://sketchfab.com/3d-models/02aa83d2096447519a0ca9a09471118c) | [Alex_Radu](https://sketchfab.com/Alex_Radu) | 5.204 | 0,5 MB | mesa | Suporte para os headsets que já existem no jogo. |
| ☐ | `decor-frigobar` | [Low-Poly Mini Fridge](https://sketchfab.com/3d-models/c196893cbc384a2cb01adddf0c61c54c) | [TepidGames](https://sketchfab.com/TepidGames) | 1.196 | 0,1 MB | chão | Frigobar low poly. |
| ☐ | `decor-pelucias-garra` | [Arcade Crane Game Stuffed Bears Game Model](https://sketchfab.com/3d-models/65568ca348db4ba48d6e85c5182d20c3) | [Suvalien](https://sketchfab.com/Suvalien) | 4.180 | 0,7 MB | prateleira | Ursinhos de máquina de garra. 🎞️ animado. |
| ☐ | `decor-pelucia-tubarao` | [Plushie Shark](https://sketchfab.com/3d-models/875414d5e45c42f9a5323ba8a8beed19) | [QuazrSCI](https://sketchfab.com/QuazrSCI) | 3.708 | 1,9 MB | prateleira | Pelúcia de tubarão. |
| ☐ | `decor-vitrine` | [Metal Display Cabinet](https://sketchfab.com/3d-models/278d34271be24efba889ea38e3bf9dd6) | [nobbyt76](https://sketchfab.com/nobbyt76) | 5.328 | 0,7 MB | chão | Vitrine para troféus e colecionáveis. |
| ☐ | `decor-trofeu` | [Trophy](https://sketchfab.com/3d-models/cafed175700143669f1786dd04d84b6b) | [Urielgc](https://sketchfab.com/Urielgc) | 8.062 | 0,4 MB | prateleira | Troféu (recompensa de conquistas). |
| ☐ | `decor-cubo-magico` | [rubik's cube](https://sketchfab.com/3d-models/155420e09a124ec3a3bcca0852280672) | [ShivanshSingh](https://sketchfab.com/ShivanshSingh) | 1.724 | 1,4 MB | mesa | Cubo mágico. |

### Pacote Nerd & Ciência

RPG de mesa, espaço, robótica e laboratório. Desbloqueado por conquistas de diagnóstico, benchmark e Modo Orçamento. 16 modelos · 86.498 faces · 33,3 MB antes da otimização.

| ☐ | id | Modelo | Autor | Faces | .glb | Onde fica | Observação |
| :---: | :--- | :--- | :--- | ---: | ---: | :--- | :--- |
| ☐ | `decor-d20` | [Dice D20](https://sketchfab.com/3d-models/2d29634374eb4893a76a48132663d5a7) | [dutrabr98](https://sketchfab.com/dutrabr98) | 476 | 0,7 MB | mesa | Dado de 20 faces (RPG de mesa). |
| ☐ | `decor-dados-rpg` | [DnD Dice Set](https://sketchfab.com/3d-models/51a01c6f714944ea95d9a2d24eb24928) | [Logan_S](https://sketchfab.com/Logan_S) | 4.900 | 4,3 MB | mesa | Conjunto de dados de RPG. |
| ☐ | `decor-xadrez` | [Low Poly Chess Set](https://sketchfab.com/3d-models/0f440e2b01ca42f8b3fdee8178c51f20) | [hanoldaa](https://sketchfab.com/hanoldaa) | 8.564 | 0,7 MB | mesa | Tabuleiro de xadrez low poly. |
| ☐ | `decor-telescopio` | [Telescope](https://sketchfab.com/3d-models/7220b6283360440fbbf8ccff08e25a7f) | [topfrank2013](https://sketchfab.com/topfrank2013) | 17.533 | 6,7 MB | chão | Telescópio. Pesado em faces: conferir otimização. |
| ☐ | `decor-capacete-astronauta` | [Astronaut Helmet](https://sketchfab.com/3d-models/315605194a474c7b95cd2a9083985d22) | [Medhatelo](https://sketchfab.com/Medhatelo) | 10.828 | 2,8 MB | prateleira | Capacete de astronauta. 🎞️ animado. |
| ☐ | `decor-terra` | [PS1 style low poly Earth](https://sketchfab.com/3d-models/4182142d89c143bcaad5910fc30b27e3) | [albert_buscio](https://sketchfab.com/albert_buscio) | 960 | 0,2 MB | teto | Terra estilo PS1 (móbile de planetas). |
| ☐ | `decor-sol` | [PS1 style low poly Sun](https://sketchfab.com/3d-models/9f2b6f87811242b8b6313b42667122cf) | [albert_buscio](https://sketchfab.com/albert_buscio) | 960 | 0,5 MB | teto | Sol estilo PS1 (móbile de planetas). |
| ☐ | `decor-jupiter` | [Jupiter - Free Downloadable Model](https://sketchfab.com/3d-models/61671f29ca0a4fa39dc9653290282418) | [murilo.kleine](https://sketchfab.com/murilo.kleine) | 3.072 | 2,6 MB | teto | Júpiter (móbile de planetas). 🎞️ animado. |
| ☐ | `decor-robo` | [Robot CLN-R (School Project)](https://sketchfab.com/3d-models/9a793a9293fb4ec89936aebfda8fc434) | [FrenchBaguette](https://sketchfab.com/FrenchBaguette) | 5.521 | 0,4 MB | prateleira | Robô (projeto escolar do autor da caneca). |
| ☐ | `decor-robo-fofo` | [cute robot](https://sketchfab.com/3d-models/6aadb75f596742ada2814ad4593f0032) | [victory_](https://sketchfab.com/victory_) | 3.330 | 0,1 MB | prateleira | Robozinho fofo. 🎞️ animado. |
| ☐ | `decor-microscopio` | [Microscope](https://sketchfab.com/3d-models/2435e338bf7541a4b919e53df50eeeea) | [veerubyinc](https://sketchfab.com/veerubyinc) | 4.679 | 3,1 MB | mesa | Microscópio. |
| ☐ | `decor-raspberry-pi` | [Raspberry Pi 3](https://sketchfab.com/3d-models/2d308283fc0f4d27b81f17a2793c5c4d) | [josaco](https://sketchfab.com/josaco) | 6.851 | 2,7 MB | mesa | Raspberry Pi 3: gancho para falar de computadores de placa única. |
| ☐ | `decor-arduino` | [Arduino UNO - Low Poly](https://sketchfab.com/3d-models/43cebeb50dc14ab490b553f0a0077eb9) | [spark-games](https://sketchfab.com/spark-games) | 2.196 | 1,2 MB | mesa | Arduino UNO: gancho para robótica/maker. |
| ☐ | `decor-drone` | [Drone Low Poly](https://sketchfab.com/3d-models/1898e02633f94722b9ee91e0c208ad3c) | [Batuhan13](https://sketchfab.com/Batuhan13) | 2.080 | 1,7 MB | prateleira | Drone low poly (civil). |
| ☐ | `decor-toca-discos` | [CUTE TURNTABLES](https://sketchfab.com/3d-models/207f5c60d5864f359b63b300e3845e28) | [ddamlayagli](https://sketchfab.com/ddamlayagli) | 5.008 | 0,3 MB | mesa | Toca-discos estilizado. |
| ☐ | `decor-globo` | [Desk Globe](https://sketchfab.com/3d-models/762984f66eb34f9e9b04959a755d190d) | [Proframe_Studios](https://sketchfab.com/Proframe_Studios) | 9.540 | 5,3 MB | mesa | Globo terrestre de mesa. |

### Pacote Museu do PC

Computadores antigos para uma linha do tempo da computação. Desbloqueado ao concluir a campanha. 4 modelos · 23.108 faces · 4,4 MB antes da otimização.

| ☐ | id | Modelo | Autor | Faces | .glb | Onde fica | Observação |
| :---: | :--- | :--- | :--- | ---: | ---: | :--- | :--- |
| ☐ | `decor-pc-anos-90` | [Retro CRT Computer (1990s Desktop PC)](https://sketchfab.com/3d-models/ea9faf1298d24497b916c27a4ea38636) | [MadeByYeshe](https://sketchfab.com/MadeByYeshe) | 2.416 | 2,6 MB | mesa | PC de mesa dos anos 90 com monitor CRT. |
| ☐ | `decor-terminal-ibm` | [IBM 3178](https://sketchfab.com/3d-models/891ae8149d8547a5971381237d13e2e6) | [maxdragon](https://sketchfab.com/maxdragon) | 4.442 | 0,6 MB | mesa | Terminal de mainframe (hardware real, década de 1980). |
| ☐ | `decor-pc-retro-psx` | [PSX Retro Computer](https://sketchfab.com/3d-models/7e7f8a9dfa1f4b34abde94bb02b9f46c) | [Tomitos_](https://sketchfab.com/Tomitos_) | 194 | 0,2 MB | prateleira | Computador retrô miniatura (baixíssimo custo). |
| ☐ | `decor-computadores-antigos` | [Old Computers](https://sketchfab.com/3d-models/7bb6e720499a467b8e0427451d180063) | [RafaelBR873D](https://sketchfab.com/RafaelBR873D) | 16.056 | 1,0 MB | chão | Pacote de computadores antigos (16 mil faces: usar só no Museu). |
## Feitos por código, sem download

Estes itens ficam melhores e mais leves gerados em three.js do que baixados, e não têm risco de licença:

| Item | Como |
| :--- | :--- |
| Fita LED atrás da mesa e do monitor | Malha fina com material emissivo; cor e animação (respirar, arco-íris, onda) controladas pelo tema. Respeita `prefers-reduced-motion`. |
| Painéis hexagonais de luz | `CylinderGeometry` de 6 lados em grade na parede, emissivos, com padrões de cor. |
| Pôsteres e quadros com arte original | Textura de `<canvas>` aplicada na `decor-moldura-poster` / `decor-poster-branco`: arte pixel original do jogo, mapa de soquetes, gráfico de FPS do aluno, certificado e foto do setup. |
| Letreiros neon com texto | Texto do aluno (até 12 caracteres, filtrado) em tubo emissivo. Ex.: o nome da equipe. |
| Paredes, piso e janela | Geometria simples com cores e materiais por tema, expandindo o `LaboratoryRoom` atual. |

## Avaliados e rejeitados

| Modelo(s) | Motivo |
| :--- | :--- |
| Quarto do Pokémon FireRed, Kirby Arcade, Final Fight Arcade, Dance Dance Revolution, pacman arcade, Sonic eggmobile, Super Mario 8-bits, Game Boy "Pokémon" | Personagens e marcas de jogos. |
| Darth Vader Funko, Dracule Mihawk, Rocket Raccoon, Xenomorph, NerveGear, Flandre Fumo, Komi San, Madoka, Sans (Undertale), bobblehead NCR, Juggernog, Among Us, Transformers, DOOM | Personagens e marcas de filmes, animes e jogos. |
| Teclas Superman/Flash/DC, neon The Flash, pôsteres de Alien e FNAF, medalhas de Fortnite, troféu e bola da FIFA, bola do Rocket League, Blade Runner Arcade, Cyberpunk 2077 Quadra | Marcas e franquias. |
| Máquina da Coca-Cola, Apple Mothership | Marcas registradas como tema principal. |
| Armas (cartuchos, rifles, revólver) e pinturas de terror (Beksiński) | Impróprio para a escola. |
| Bola de basquete (10,7 MB), Medieval Book Stack (11,1 MB), Old wall clock (11,3 MB), cadeira e luminárias acima de 10 MB | Pesados demais para decoração; há alternativas leves na lista. |
| Pacotes PSX (tapetes, guarda-roupa, relógios) | Licença OK, mas o estilo pixelado destoa da bancada. Reserva caso o tema Vaporwave peça um visual retrô. |
