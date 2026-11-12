# Fable Shelter – modele i narzędzia

> Przeniesione z CLAUDE.md 5.11.2026, żeby nie ładowało się w każdej sesji. Treść bez zmian.

Modele leżą jako base64 w `public/models/<nazwa>.glb.txt`. Tak dało się je serwować z każdego hostingu, a `loadModel` w `main.ts` dekoduje je w przeglądarce. Oryginały high-poly są tylko u użytkownika na `D:`.

```
cd tools && npm install
./models/optimize.sh surowy.glb nessie hy3      # albo: pixal (bez simplify, bez AO)
npm run serve                                    # drugi terminal, port 4180
node viewer/preview.mjs tools/work/nessie_game.glb   # 4 widoki -> tools/out/
node viewer/eyes.mjs nessie                      # oczy + powieki -> src/lids.json, podgląd tools/out/eyes_nessie.png
```
- Parametry dla HY3: weld → simplify (ratio 0.04, error 0.002; zmienisz przez `RATIO=0.03`) → tekstury 1024 → webp q82 → bez tangentów.
- Rekwizyty: `TEX=512 ./models/optimize.sh surowy.glb prop_x pixal`, potem `node models/upright.mjs work/prop_x_game.glb work/prop_x_game.glb [kątX kątZ]`, który prostuje przechył z ujęcia z góry (szuka od -40° do -10°; kociołek z bańkami trzeba było podać ręcznie: -28 0), a na koniec ponowne `base64` do `public/models`. Model rekwizytu musi stać na y=0 i być wyśrodkowany, bo `dressUp` go tylko skaluje.
- Pixal3D: decymację robi się w ComfyUI (DecimateMesh 25000). Futrzaste kształty (surowa siatka powyżej ~10 mln trójkątów) wychodzą po decymacji jak zgnieciona folia, a pomaga `241.resolution=512` i 40000 trójkątów. Jego mapa AO jest zepsuta i daje czarne plamy, więc `noao.mjs` ją usuwa. Strona materiału (double side) jest brana z pliku.
- Podgląd tekstur modelu: `node models/textures.mjs plik.glb out/prefiks` zapisuje każdą teksturę osobno jako `out/prefiks_0.png`, `_1.png` i tak dalej. Przydaje się przy szukaniu plamek i zepsutej mapy AO. Skrypt zapisuje surowe dane tekstury, więc dla modelu po `optimize.sh` plik ma rozszerzenie `.png`, ale w środku jest WebP.
- Po wykryciu oczu sprawdź podgląd. Jeśli złapało nozdrza albo plamki, zmień parametry `nazwa:próg:ymax:wypełnienie:skala:ymin`. Dla ludzi (kucyki nad oczami, buty na dole) działa `nazwa:70:260:0.45:1.22:140`.
- Podmiana modelu zastępczego na docelowy: wrzuć `.glb.txt`, usuń `model`/`base` z wpisu w `SPECIES` i wygeneruj powieki.
- Lżejsze modele: `ERROR=0.004 ./models/lighter.sh 0.5 nazwa…` dla stworków i ludzi, `./models/lighter.sh 0.3 prop_…` dla rekwizytów (ERROR 0.01). Upraszcza `.glb.txt` w miejscu, a oryginał zostawia w `work/lighter/<nazwa>.orig.glb`. Potem obowiązkowo `node models/speckles.mjs nazwa…` (przy `npm run serve`): liczy nowe czarne plamki na szwach tekstury. Powyżej ok. 100 plamek model jest zepsuty, więc przywróć oryginał i spróbuj z mniejszym `ERROR` (1,5‰ uratowało smoka, foczkę, babcię, chłopca i pingwinka). Dziewczynka i perła zostały bez zmian. Powieki nadal pasują przy `ERROR` do 0,004.
