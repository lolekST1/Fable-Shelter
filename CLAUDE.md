# Fable Shelter – kontekst dla Claude

Gra idle-arcade na telefon (pionowo, 390×844): schronisko dla bajkowych stworków. Opiekun chodzi po obozie, zbiera lekarstwa ze stacji i leczy chorych pacjentów. Wyleczeni zostają, jeśli jest wolne legowisko, potrzebują jedzenia i snu, a przy 4 serduszkach idą do adopcji. Styl pluszowy i humor. Da się grać bez czytania, wszystko pokazują ikonki. Monetyzacja przyjdzie później.

## Współpraca z użytkownikiem
- Odpowiadaj po polsku, ludzkim językiem, bez żargonu.
- Daj jedną rekomendację, a alternatywy tylko krótko. Kiedy coś jest niejasne, zapytaj, zamiast zgadywać.
- Komendy dla Windowsa pisz w składni Nushell.
- Grafiki generuje użytkownik: ComfyUI z Z-Image Turbo, potem 3D w Hunyuan3D 3.0 albo lokalnie w Pixal3D. Claude też może to zrobić przez MCP `comfy-mcp`, używając zapisanych workflow `image_z_image_turbo-tworzenie obrazów.json` i `3d_pixal3d_trellis2_image_to_model-….json` z `D:\ComfyUI\ComfyUI (1)\ComfyUI\user\default\workflows`. Kopiuje je wtedy do scratchpadu i ustawia sloty: Z-Image `57.text`, `57.seed`, `57/13.batch_size`, `9.filename_prefix`. Pixal: `122.image` (najpierw `upload_file`), `322.filename_prefix`, `186.target_face_count=25000`. Na 8 GB VRAM duże kształty (np. kapelusz wodnika) dają OOM w DecimateMesh i wtedy pomaga `241.resolution=512`. Przed Pixal3D wołaj `free_memory`. Pliki trafiają do `D:\ComfyUI-Shared\output\FS`. Claude wybiera najlepszy, oznacza go `WYBRANY` w nazwie, a resztę przenosi do `Archiwum`.
- Wszystkie prompty do grafik są w `docs/PROMPTY.md`, a kopia leży w `D:\ComfyUI-Shared\output\FS\PROMPTY.md`. Nowe prompty dopisuj tam.

## Zakres zmian w kodzie
- Nie projektuj pod rzadkie ani przyszłe przypadki, o które nikt nie prosił. Kod obsługuje to, co gra robi dziś, bez parametrów i zabezpieczeń na zapas.
- Prawdziwe błędy poprawiaj. Zgłoszenia reviewera z niskim iloczynem częstości i wagi (poniżej 5) zapisz na liście odłożonych i nie ruszaj kodu.

## Uruchomienie i wdrożenie
```
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit + vite build -> dist/
npm run build:poki # paczka na Poki -> dist-poki/ (zawsze z SDK Poki, bez service workera, PWA i napisu „prototype”)
```
- Push na `main` w `lolekST1/fable-shelter` automatycznie wdraża grę na Vercel: https://fable-shelter.vercel.app
- Commity piszemy po polsku, jednym zdaniem o tym, co się zmieniło w grze.

## Sposób pracy (`.claude/`)
- Zmiana, którą widzi gracz, jest skończona dopiero po obejrzanym zrzucie ekranu. Szybki zrzut bez pisania testu: `cd tools; NAME=co SAVE=nowy|pelny Q="night&quality=0" AT=x,z node tests/shot.mjs` (do `tools/out/shot_co.png`, wypisuje też błędy ze strony), potem obejrzyj go przez Read. Hook `Stop` (`.claude/hooks/zrzut.mjs`) przypomina o tym raz na paczkę zmian w `src/`, `public/` i `index.html`. Przy zmianie niewidocznej wystarczy jedno zdanie, że jej nie widać.
- Przy dłuższej pracy (nocne gałęzie, kilka kroków, ponad godzina) prowadź `.claude/stan.md`: cel, gałąź, co zrobione, co dalej, pułapki. Plik nie idzie do gita. Hook `SessionStart` (`stan.mjs`) wkleja go po kompakcji, po wznowieniu i przy starcie, jeśli ma mniej niż 12 godzin. Po skończonej pracy wyczyść go.
- Hook `PreToolUse` (`czytaj.mjs`) nie wczytuje w całości plików powyżej 1200 linii albo 60 KB (`game.ts`, `props.ts`, `icons.ts`, `lids.json`) ani modeli `.glb.txt`. Zamiast tego oddaje mapę pliku z numerami linii, z której czyta się fragment (offset i limit) albo szuka przez Grep.
- Balans i tempo: skill `/balans` i agent `ekonomista` (Sonnet). Puszczają kilka przejść całej gry i porównują mediany z `docs/tempo.json` przez `tools/tests/tempo.mjs` (`SAVE=1` zapisuje nowy punkt odniesienia).
- Hooki są w Node, więc działają tak samo w Git Bash na Windowsie i w chmurze. Wyłączenie na jedną sesję: `FS_NO_SHOT=1`, `FS_NO_READ_GUARD=1`.

