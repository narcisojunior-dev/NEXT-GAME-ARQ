# Modelos 3D — Lista de Download e Créditos

Fonte única: [`src/engine/models3d.data.json`](../src/engine/models3d.data.json). Todos os modelos foram conferidos na API pública do Sketchfab em 02/11/2026: baixáveis e com licença CC BY, CC BY-SA ou CC0.

## Como adicionar um modelo ao jogo

1. Entre no Sketchfab com a conta da equipe e abra o link do modelo.
2. Clique em **Download 3D Model** e escolha o formato **glTF Binary (.glb)**.
3. Salve como `assets-src/models/<id>.glb`, usando o **id** da tabela (ex: `gpu-rx-6700xt.glb`).
4. Rode `npm run models:optimize`. O script reduz as faces, comprime a geometria e as texturas, grava em `public/models/` e libera o botão "Ver em 3D".

**Ilustrativo** = o modelo representa a categoria, mas não é exatamente o produto do catálogo; o visualizador avisa o aluno. Peças sem modelo compatível (ex: CPUs AM5 e memórias DDR5) continuam só com a ilustração 2D, para não ensinar um formato errado.

## Componentes

| id | Modelo | Autor | Licença | Faces | Usado em | Ilustrativo | Status |
| :--- | :--- | :--- | :--- | ---: | :--- | :---: | :--- |
| `cpu-intel-lga1700` | [(FREE) intel cpu](https://sketchfab.com/3d-models/fe534a3cae7c4e66b6131da9b5dae6ff) | [moonway3d](https://sketchfab.com/moonway3d) | CC BY 4.0 | 11206 | `cpu-i5-13400f`, `cpu-i7-13700k` | sim | baixado (0.19 MB) |
| `cpu-intel-simples` | [Intel CPU - Dirty](https://sketchfab.com/3d-models/89904e625a6b4a098030045f0f0faa24) | [jcbinet](https://sketchfab.com/jcbinet) | CC BY 4.0 | 368 | `cpu-i3-12100` | sim | baixado (0.09 MB) |
| `cpu-ryzen-am4` | [CPU Ryzen 5 3600](https://sketchfab.com/3d-models/249fb5e8c1e94686a2c2b1cd6df72bc5) | [bazyaev08](https://sketchfab.com/bazyaev08) | CC BY 4.0 | 26300 | `cpu-r5-5600` | sim | baixado (0.74 MB) |
| `mb-z790-atx` | [Motherboard MSI Z790 Low Poly](https://sketchfab.com/3d-models/7ac2ed91599a4239aba96770a00874ce) | [cityon360](https://sketchfab.com/cityon360) | CC BY 4.0 | 4516 | `mb-z790-max` | sim | baixado (0.27 MB) |
| `mb-generica` | [Motherboard](https://sketchfab.com/3d-models/02acc04c6ac743b28d6591763afe0a50) | [user12350](https://sketchfab.com/user12350) | CC BY 4.0 | 10056 | vitrine | sim | baixado (0.39 MB) |
| `ram-ddr4-crucial` | [Crucial 8 GB DDR4 2133 RAM](https://sketchfab.com/3d-models/6fa0d3b8c5684741be7d7e396e01bc9f) | [blackcube4](https://sketchfab.com/blackcube4) | CC BY 4.0 | 2428 | `ram-8gb-d4-single`, `ram-16gb-d4-dual` | sim | baixado (0.18 MB) |
| `ram-ddr4-rgb-corsair` | [RAM Corsair Vengeance DDR4 RGB Pro](https://sketchfab.com/3d-models/ee5c6e6b2e524d63a7043365e73a2420) | [lime.ball.animations.official](https://sketchfab.com/lime.ball.animations.official) | CC BY 4.0 | 2824 | vitrine | não | baixado (0.09 MB) |
| `ram-generica` | [Random Access Memory - RAM Stick - PC](https://sketchfab.com/3d-models/ab2b1c25c31b44c1a757911734bdf942) | [empty_mirror](https://sketchfab.com/empty_mirror) | CC BY 4.0 | 3699 | vitrine | sim | baixado (0.10 MB) |
| `cooler-torre` | [CPU Cooler](https://sketchfab.com/3d-models/672a0a74a98c452a862016bee99f3579) | [bazyaev08](https://sketchfab.com/bazyaev08) | CC BY 4.0 | 6504 | `cooler-deepcool-ag400` | sim | baixado (0.40 MB) |
| `cooler-noctua-nh-d15` | [Noctua NH-D15 CPU cooler](https://sketchfab.com/3d-models/23e225925e174a9f929d995cd9bd22e2) | [SzaBa](https://sketchfab.com/SzaBa) | CC BY 4.0 | 10676 | vitrine | não | baixado (0.08 MB) |
| `cooler-aio-240` | [liquid-cooler](https://sketchfab.com/3d-models/1c60872e45144239aadb4e188c43bce3) | [snrnsrk5](https://sketchfab.com/snrnsrk5) | CC BY 4.0 | 7768 | `cooler-water-240mm` | sim | baixado (0.07 MB) |
| `fan-lian-li-sl120` | [Lian Li UNI FAN SL120 RGB BLACK](https://sketchfab.com/3d-models/5abd0d8e89ea4241b7216f4b6d5a2ca4) | [DIEKO](https://sketchfab.com/DIEKO) | CC BY 4.0 | 4648 | vitrine | não | baixado (0.05 MB) |
| `fan-corsair` | [Corsair Fan](https://sketchfab.com/3d-models/27f023b65e814d1c946460fcc0cb8250) | [umkhero](https://sketchfab.com/umkhero) | CC BY 4.0 | 4832 | vitrine | não | baixado (0.04 MB) |
| `gpu-rx-6700xt` | [GPU AMD RX 6700 XT](https://sketchfab.com/3d-models/648b333a485040f68c6d47d166ee7532) | [BlenderFace1](https://sketchfab.com/BlenderFace1) | CC BY 4.0 | 7620 | `gpu-rx-6700xt` | não | baixado (0.77 MB) |
| `gpu-rx-570` | [PowerColor RADEON RX 570 Graphics card](https://sketchfab.com/3d-models/5a8b14b3d3cd4ae3acd6532e4ec505aa) | [jiet17](https://sketchfab.com/jiet17) | CC BY 4.0 | 7552 | `gpu-rx-6600` | sim | baixado (0.38 MB) |
| `gpu-rtx-3060ti` | [RTX 3060 TI - LOW POLY](https://sketchfab.com/3d-models/b65c5c0807be4ece9a95090d1a1794bb) | [alexlh2003](https://sketchfab.com/alexlh2003) | CC BY 4.0 | 14215 | `gpu-rtx-4060` | sim | baixado (0.13 MB) |
| `gpu-rtx-3080-msi` | [MSI RTX 3080 Graphics card](https://sketchfab.com/3d-models/e5c384afae914d548a591f722e1878fc) | [kaif.3d](https://sketchfab.com/kaif.3d) | CC BY 4.0 | 21917 | `gpu-rtx-4070-super` | sim | baixado (0.66 MB) |
| `ssd-nvme-990pro` | [M.2 NVME SSD Samsung 990 Pro 1TB 3D model](https://sketchfab.com/3d-models/41b7bfda7eab40f8b13330913fd66fc2) | [lime.ball.animations.official](https://sketchfab.com/lime.ball.animations.official) | CC BY 4.0 | 2052 | `ssd-samsung-990pro`, `ssd-nvme-1tb` | sim | baixado (0.29 MB) |
| `ssd-sata-25` | [SSD NoName Sata](https://sketchfab.com/3d-models/5a182a80361f407e965adaaee077e3cd) | [hlupich](https://sketchfab.com/hlupich) | CC BY 4.0 | 4126 | `ssd-sata-480gb` | sim | baixado (0.03 MB) |
| `ssd-sata-samsung` | [Samsung SSD 2.5in - Dirty](https://sketchfab.com/3d-models/dcc1150ede274cccb7f2ddc0f2345dcb) | [jcbinet](https://sketchfab.com/jcbinet) | CC BY 4.0 | 918 | vitrine | não | baixado (0.04 MB) |
| `hdd-35` | [Hard Drive](https://sketchfab.com/3d-models/946666a390b44c90901e7dd07fb509a5) | [Jamoues](https://sketchfab.com/Jamoues) | CC BY-SA 4.0 | 5131 | `hdd-seagate-2tb` | sim | baixado (0.28 MB) |
| `psu-modular` | [PSU Power Supply Unit](https://sketchfab.com/3d-models/69ccd1be3a77497cb2acc9e39e7c52b3) | [dhafintaufiqi21](https://sketchfab.com/dhafintaufiqi21) | CC BY 4.0 | 12488 | `psu-750w-gold` | sim | baixado (0.10 MB) |
| `psu-atx` | [Power Supply](https://sketchfab.com/3d-models/28df0f2fc76f4bc181492e6c1f3e5231) | [its.przvl._](https://sketchfab.com/its.przvl._) | CC BY 4.0 | 7980 | `psu-650w-bronze`, `psu-500w-white` | sim | baixado (0.13 MB) |
| `case-corsair-4000d` | [Corsair 4000D  PC case](https://sketchfab.com/3d-models/bc15e007d6634579bc0e8ffdf238e665) | [SzaBa](https://sketchfab.com/SzaBa) | CC BY 4.0 | 7686 | `case-gamer-mesh` | sim | baixado (0.65 MB) |
| `case-compacto` | [Computer case](https://sketchfab.com/3d-models/3cb0c95b955747aea22476264eecf390) | [simonpasi96](https://sketchfab.com/simonpasi96) | CC BY 4.0 | 548 | `case-office-compact` | sim | baixado (0.15 MB) |

## Periféricos

| id | Modelo | Autor | Licença | Faces | Usado em | Ilustrativo | Status |
| :--- | :--- | :--- | :--- | ---: | :--- | :---: | :--- |
| `monitor-24-office` | [Computer Monitor Lowpoly Model](https://sketchfab.com/3d-models/1d4ee42eda804b02b05b63721921c1d7) | [marcoZakaria](https://sketchfab.com/marcoZakaria) | CC BY 4.0 | 1004 | `mon-24-75hz` | sim | baixado (0.01 MB) |
| `monitor-27-gamer` | [Basic PC Monitors](https://sketchfab.com/3d-models/58a2dba70e4f4752962ee98a9d6827be) | [sousinho](https://sketchfab.com/sousinho) | CC BY 4.0 | 4636 | `mon-27-180hz` | sim | baixado (0.12 MB) |
| `monitor-ultrawide` | [Ultra-Wide Monitor](https://sketchfab.com/3d-models/f7445b4b5d84412aa58ed7379483267c) | [Dumb_Yet_Creative](https://sketchfab.com/Dumb_Yet_Creative) | CC BY 4.0 | 6570 | `mon-34-ultrawide` | sim | baixado (0.13 MB) |
| `monitor-curvo-gamer` | [Curved Gaming Monitor](https://sketchfab.com/3d-models/2d272e0133524db9b6503d5d265b2278) | [DatSketch](https://sketchfab.com/DatSketch) | CC BY 4.0 | 1628 | vitrine | não | baixado (0.02 MB) |
| `teclado-membrana` | [Keyboard](https://sketchfab.com/3d-models/66f5ca31bf154c82ae5284a32a362a4e) | [oscarherry3d](https://sketchfab.com/oscarherry3d) | CC BY 4.0 | 4874 | `kb-membrane-office` | sim | baixado (0.24 MB) |
| `teclado-mecanico` | [Mechanical keyboard](https://sketchfab.com/3d-models/1ba4055c33674567b51b783701ed05ce) | [FelikinRuslan](https://sketchfab.com/FelikinRuslan) | CC BY 4.0 | 11128 | `kb-mech-tkl-red` | sim | baixado (0.23 MB) |
| `teclado-mecanico-custom` | [Mechanical Keyboard - Aesthetic](https://sketchfab.com/3d-models/44bb12d306864e2cb4256a61d4168942) | [mreslan](https://sketchfab.com/mreslan) | CC BY 4.0 | 18056 | `kb-mech-60-blue` | sim | baixado (0.35 MB) |
| `combo-teclado-mouse-rgb` | [RGB Keyboard and Mouse](https://sketchfab.com/3d-models/df00ce3e66dc4b75a5f9b49c2e6b1406) | [leyjames](https://sketchfab.com/leyjames) | CC BY 4.0 | 26766 | vitrine | não | baixado (0.26 MB) |
| `mouse-gamer` | [Computer Mouse (low-poly)](https://sketchfab.com/3d-models/95eb7d0363bb4db79bd50168280ea1c7) | [LagzDesign](https://sketchfab.com/LagzDesign) | CC BY 4.0 | 1198 | `mouse-gamer-65g` | sim | baixado (0.02 MB) |
| `mousepad-gamer` | [Silver Crest Gaming Mousepad](https://sketchfab.com/3d-models/8c551e4f6bf248db99aa77a3d0221497) | [Cymen05](https://sketchfab.com/Cymen05) | CC BY 4.0 | 296 | vitrine | não | baixado (0.03 MB) |
| `headphone-estudio` | [Sony MDR-7506 Headphones](https://sketchfab.com/3d-models/05735b74d3524f00b648231138122a28) | [AndreiVNK](https://sketchfab.com/AndreiVNK) | CC BY 4.0 | 10795 | `audio-headset-71` | sim | baixado (0.37 MB) |
| `headphone-bluetooth` | [Headphones Skullcandy Crusher Wireless](https://sketchfab.com/3d-models/4e902017e4624547b440da0a6658a689) | [Ankledot](https://sketchfab.com/Ankledot) | CC BY 4.0 | 3688 | vitrine | não | baixado (0.14 MB) |
| `caixas-madeira` | [Desktop speaker with a wooden enclosure](https://sketchfab.com/3d-models/08c8c695fb004f10965303df36e0b087) | [itrek47](https://sketchfab.com/itrek47) | CC BY 4.0 | 27118 | `audio-wood-speakers` | não | baixado (0.23 MB) |
| `caixas-pc` | [Computer Speakers](https://sketchfab.com/3d-models/60ea790042904974b3361a2add8e7921) | [DarrenMcnerney3D](https://sketchfab.com/DarrenMcnerney3D) | CC BY 4.0 | 754 | vitrine | não | baixado (0.10 MB) |
| `gamepad-moderno` | [ps5 controller](https://sketchfab.com/3d-models/f75caead1dc1474195eb32a7f4c71117) | [FredDrabble](https://sketchfab.com/FredDrabble) | CC BY 4.0 | 2752 | `gamepad-hall-effect` | sim | baixado (0.03 MB) |
| `gamepad-classico` | [Gamepad Sony DualShock 3](https://sketchfab.com/3d-models/a7c82b41d2524ffeba28798b357daebd) | [NPCxBot](https://sketchfab.com/NPCxBot) | CC BY 4.0 | 1576 | vitrine | não | baixado (0.23 MB) |
| `suporte-articulado` | [NEXT MONITOR ARM](https://sketchfab.com/3d-models/16f7f2939a944f9da39cd77ac90ae409) | [Jake-norsemandirect](https://sketchfab.com/Jake-norsemandirect) | CC BY 4.0 | 11364 | `stand-gas-arm` | sim | baixado (0.09 MB) |
| `webcam` | [webcamera](https://sketchfab.com/3d-models/a0bf7bcc50f04a109d5212a6da0c3f4a) | [OlegJob](https://sketchfab.com/OlegJob) | CC BY 4.0 | 6850 | vitrine | não | baixado (0.09 MB) |
| `microfone-boom` | [Boom Mic](https://sketchfab.com/3d-models/2b8236d4329a439baff0bc2056fcbb80) | [glowbox3d](https://sketchfab.com/glowbox3d) | CC BY 4.0 | 6150 | vitrine | não | baixado (0.23 MB) |
| `cadeira-escritorio` | [Office Chair Modern](https://sketchfab.com/3d-models/675f34f7304e4d92812a41e9750539aa) | [thethieme](https://sketchfab.com/thethieme) | CC BY 4.0 | 1234 | vitrine | não | baixado (0.15 MB) |
| `mesa-gamer` | [Low Poly Gaming Desk](https://sketchfab.com/3d-models/6f1bc394de704e488d44e77134f23993) | [abdullahyeahyea](https://sketchfab.com/abdullahyeahyea) | CC BY 4.0 | 4782 | vitrine | não | baixado (0.06 MB) |

## Modelos avaliados e rejeitados

| Modelo | Motivo |
| :--- | :--- |
| Motherboard mATX e RTX 4070 (digitalrazor3d), Rebuild ASUS X299 SAGE | Não podem ser baixados e não têm licença. |
| GeForce RTX 2060/2070/2080/TITAN (exela) | CC BY-NC (não comercial) e 350 a 400 mil faces. |
| Asus Strix B550-F Gaming | 818 mil faces. |
| Monitor Samsung Syncmaster B1630 | Licença Standard paga. |
| Ryzen 5 3600 em CPUs AM5 | O modelo é AM4, com pinos no processador; AM5 não tem pinos. |
| Corsair Vengeance DDR4 RGB em memórias DDR5 | O chanfro do DDR4 fica em outra posição. |
