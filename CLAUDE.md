# Fable Shelter – kontekst dla Claude

Gra idle-arcade na telefon (pionowo, 390×844): schronisko dla bajkowych stworków. Opiekun chodzi po obozie, zbiera lekarstwa ze stacji i leczy chorych pacjentów. Wyleczeni zostają, jeśli jest wolne legowisko, potrzebują jedzenia i snu, a przy 4 serduszkach idą do adopcji. Styl pluszowy i humor. Da się grać bez czytania, wszystko pokazują ikonki. Monetyzacja przyjdzie później.

## Współpraca z użytkownikiem
- Odpowiadaj po polsku, ludzkim językiem, bez żargonu.
- Daj jedną rekomendację, a alternatywy tylko krótko. Kiedy coś jest niejasne, zapytaj, zamiast zgadywać.
- Komendy dla Windowsa pisz w składni Nushell.
- Grafiki generuje użytkownik: ComfyUI z Z-Image Turbo, potem 3D w Hunyuan3D 3.0 albo lokalnie w Pixal3D. Claude też może to zrobić przez MCP `comfy-mcp`, używając zapisanych workflow `image_z_image_turbo-tworzenie obrazów.json` i `3d_pixal3d_trellis2_image_to_model-….json` z `D:\ComfyUI\ComfyUI (1)\ComfyUI\user\default\workflows`. Kopiuje je wtedy do scratchpadu i ustawia sloty: Z-Image `57.text`, `57.seed`, `57/13.batch_size`, `9.filename_prefix`. Pixal: `122.image` (najpierw `upload_file`), `322.filename_prefix`, `186.target_face_count=25000`. Na 8 GB VRAM duże kształty (np. kapelusz wodnika) dają OOM w DecimateMesh i wtedy pomaga `241.resolution=512`. Przed Pixal3D wołaj `free_memory`. Pliki trafiają do `D:\ComfyUI-Shared\output\FS`. Claude wybiera najlepszy, oznacza go `WYBRANY` w nazwie, a resztę przenosi do `Archiwum`.
- Wszystkie prompty do grafik są w `docs/PROMPTY.md`, a kopia leży w `D:\ComfyUI-Shared\output\FS\PROMPTY.md`. Nowe prompty dopisuj tam.

## Uruchomienie i wdrożenie
```
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build -> dist/
```
- Push na `main` w `lolekST1/fable-shelter` automatycznie wdraża grę na Vercel: https://fable-shelter.vercel.app
- Commity piszemy po polsku, jednym zdaniem o tym, co się zmieniło w grze.

## Architektura (`src/`)
- `main.ts`: renderer, kamera podążająca (kąt 40°), słońce idące za kamerą, wczytywanie modeli, joystick i tap. Tap w stworka robi podskok, tap w ziemię idzie do miejsca. W `moveKeeper` są kolizje z kołami przeszkód, z płotem i z `game.bound()`. Jest tu też przycisk wyciszenia i haki debug.
- `game.ts`: cała rozgrywka, czyli klasa `Game`.
  - `SPECIES`: gatunki, każdy z własną chorobą (`ailment`), lekarstwem (`cure`), monetami i umiejętnością (`skill: {boost}` przyspiesza stację, `{carry}` nosi lekarstwa albo jagody). Gatunki z `zone:'pond'` żyją przy stawie, a z `zone:'glade'` na wrzosowej polanie. `model` + `base` wskazują model zastępczy i jego zabarwienie, dopóki nie ma docelowego.
  - `BEDS` / `POND_BEDS` / `GLADE_BEDS`: miejsca na legowiska. `freeBed(zone)` woli łóżko w strefie gatunku. Każdy otwarty teren poza obozem trzyma co najmniej jednego swojego pacjenta.
  - `SPOTS`: ścieżka rozwoju. Każdy punkt ma cenę w monetach (opcjonalnie też w serduszkach) i efekt: nowe legowisko, stację, plecak, buty, drogowskaz, mostek z `openPond`, latarnię, furtkę w żywopłocie z `openGlade`, grzybową lampkę. Kupienie odblokowuje nowe gatunki i limit pacjentów.
  - Mieszkańcy mają stany: toBed, idle, eating, toSleep, sleeping, leaving, helpGo/helpWork/helpBring/helpBack. Pomagają od 1 serduszka, potem odpoczywają 10–16 s.
  - `route()` prowadzi przez przednią i tylną bramę zagrody, przez mostek i przez przejście w żywopłocie (`GAP`). `bound()` nie wpuszcza do strumyka (z=-9), dopóki nie ma mostka, a za żywopłot (koło `GLADE_C`, r=5), dopóki nie ma furtki.
  - Zapis: localStorage `fable-shelter-save-v3`. Jeśli zmieniasz format zapisu, podbij wersję klucza.
  - Siatka bezpieczeństwa: co 1 s usuwa „zabłąkane” lekarstwa, czyli takie, które nie leżą na tacy, nie są w rękach opiekuna i nie lecą. Pod `?debug` ostrzega o tym w konsoli. Błąd zgłoszony przez użytkownika: fiolki same się przesuwają albo pojawiają daleko. Do tej pory nie odtworzony.