## Architektura (`src/`)
Pełny opis każdego pliku, z powodami nieoczywistych rozwiązań: `docs/ARCHITEKTURA.md`. Zanim zmienisz plik w `src/`, przeczytaj jego akapit, bo wiele dziwnych na oko rozwiązań (trasy przez bramy, `walk()`, migracja zapisu, `userData.decor`) ma tam zapisany powód.
- `main.ts`: renderer, kamera, wczytywanie modeli, joystick i tap, haki debug.
- `game.ts`: cała rozgrywka (klasa `Game`): gatunki, legowiska, ścieżka rozwoju `SPOTS`, pomocnicy, pora dnia, offline, adopcja, trasy, zapis, strzałka-przewodnik.
- `props.ts`, `world.ts`, `creature.ts`: rekwizyty, teren, stworki z GLB.
- `album.ts`, `daily.ts`, `wardrobe.ts`, `halloween.ts`, `boosters.ts`, `backup.ts`, `story.ts`: album, prośba dnia, szafa, wydarzenie, boostery, kopia zapisu, karty z obrazkami (cel gry, nowy pacjent, nowe lekarstwo).
- `i18n.ts`: 12 języków, klucz to polski tekst w `t()`. Nowy napis: `t('…')` i wiersz w `T`.
- `platform.ts`: Poki i Vercel Analytics. `sfx.ts`: dźwięk i muzyka. `icons.ts`, `joystick.ts`, `lids.json` (nie edytuj ręcznie).
- Zapis: `fable-shelter-save-v3`, pole `ver`. Zmiana formatu = nowa wersja klucza (szczegóły w `docs/ARCHITEKTURA.md`).

