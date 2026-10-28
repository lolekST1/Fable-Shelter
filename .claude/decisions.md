# Rejestr rozstrzygnięć (decyzje podjęte bez pytania)

data | decyzja | uzasadnienie | jak cofnąć
--- | --- | --- | ---
2026-10-28 | Modele zostają w base64 (`.glb.txt`), bez przejścia na zwykłe `.glb` | Serwery kompresują tekst: 3,0 MB z brotli wobec 3,4 MB zwykłego `.glb`, a 2,4 MB tylko wtedy, gdy host kompresuje też pliki binarne, czego dla Poki nie wiadomo | W `loadModel` (`main.ts`) pobierać `.glb` i dodać do builda zamianę `.glb.txt` na `.glb`
2026-10-28 | W poziomym oknie kamera stoi na 12,5 (było 10), a cienie obejmują ±8 m | W 16:9 widać było za mało terenu przed opiekunem | `frameCamera()` w `main.ts`
2026-10-28 | Na niskich oknach (poziomo, do 500 px wysokości) przyciski i liczniki mają `zoom: .72`, album 5 kolumn | W najmniejszym oknie Poki (640×360) karta „Dziś” zasłaniała pół ekranu, a album pokazywał jeden rząd | Usunąć `shortCss` w `main.ts`
2026-10-28 | Bez sterowania klawiaturą | Poki wymaga wtedy pauzy pod ESC/spacją, a mysz i dotyk wystarczają | Dodać obsługę klawiszy w `joystick.ts` i pauzę
2026-10-28 | Pasek wczytywania znika, gdy opiekun i obóz są gotowe, nie czeka na modele rekwizytów | Czekanie na rekwizyty trzymało pasek nad grywalną już grą i kartą startową, a rekwizyty mają proste zastępstwa | `loadDone()` w `main.ts` (po utworzeniu `Game`)
2026-10-28 | Namiot dla gościa jest darmowy i działa od końca samouczka, bez punktu budowy: najwyżej 3 goście, czekają do 90 s | Nowy punkt w `SPOTS` byłby dostępny dopiero po jaskini (kolejność zapisów), a pomoc jest potrzebna od środka gry | `TENT_MAX`, `TENT_WAIT` w `game.ts`; usunięcie: w gałęzi `cured` wrócić do `p.state = 'leaving'`
2026-10-28 | Gość nie liczy się do aktywnych pacjentów | Inaczej trzy namioty blokowałyby przychodzenie nowych chorych | Warunki `active` i `lonely` w `game.ts`
2026-10-28 | Paczka Poki (`npm run build:poki`): zawsze z SDK, bez service workera, pliku PWA i napisu „prototype”; haki debug (`window.__*`, przełączniki w adresie) zostają | Haki nic nie robią bez ręcznego wywołania, a są potrzebne testom | `vite.config.ts` (wtyczka `forPoki`)
2026-10-28 | Miniaturka: ilustracja Z-Image nr 3 (opiekun w skoku z eliksirem, smoczek, chmurnik, namioty) | Najczytelniejsza poza i spójne z grą postacie; kadr z gry był za tłoczny (dymki) | Inna z `D:\ComfyUI-Shared\output\FS\poki\Archiwum`
2026-10-28 | Animowana miniaturka to na razie przybliżenie ilustracji (ffmpeg), nie nagranie gry | Poki chce jej dopiero przy miękkiej premierze, a nagranie z przeglądarki testowej ma kilka klatek na sekundę | Nagrać grę na telefonie