- `props.ts`: proste meshe stacji i rekwizytów (kociołek, źródełko, zioła, jagody, lilia, legowiska, mostek, latarnia, kosz, plecak, drogowskaz, scenografia stawu) i cząsteczki `Fx`.
- `icons.ts`: ikonki rysowane na canvasie: choroby, lekarstwa, punkty budowy, dymki, serduszka.
- `creature.ts`: stworek z modelu GLB. Ma waddle przy chodzeniu, `twitch`, tint, malowane powieki (shader `uShut`, kształt z `lids.json`).
- `world.ts`: teren, płot z dwiema bramami, krzaki, `Obstacles`.
- `sfx.ts`: dźwięki syntezowane WebAudio. Wyciszenie zapisuje się w `fable-shelter-muted`.
- `joystick.ts`: pływający joystick i obsługa tapnięć.
- `lids.json`: dane powiek z `tools/viewer/eyes.mjs`. Nie edytuj ręcznie.

## Decyzje projektowe (nie cofaj bez pytania)
- Schronisko zaczyna puste. Gatunki przychodzą jako pacjenci w miarę rozwoju.
- Każdy gatunek ma własną, śmieszną chorobę.
- Na start są 2 potrzeby: jedzenie (jagody) i sen (poprawienie legowiska).
- Kosz na niepotrzebne lekarstwa stoi poza zagrodą, z dala od źródeł lekarstw. Stacje są po różnych stronach obozu.
- Nie ma drugiego kociołka: był za tani i nic nie dawał.
- Ulepszenia opiekuna widać na nim samym (plecak, buty), a nie jako skrzynki w świecie.
- Rozbudowa świata: teren 2 to staw za strumykiem. Mostek kosztuje monety i serduszka z adopcji. Każdy kolejny teren przynosi nowe gatunki i nowe lekarstwo (przy stawie fioletowy nektar z lilii). Teren 3 to wrzosowa polana na wschód, za żywopłotem: furtka (850 monet, 10 serduszek), ul ze złotym miodem, legowiska z mchu, grzybowa lampka i gatunki leszy, wilkołaczek, skrzat, sówka (zrobione w nocy 15.10.2026 na gałęzi `teren-3`, czeka na decyzję użytkownika).
- Ceny mają rosnąć tak, żeby kolejna rzecz wymagała kilku pacjentów, a nie dwóch.

## Haki debug (URL i konsola)
- `?reset=1` czyści zapis. `?debug` włącza ostrzeżenia. `?dtmax=0.4` pozwala grze iść w wolnej przeglądarce testowej. `?eyes=closed|half` zamyka powieki.
- `window.__game()` zwraca stan, `__keeper()` pozycję opiekuna, `__walk(x,z)` wysyła go w punkt. `__coins(n)` i `__hearts(n)` dodają monety i serduszka. `__strays()` pokazuje zabłąkane przedmioty, a `__items()` wszystkie fiolki z pozycją i właścicielem.