## Decyzje projektowe (nie cofaj bez pytania)
- Schronisko zaczyna puste. Gatunki przychodzą jako pacjenci w miarę rozwoju.
- Każdy gatunek ma własną, śmieszną chorobę.
- Na start są 2 potrzeby: jedzenie (jagody) i sen (poprawienie legowiska).
- Kosz na niepotrzebne lekarstwa stoi poza zagrodą, z dala od źródeł lekarstw. Stacje są po różnych stronach obozu.
- Nie ma drugiego kociołka: był za tani i nic nie dawał.
- Ulepszenia opiekuna widać na nim samym (plecak, buty), a nie jako skrzynki w świecie.
- Rozbudowa świata: teren 2 to staw za strumykiem. Mostek kosztuje monety i serduszka z adopcji. Każdy kolejny teren przynosi nowe gatunki i nowe lekarstwo (przy stawie fioletowy nektar z lilii). Teren 3 to wrzosowa polana na wschód, za żywopłotem: furtka (850 monet, 10 serduszek), ul ze złotym miodem, legowiska z mchu, grzybowa lampka i gatunki leszy, wilkołaczek, skrzat, sówka (zrobione w nocy 15.10.2026, scalone przez użytkownika).
- Ceny mają rosnąć tak, żeby kolejna rzecz wymagała kilku pacjentów, a nie dwóch.
- Teren 4 to Śnieżne wzgórze na południowy zachód, za zaspą (zrobione 15.10.2026, wybór użytkownika): łopata (1600 monet, 134 serduszki), ognisko z kakao, legowiska z koca, duże ognisko (110 serduszek, 7 pacjentów) i pomocnik (2600). Gatunki: yeti (czka śnieżkami), renifer (miga nosem), bałwanek (topnieje, leczy go woda ze źródełka), pingwinek (kręci się w kółko). Mają już własne modele 3D (od 538ed54), prompty są w `docs/PROMPTY.md`.
- Progi serduszek od 15.10.2026: mostek 15, latarnia 30, furtka 60 (od 30.10.2026, było 50), lampka 70 (wcześniej 3/6/10/13, nic nie blokowały). Od 30.10.2026 łopata wymaga 134 serduszek (było 90) i kilof 415 (było 190), bo automat miał w tych miejscach 130–140 i 410–430, więc progi nic nie robiły. Kolejność progów w `SPOTS` nie jest już rosnąca (kilof 415, potem lampa 210); serduszka się nie wydaje, więc to działa.
- Jagody da się zebrać tylko wtedy, gdy któryś mieszkaniec jest głodny i opiekun nie niesie ich już dość. Powód: krzak stoi przy drodze do kociołka i zapychał ręce.
- Teren 5 to zatoczka nad morzem na zachód-północny zachód, za domkiem i wydmą (wybór użytkownika 16.10.2026). Kładka 2800 monet i 150 serduszek, muszla z perłą (lekarstwo `pearl`), legowiska z muszli 2900 i 3200, latarnia morska 3000 (170 serduszek, 8 pacjentów, świeci nocą) i pomocnik 3500. Ceny obniżone 17.10.2026, bo w teście całej gry zakupy zatoczki zajmowały po 9–14 minut. Punkty są dopisane po ozdobach, więc stare zapisy działają. Gatunki: krabik (szczypie się w nos), foczka (kicha piaskiem, leczy ją woda ze źródełka), żółwik (chowa się w skorupę), syrenka (plącze się w wodorostach). Karuzelę przeniesiono na wschód (7.4, -4.6), żeby nie stała przy przejściu.
- Teren 6 to kryształowa jaskinia na południe od obozu, za skałami, między grządką ziół a fontanną (`CAVE_A` 1,385; wybór użytkownika 20.10.2026, scalone z `main`). Kilof 3800 monet i 415 serduszek, kryształy (lekarstwo `crystal`), legowiska z kamienia 3900 i 4300, kryształowa lampa 4100 (210 serduszek, 9 pacjentów, świeci nocą) i pomocnik 4600. Punkty są dopisane po pomocniku zatoczki. Gatunki: nietoperek (czka echem), kret (zakopuje się, leczą go zioła z obozu, które rosną tuż przy wejściu), żuczek (mieni się kolorami), golemik (sypie się kamyczkami). Kamera zawsze patrzy na północ, więc to, co leży na południowym skraju jaskini, zostaje za nią. Dlatego wzgórze z wejściem do groty stoi na wschodnim boku (`CAVE_MOUTH`), a kryształy są gęsto rozstawione po stronie obozu. Test: `tests/cave.mjs`.
- Krótkie polskie podpisy (karta celu gry, karta serduszek, „Dziś”, nazwy w albumie) od 17.10.2026, bo tester nie rozumiał samych ikonek. Reszta gry dalej jest na ikonkach. Od 20.10.2026 wszystkie napisy są też po angielsku, a od 28.10.2026 w 12 językach (`i18n.ts`), bo Poki ma graczy z całego świata i przed testem na ok. 10 000 graczy lepiej mieć wszystkie języki z ich listy (wybór użytkownika).
- Gra idzie na Poki z umową na wyłączność w sieci (zgoda użytkownika 27.10.2026). Po podpisaniu trzeba wyłączyć albo ukryć fable-shelter.vercel.app. Zasady, stan przygotowań i jak zgłosić grę: `docs/POKI.md`. Rozstrzygnięcia podjęte samodzielnie: `.claude/decisions.md`.
- Kosmetyka opiekuna: szafa w domku za monety (wybór użytkownika 16.10.2026), żeby nadmiar monet miał cel.
- Wydarzenie halloweenowe (noc 17/18.10.2026, jest w `main`). Powód: gracze mają mieć powód, żeby wracać, a do Halloween zostały dwa tygodnie.
- Po ostatnim terenie są ozdoby obozu jako cel na monety (16.10.2026, są w `main`). Powód: test całej gry pokazał, że po ostatnim zakupie przybywa ok. 330 monet na minutę i nie ma ich na co wydać. Każda ozdoba zajmuje automatycznemu graczowi 6–8 minut.
- Starsze tereny mają się automatyzować przez pomocników, a gracz zajmuje się najnowszym terenem i kolejnymi progami. Powód: w środku gry było kilkanaście osób do obsłużenia naraz (opinia użytkownika z 15.10.2026).
- Płynność (noc 17/18.10.2026, jest w `main`): przycinanie brało się z liczby trójkątów, nie z wywołań rysowania (obóz ma ich ok. 50) ani z pikseli (połowa rozdzielczości dawała tylko 15%). W pełnym obozie było ok. 360 tys. trójkątów na klatkę, w tym 210 tys. z 1500 kępek trawy. Teraz kępki to półkule po 40 trójkątów (pod śniegiem w ogóle ich nie ma), a modele są uproszczone (`models/lighter.sh`), więc zostało ok. 130 tys. W przeglądarce testowej klatka trwa 132 ms zamiast 203. Logika gry zajmuje poniżej 1 ms. Do pomiarów: `tests/perf.mjs` i `tests/looks.mjs` (zrzuty przed i po).

