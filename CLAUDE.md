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
  - `SPECIES`: gatunki, każdy z własną chorobą (`ailment`), lekarstwem (`cure`), monetami i umiejętnością (`skill: {boost}` przyspiesza stację, `{carry}` nosi lekarstwa albo jagody). Gatunki z `zone:'pond'` żyją przy stawie, z `zone:'glade'` na wrzosowej polanie, a z `zone:'snow'` na Śnieżnym wzgórzu. `model` + `base` wskazują model zastępczy i jego zabarwienie, dopóki nie ma docelowego.
  - `BEDS` / `POND_BEDS` / `GLADE_BEDS` / `SNOW_BEDS`: miejsca na legowiska. `freeBed(zone)` woli łóżko w strefie gatunku. Każdy otwarty teren poza obozem trzyma co najmniej jednego swojego pacjenta.
  - `SPOTS`: ścieżka rozwoju. Każdy punkt ma cenę w monetach (opcjonalnie też w serduszkach) i efekt: nowe legowisko, stację, plecak, buty, drogowskaz, mostek z `openPond`, latarnię, furtkę w żywopłocie z `openGlade`, grzybową lampkę. Kupienie odblokowuje nowe gatunki i limit pacjentów.
  - Pomocnicy terenów (`workers`, `addWorker(zone)`): uczeń opiekuna kupowany jako punkt budowy, po jednym na teren (obóz 420 przed mostkiem, staw 780 przed furtką, polana 1400). Sam kładzie spać i karmi mieszkańców swojego terenu i nosi lekarstwa jego pacjentom. Monety z takiego terenu same lecą do opiekuna. Stany: idle, go, bring, tuck.
  - Rzadkie odmiany (`VARIANT_CHANCE` 8%, `variantTint`): pacjent w innym kolorze (różowy yeti, złoty żabi książę, reszta z `VARIANT_COLORS`), iskrzy gwiazdkami i płaci podwójnie. Jako mieszkaniec zostaje w tym kolorze (`variant`, w zapisie `v: 1`, stare zapisy bez pola są zwykłe).
  - Ozdoby schroniska (`addDecor`, `cheer`): ostatnie 4 punkty `SPOTS` po pomocniku Śnieżnego wzgórza. Huśtawka 1800, fontanna z żabką 2100, karuzela z grzybków 2400, złoty pomnik opiekuna 2700 (130 serduszek). Każda ozdoba dokłada `DECOR_BONUS` (2) monety do każdego wyleczenia. Animują się same przez `userData.tick`, a `userData.r` mówi, jak szeroko opiekun je omija. Pomnik to model opiekuna w złotym materiale na postumencie. Ozdoby mają `userData.decor` (nie `kind`, bo `kind` oznacza fiolki i siatka bezpieczeństwa by je usunęła). Wolny mieszkaniec obozu czasem (`playChance` 20%) idzie przez `route()` do wolnej ozdoby (stany playGo, play, playBack): buja się na huśtawce, kręci na karuzeli albo chlapie w fontannie przez 7–10 s. `userData.ride(t)` mówi, gdzie siedzi.
  - Adopcja (`adopt` → `callAdopter` → `updateAdopters` → `farewell`): przy 4 serduszkach mieszkaniec czeka przy legowisku (`awaiting`), a z drzwi domku schroniska (`HOUSE`, na zachodnim skraju obozu) wychodzi osoba z `ADOPTERS` (dziewczynka, chłopiec, babcia, dziadek). Podchodzi, przytulają się (`hug`, 1,5 s), spadają monety i serduszko adopcji, po czym oboje wracają do domku. Jeśli opiekun stoi w promieniu 3 m, dostaje premię `FAREWELL_BONUS`. Gracz nic nie musi robić.
  - Mieszkańcy mają stany: toBed, idle, eating, toSleep, sleeping, awaiting (czeka na adopcję), leaving, helpGo/helpWork/helpBring/helpBack, playGo/play/playBack. Pomagają od 1 serduszka, potem odpoczywają 10–16 s.
  - `route()` prowadzi przez przednią i tylną bramę zagrody, przez mostek i przez przejścia w żywopłocie (`GAP`) i w zaspie (`SNOW_GAP`). `bound()` nie wpuszcza do strumyka (z=-9), dopóki nie ma mostka, za żywopłot (koło `GLADE_C`, r=5), dopóki nie ma furtki, a za zaspę (koło `SNOW_C`, r=5), dopóki nie ma łopaty. Oba tereny za skrajem łąki opisuje lista `RIMS`. Miejsca na wzgórzu liczy `onSnow(odCentrum, wBok)`.
  - `walk()` to jedyny krok chodzenia stworków, pomocników i osób adoptujących. Omija koła: staw, domek schroniska, opiekuna (oprócz drogi do legowiska, bo opiekun na nim stoi, kiedy je poprawia) i ozdoby. Cel w środku koła liczy się jako osiągnięty na jego krawędzi. `groundY(x, z)` daje wysokość pomostu mostka, a `update` ustawia ją co klatkę wszystkim postaciom. Opiekun w `circles()` odbija się też od pomocników i osób adoptujących.
  - Zapis: localStorage `fable-shelter-save-v3` z polem `ver` (teraz 2). Jeśli zmieniasz format zapisu, podbij wersję klucza. Wyjątek: wstawienie punktów do `SPOTS` obsługuje `migrateBought` (zapis bez `ver` przesuwa licznik zakupów za punkty pomocników). Testy, które wgrywają zapis bez `ver`, też przez to przechodzą.
  - Siatka bezpieczeństwa: co 1 s usuwa „zabłąkane” lekarstwa, czyli takie, które nie leżą na tacy, nie są w rękach opiekuna i nie lecą. Pod `?debug` ostrzega o tym w konsoli. Błąd zgłoszony przez użytkownika: fiolki same się przesuwają albo pojawiają daleko. Do tej pory nie odtworzony.