## Modele i narzędzia (`tools/`)
Modele leżą jako base64 w `public/models/<nazwa>.glb.txt`. Tak dało się je serwować z każdego hostingu, a `loadModel` w `main.ts` dekoduje je w przeglądarce. Oryginały high-poly są tylko u użytkownika na `D:`.

```
cd tools && npm install
./models/optimize.sh surowy.glb nessie hy3      # albo: pixal (bez simplify, bez AO)
npm run serve                                    # drugi terminal, port 4180
node viewer/preview.mjs tools/work/nessie_game.glb   # 4 widoki -> tools/out/
node viewer/eyes.mjs nessie                      # oczy + powieki -> src/lids.json, podgląd tools/out/eyes_nessie.png
```
- Parametry dla HY3: weld → simplify (ratio 0.04, error 0.002; zmienisz przez `RATIO=0.03`) → tekstury 1024 → webp q82 → bez tangentów.
- Pixal3D: decymację robi się w ComfyUI (DecimateMesh 25000). Futrzaste kształty (surowa siatka powyżej ~10 mln trójkątów) wychodzą po decymacji jak zgnieciona folia, a pomaga `241.resolution=512` i 40000 trójkątów. Jego mapa AO jest zepsuta i daje czarne plamy, więc `noao.mjs` ją usuwa. Strona materiału (double side) jest brana z pliku.
- Po wykryciu oczu sprawdź podgląd. Jeśli złapało nozdrza albo plamki, zmień parametry `nazwa:próg:ymax:wypełnienie:skala`.
- Podmiana modelu zastępczego na docelowy: wrzuć `.glb.txt`, usuń `model`/`base` z wpisu w `SPECIES` i wygeneruj powieki.

## Testy (`tools/tests/`)
Skrypty Playwright na Chromium z swiftshader. Robią zrzuty do `tools/out/`.
```
npm run build && npx vite preview --port 4173     # w katalogu głównym
cd tools && node tests/care.mjs                   # też: pond, prog, stray, lids, helpers, vials, glade
```
W środowisku chmurowym Claude Chromium leży w `/opt/pw-browsers`, a Playwright jest przypięty do 1.56.0, żeby pasował. Lokalnie może być potrzebne `npx playwright install chromium`.
- Windows (u użytkownika): pobieranie `chromium-1194` urwało się bez `chrome.exe`. Kompletny jest `chromium-1243`, więc wszystkie skrypty przyjmują `CHROME_PATH` (`%LOCALAPPDATA%\ms-playwright\chromium-1243\chrome-win64\chrome.exe`).
- Zapis testowy wgrywaj przez `page.addInitScript`. Zapis do `localStorage` z działającej gry nadpisze przy przeładowaniu `pagehide`.
- Mieszkaniec pomaga tylko wtedy, gdy sam niczego nie potrzebuje, więc w teście ktoś musi go karmić i kłaść spać.

## Otwarte sprawy
- Fiolki „chodzące same”: nie udało się odtworzyć. `tests/vials.mjs` sprawdza fiolki klatka po klatce (`__items()`) przez 100 rund w pełnym obozie i niczego nie znalazł. Podejrzenie: to fiolka niesiona na głowie przez pomagającego mieszkańca. Usunięto też martwy kod starego wynajętego krakena-pomocnika. Nadal potrzebny zrzut ekranu od użytkownika.
- Gatunki stawu (zabiksiaze, nessie, wodnik, swietlik) mają modele z Pixal3D zrobione przez Claude'a (15.10.2026, tylko przód, bez Hunyuana). Użytkownik może je później poprawić w Hunyuan3D 3.0. Rekwizyty stawu są nadal prostymi kształtami.