## WebGL 1 (stare tablety)
- three.js jest przypięty do 0.162.0, bo to ostatnia wersja z WebGL 1 (od r163 jest tylko WebGL 2). Gra najpierw próbuje WebGL 2, a WebGL 1 bierze tylko wtedy, gdy WebGL 2 nie ma. Powód: Huawei MediaPad T3 10 (Android 8, Adreno 308, Chrome 138) ma tylko WebGL 1 i gra się na nim nie uruchamiała (18.10.2026). Nie podbijaj three.js bez sprawdzenia `tests/nowebgl2.mjs`.
- Na WebGL 1 gra startuje bezpiecznie: bez odbić otoczenia (`ENV`, `?env` je włącza, `?noenv` wyłącza też na WebGL 2) i bez cieni (jakość 5, `?quality=N` zmienia). Powód: na Huawei MediaPad T3 10 scena była czarna (widać było tylko płaskie elementy), a w przeglądarce testowej tego nie widać. `?glinfo` pokazuje nakładkę z danymi karty graficznej, rozszerzeniami i błędami shaderów, do zdjęcia z urządzenia. `&gltest=clear,nosky,nofog,notone,basic` wyłącza podejrzanych po kolei (clear: różowe tło, czyli widać, czego w ogóle nie narysowano). Rozwiązanie (18.10.2026): Adreno 308 zgłasza highp, ale z highp każdy oświetlony materiał wychodzi czarny (nawet z samym AmbientLight), a z `mediump` scena jest poprawna. Dlatego urządzenia bez WebGL 2 dostają `precision: 'mediump'` (`MEDIUMP` w `main.ts`, `?gltest=highp` wraca do highp). Brak cieni i odbić na WebGL 1 zostaje, bo te tablety są wolne. Do tego bez WebGL 2: bez wygładzania krawędzi, rysowanie w 0,7 rozdzielczości (`?ratio=N` zmienia), a gdy bez cieni dalej jest poniżej 40 fps, tryb oszczędny schodzi jeszcze do 0,6 i 0,5 (`LOW`, poziomy 6 i 7; tablet Huawei przy 0,5 miał 16–60 fps) i bez połysku pluszu na stworkach (`sheen` 0), bo Adreno 308 mocno przycinał. Portrety albumu mają osobny renderer i też muszą dostać `mediump`, inaczej są czarne. Pozostałe przełączniki: `nosun`, `norim`, `nohemi`, `amb`, `nofacing`, `mediump`, `noaa`.
- W 0.162 scena nie ma `environmentIntensity`, więc przyciemnianie odbić nocą (`setEnvironment` w `main.ts`) ustawia `envMapIntensity` na materiałach: od razu po zmianie i co sekundę dla nowo wczytanych rzeczy.
- Jeśli gra mimo to nie wystartuje, `index.html` pokazuje kartę z przyczyną (błąd, WebGL 2 i 1, przeglądarka) zamiast pustego nieba.