- `props.ts`: proste meshe stacji i rekwizytów. Część z nich podmieniają modele 3D `prop_*.glb.txt` przez `dressUp` (lista w `PROP_MODEL` w `game.ts`: kociołek, źródełko, zioła, lilia, ul, krzak jagód, legowiska wszystkich terenów, kosz, ognisko z kakao, duże ognisko, drogowskaz, latarnia, grzybowa lampka, domek). Bez modeli są tylko mostek i bramy (furtka, łuk z kijków), bo opiekun chodzi po nich według ich kształtu. Rzeczy z `userData.fx` (bańki w kociołku i ognisku, pszczoły przy ulu) zostają widoczne obok modelu. Reszta pliku: (kociołek, źródełko, zioła, jagody, lilia, legowiska, mostek, latarnia, kosz, plecak, drogowskaz, scenografia stawu) i cząsteczki `Fx`.
- `album.ts`: album adopcji (przycisk z książeczką pod wyciszeniem). Strona na teren (`ALBUM_PAGES` w `game.ts`), karta na gatunek: `?`, sylwetka (gatunek odblokowany) albo portret z liczbą adopcji. Portrety rysuje `portrait()` w `main.ts` w osobnym małym rendererze. Pełna strona raz daje monety, które same lecą do opiekuna. Zapis: pola `album` i `albumPaid` (stare zapisy zaczynają z pustym albumem). Nowy gatunek dopisz do odpowiedniej strony. Rzadkie odmiany mają klucz `nazwa*` i własną złotą naklejkę, która pokazuje się dopiero po adopcji i nie jest potrzebna do zapełnienia strony.
- `daily.ts`: prośba dnia, czyli karta pod serduszkami. Jedno zadanie na dzień, wybrane z daty (`today()`): wylecz N stworków jednego gatunku z najnowszego terenu (portret i choroba), pożegnaj N stworków przy domku (serduszko na drzwiach, liczy się premia za pożegnanie) albo nakarm N mieszkańców samemu (jagody). Nagroda `50 + 15 × zakupy` leci do opiekuna. Zapis w polu `daily` (stare zapisy go nie mają). Karty nie ma w samouczku (`step < 4`), a o północy przychodzi nowe zadanie.
- `icons.ts`: ikonki rysowane na canvasie: choroby, lekarstwa, punkty budowy, dymki, serduszka.
- `creature.ts`: stworek z modelu GLB. Ma waddle przy chodzeniu, `twitch`, tint, malowane powieki (shader `uShut`, kształt z `lids.json`).
- `world.ts`: teren, płot z dwiema bramami, krzaki, `Obstacles`. `buildGround(…, bare)` nie sadzi trawy ani kwiatków w podanych kołach (śnieg wzgórza).
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
- Rozbudowa świata: teren 2 to staw za strumykiem. Mostek kosztuje monety i serduszka z adopcji. Każdy kolejny teren przynosi nowe gatunki i nowe lekarstwo (przy stawie fioletowy nektar z lilii). Teren 3 to wrzosowa polana na wschód, za żywopłotem: furtka (850 monet, 10 serduszek), ul ze złotym miodem, legowiska z mchu, grzybowa lampka i gatunki leszy, wilkołaczek, skrzat, sówka (zrobione w nocy 15.10.2026, scalone przez użytkownika).
- Ceny mają rosnąć tak, żeby kolejna rzecz wymagała kilku pacjentów, a nie dwóch.
- Teren 4 to Śnieżne wzgórze na południowy zachód, za zaspą (zrobione 15.10.2026, wybór użytkownika): łopata (1600 monet, 90 serduszek), ognisko z kakao, legowiska z koca, duże ognisko (110 serduszek, 7 pacjentów) i pomocnik (2600). Gatunki: yeti (czka śnieżkami), renifer (miga nosem), bałwanek (topnieje, leczy go woda ze źródełka), pingwinek (kręci się w kółko). Na razie mają modele zastępcze z zabarwieniem, prompty są w `docs/PROMPTY.md`.
- Progi serduszek od 15.10.2026: mostek 15, latarnia 30, furtka 50, lampka 70 (wcześniej 3/6/10/13, nic nie blokowały).
- Jagody da się zebrać tylko wtedy, gdy któryś mieszkaniec jest głodny i opiekun nie niesie ich już dość. Powód: krzak stoi przy drodze do kociołka i zapychał ręce.
- Po ostatnim terenie są ozdoby obozu jako cel na monety (16.10.2026, gałąź `noc/ozdoby`, do decyzji użytkownika). Powód: test całej gry pokazał, że po ostatnim zakupie przybywa ok. 330 monet na minutę i nie ma ich na co wydać. Każda ozdoba zajmuje automatycznemu graczowi 6–8 minut.
- Starsze tereny mają się automatyzować przez pomocników, a gracz zajmuje się najnowszym terenem i kolejnymi progami. Powód: w środku gry było kilkanaście osób do obsłużenia naraz (opinia użytkownika z 15.10.2026).