## PWA
- `public/manifest.webmanifest`, ikony `icon-192/512.png` i `apple-touch-icon.png` (serduszko), `public/sw.js`: najpierw sieć, a bez sieci kopia z pamięci podręcznej, więc gra działa offline po pierwszym wczytaniu (modele i muzyka trafiają do pamięci dopiero, gdy raz się pobiorą). Na `localhost` service worker się nie rejestruje, żeby nie mieszać w testach. Tryb oszczędny (`watchFps` w `main.ts`): co 2 s mierzy klatki i poniżej 40 fps obniża jakość o poziom (ostrość 2 → 1,5 → 1,25 → 1, potem prostsze cienie, na końcu bez cieni, poziom 5). Telefon z najwyżej 4 rdzeniami zaczyna od poziomu 1. Nigdy nie wraca w górę, a poziom zapamiętuje w `fable-shelter-quality`. `?fps` pokazuje licznik w lewym dolnym rogu, `?quality=N` wymusza poziom i blokuje automatyczne obniżanie, `__quality()` go podaje. W testach (swiftshader) gra schodzi do poziomu 5, czyli bez cieni (`?quality=0` przywraca pełną jakość do zrzutów). PWA lokalnie sprawdzisz pod `http://fs.localhost:4173` (panel przeglądarki w aplikacji Claude nie ma service workerów, trzeba Playwrighta albo Chrome).

## Haki debug (URL i konsola)
- `?speed=N` robi N kroków gry (po 1/30 s) na klatkę, `?norender` rysuje co 30. klatkę, a `window.__tick(dt)` (jeśli test go ustawi) jest wołany przed każdym krokiem. `__G()` zwraca obiekt `Game`. Tego używa test całej gry.
- `?reset=1` czyści zapis. `?ads` udaje reklamy (boostery poza Poki), `?poki` ładuje SDK Poki, `?stats` pokazuje liczniki. `?debug` włącza ostrzeżenia. `?dtmax=0.4` pozwala grze iść w wolnej przeglądarce testowej. `?eyes=closed|half` zamyka powieki. `?rare` sprawia, że każdy pacjent jest rzadką odmianą. `?day=RRRR-MM-DD` udaje inną datę dla prośby dnia. `?night` zaczyna grę w nocy, `?rain` włącza deszcz na stałe.
- `window.__game()` zwraca stan, `__keeper()` pozycję opiekuna, `__walk(x,z)` wysyła go w punkt. `__coins(n)` i `__hearts(n)` dodają monety i serduszka. `__strays()` pokazuje zabłąkane przedmioty, a `__items()` wszystkie fiolki z pozycją i właścicielem, a `__spots()` liczbę zakupów i widoczne punkty budowy (pozycja, cena, serduszka). `__calls()` podaje liczbę wywołań rysowania na klatkę, a `__renderer` daje renderer do profilowania (`info.render.triangles`). Dekoracje w wielu kopiach rób jako `InstancedMesh`.

## Modele i narzędzia (`tools/`)
Optymalizacja modeli, powieki, lżejsze wersje i sprawdzanie plamek: `docs/MODELE.md`. Przeczytaj, zanim dotkniesz `public/models/` albo `tools/models/`.

## Testy (`tools/tests/`)
Skrypty Playwright na Chromium z swiftshader. Robią zrzuty do `tools/out/`.
```
npm run build && npx vite preview --port 4173     # w katalogu głównym
cd tools && node tests/care.mjs                   # też: pond, prog, lids, helpers, vials, glade, snow, workers, water, adoption, album, decor, collide, variant, daily, play, daynight, sea, wardrobe, music, perf, offline, newplayer (gracz idzie tylko za strzałką), quality (tryb oszczędny), tutorial (poprawki po testerze, zrzuty tut1–9), looks (`TAG=before`/`after`: te same widoki do porównań), halloween (zrzuty hw1–6), cave (zrzuty cave0–4), tent (namiot dla gościa), boosters (kopia zapisu, liczniki, pomoc przy ścieleniu, boostery, skrzynka), lang (napisy po polsku i angielsku na 320 px), gate (ze środka zagrody do kociołka przez bramę, `RUNS=N`), audit (poprawki z audytu 12.11.2026: środek zagrody, wpłacone monety i wczytujący się mieszkańcy w zapisie, nieudane pobranie modelu, skały jaskini, pamięć grafiki po pacjentach, którzy odeszli; trwa kilka minut)
RUNS=2 CAREFUL=1 node tests/playthrough.mjs       # cała gra od zera, kilka minut na przejście; bez CAREFUL gracz idzie prosto przez krzaki
```
W środowisku chmurowym Claude Chromium leży w `/opt/pw-browsers`, a Playwright jest przypięty do 1.56.0. Od 30.10.2026 jest tam tylko `chromium-1243`, więc testy potrzebują `CHROME_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`. Lokalnie może być potrzebne `npx playwright install chromium`.
- Windows (u użytkownika): pobieranie `chromium-1194` urwało się bez `chrome.exe`. Kompletny jest `chromium-1243`, więc wszystkie skrypty przyjmują `CHROME_PATH` (`%LOCALAPPDATA%\ms-playwright\chromium-1243\chrome-win64\chrome.exe`).
- Zapis testowy wgrywaj przez `page.addInitScript`. Zapis do `localStorage` z działającej gry nadpisze przy przeładowaniu `pagehide`.
- Mieszkaniec pomaga tylko wtedy, gdy sam niczego nie potrzebuje, więc w teście ktoś musi go karmić i kłaść spać.
- Od 24.10 do 2.11 trwa Halloween, także w testach. Zapis po samouczku pokazuje wtedy kartę wydarzenia, która przechwytuje kliknięcia, a album ma dodatkową stronę (2 karty). Testy, które klikają, otwierają grę z `&nostory`, a liczące karty albumu z `&day=` spoza wydarzenia (28.10.2026 padły przez to album i szafa).
- Przy obciążonym procesorze (ComfyUI, równoległe testy, budowanie) niektóre punkty bywają fałszywie czerwone: smok w `boosters.mjs`, kraken w `helpers.mjs`, kamera przy adopcji w `tutorial.mjs`. Zanim zaczniesz szukać błędu, puść taki test sam.

## Tempo gry
Wyniki testów całej gry od 15.10.2026: `docs/TEMPO.md`. Aktualny punkt odniesienia to `docs/tempo.json` (skill `/balans`). Rozrzut między przebiegami jest duży, więc pojedynczy przebieg nie wystarcza do porównań.

## Otwarte sprawy
- Fiolki „chodzące same”: nie udało się odtworzyć. `tests/vials.mjs` sprawdza fiolki klatka po klatce (`__items()`) przez 100 rund w pełnym obozie i niczego nie znalazł. Podejrzenie: to fiolka niesiona na głowie przez pomagającego mieszkańca. Usunięto też martwy kod starego wynajętego krakena-pomocnika. Nadal potrzebny zrzut ekranu od użytkownika. Noc 20/21.10.2026: 150 rund, jedyny alarm to zwykły lot perły z tacy do rąk, który przeglądarka testowa (ok. 1,3 klatki na sekundę) przeskoczyła między dwiema klatkami. Kod pomocników wygląda poprawnie: niesiona fiolka jest przypięta do głowy, a przy przerwanej pracy znika z kurzem.
- Tempo gry: aktualny stan to 39 zakupów w 117–120 minut gry (po 3 przejścia `CAREFUL=1`, 30.10.2026, `docs/TEMPO.md` i `docs/tempo.json`). Wolniejszych wyników z nocy 20/21.10.2026 (27–30 zakupów po 145–150 minutach) nie wyjaśniono. Rozrzut między przebiegami jest duży, więc porównuj mediany z kilku przejść.
- Gatunki stawu, polany i śniegu mają modele z Pixal3D zrobione przez Claude'a (tylko z przodu). Widoki z tyłu i z boku do Hunyuan3D 3.0 są już gotowe (16.10.2026, FLUX 3 edit), patrz `docs/PROMPTY.md`.