## Haki debug (URL i konsola)
- `?speed=N` robi N kroków gry (po 1/30 s) na klatkę, `?norender` rysuje co 30. klatkę, a `window.__tick(dt)` (jeśli test go ustawi) jest wołany przed każdym krokiem. `__G()` zwraca obiekt `Game`. Tego używa test całej gry.
- `?reset=1` czyści zapis. `?debug` włącza ostrzeżenia. `?dtmax=0.4` pozwala grze iść w wolnej przeglądarce testowej. `?eyes=closed|half` zamyka powieki. `?rare` sprawia, że każdy pacjent jest rzadką odmianą. `?day=RRRR-MM-DD` udaje inną datę dla prośby dnia.
- `window.__game()` zwraca stan, `__keeper()` pozycję opiekuna, `__walk(x,z)` wysyła go w punkt. `__coins(n)` i `__hearts(n)` dodają monety i serduszka. `__strays()` pokazuje zabłąkane przedmioty, a `__items()` wszystkie fiolki z pozycją i właścicielem, a `__spots()` liczbę zakupów i widoczne punkty budowy (pozycja, cena, serduszka). `__calls()` podaje liczbę wywołań rysowania na klatkę (15.10.2026: obóz 88, polana 91). Dekoracje w wielu kopiach rób jako `InstancedMesh`.

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
- Rekwizyty: `TEX=512 ./models/optimize.sh surowy.glb prop_x pixal`, potem `node models/upright.mjs work/prop_x_game.glb work/prop_x_game.glb [kątX kątZ]`, który prostuje przechył z ujęcia z góry (szuka od -40° do -10°; kociołek z bańkami trzeba było podać ręcznie: -28 0), a na koniec ponowne `base64` do `public/models`. Model rekwizytu musi stać na y=0 i być wyśrodkowany, bo `dressUp` go tylko skaluje.
- Pixal3D: decymację robi się w ComfyUI (DecimateMesh 25000). Futrzaste kształty (surowa siatka powyżej ~10 mln trójkątów) wychodzą po decymacji jak zgnieciona folia, a pomaga `241.resolution=512` i 40000 trójkątów. Jego mapa AO jest zepsuta i daje czarne plamy, więc `noao.mjs` ją usuwa. Strona materiału (double side) jest brana z pliku.
- Po wykryciu oczu sprawdź podgląd. Jeśli złapało nozdrza albo plamki, zmień parametry `nazwa:próg:ymax:wypełnienie:skala:ymin`. Dla ludzi (kucyki nad oczami, buty na dole) działa `nazwa:70:260:0.45:1.22:140`.
- Podmiana modelu zastępczego na docelowy: wrzuć `.glb.txt`, usuń `model`/`base` z wpisu w `SPECIES` i wygeneruj powieki.

## Testy (`tools/tests/`)
Skrypty Playwright na Chromium z swiftshader. Robią zrzuty do `tools/out/`.
```
npm run build && npx vite preview --port 4173     # w katalogu głównym
cd tools && node tests/care.mjs                   # też: pond, prog, lids, helpers, vials, glade, snow, workers, water, adoption, album, decor, collide, variant, daily, play
RUNS=2 CAREFUL=1 node tests/playthrough.mjs       # cała gra od zera, kilka minut na przejście; bez CAREFUL gracz idzie prosto przez krzaki
```
W środowisku chmurowym Claude Chromium leży w `/opt/pw-browsers`, a Playwright jest przypięty do 1.56.0, żeby pasował. Lokalnie może być potrzebne `npx playwright install chromium`.
- Windows (u użytkownika): pobieranie `chromium-1194` urwało się bez `chrome.exe`. Kompletny jest `chromium-1243`, więc wszystkie skrypty przyjmują `CHROME_PATH` (`%LOCALAPPDATA%\ms-playwright\chromium-1243\chrome-win64\chrome.exe`).
- Zapis testowy wgrywaj przez `page.addInitScript`. Zapis do `localStorage` z działającej gry nadpisze przy przeładowaniu `pagehide`.
- Mieszkaniec pomaga tylko wtedy, gdy sam niczego nie potrzebuje, więc w teście ktoś musi go karmić i kłaść spać.

## Tempo gry (test całej gry, 15.10.2026)
Automatyczny gracz (szybszy od człowieka) przechodzi całą grę w 49–58 minut gry. Pierwsze 10 zakupów zajmuje po 1,5–2 min (5–15 wyleczeń), ostatnie po 4–5 min (25–40 wyleczeń). W grze jest ok. 170 adopcji na 350–400 wyleczeń. Progi serduszek (3/6/10/13) nigdy nie blokują, bo gracz ma ich wtedy 35/45/65/85. Po ostatnim zakupie przybywa ok. 330 monet na minutę i nie ma ich na co wydać. Pożegnania zajmują graczowi ok. 1/3 czasu. Krzak jagód leży na drodze do kociołka i napełnia ręce jagodami, więc nieuważny gracz częściej chodzi do kosza (w jednym przebiegu 4. zakup przyszedł dopiero po 10,8 min zamiast ok. 5).
Po zmianach (teren 4, progi 15/30/50/70/90/110, jagody tylko dla głodnych) cała gra trwa u automatycznego gracza 74 minuty gry. Zakupy Śnieżnego wzgórza zajmują po 4–6 min (33–59 wyleczeń). Szybki gracz nadal nie czeka na serduszka, wolniejszy może.

## Otwarte sprawy
- Fiolki „chodzące same”: nie udało się odtworzyć. `tests/vials.mjs` sprawdza fiolki klatka po klatce (`__items()`) przez 100 rund w pełnym obozie i niczego nie znalazł. Podejrzenie: to fiolka niesiona na głowie przez pomagającego mieszkańca. Usunięto też martwy kod starego wynajętego krakena-pomocnika. Nadal potrzebny zrzut ekranu od użytkownika.
- Gatunki stawu, polany i śniegu mają modele z Pixal3D zrobione przez Claude'a (tylko z przodu). Widoki z tyłu i z boku do Hunyuan3D 3.0 są już gotowe (16.10.2026, FLUX 3 edit), patrz `docs/PROMPTY.md`.
