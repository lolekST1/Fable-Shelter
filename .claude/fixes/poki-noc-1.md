# Runda poprawek 1: recenzja gałęzi noc/poki (28.10.2026)

Recenzja: agent `code-reviewer` w świeżym kontekście (diff main..noc/poki, src + index.html + vite.config.ts + package.json).
Bez błędów krytycznych. 1 ważny, 10 drobnych, wszystkie na poziomie `sonnet`. Poprawki: agent Sonnet, jedna próba.

## Poprawione
1. (ważne) Na Poki `gameplayStart` mógł pójść przed `gameLoadingFinished`, gdy gracz kliknął w trakcie paska. `platform.ts`: obietnica `loaded` z `loadingFinished()`, `playing()` czeka na `ready` i `loaded` i pilnuje, żeby nie wysłać dwa razy tego samego zdarzenia (`sent`).
2. Pasek wczytywania mógł zostać na zawsze, gdy model się nie pobrał. `.catch` w `main.ts` woła `loadDone()`, a `why()` w `index.html` chowa `#load`.
3. Pomagający mieszkaniec mógł dostarczyć lekarstwo gościowi (podwójne monety, drugi namiot). Stan `'guest'` w `lost`/`gone`, a `pitchTent` nie stawia drugiego namiotu.
4. `foldTent`: `splice` tylko przy indeksie >= 0.
5. Namiot bez dźwięku zakupu i gwiazdek (`popIn(…, quiet)`), licznik `guest:tent:start` raz na sesję.
6. Geometrie i materiały namiotu oraz tekstura dymka gościa są współdzielone, a stara mapa dymka jest zwalniana.
7. `tent.userData.r = 0.5`: stworki omijają namiot, a pacjenci nie siadają w nim.
8. Blokada przewijania: spacja działa na przyciskach, doszły PageUp/PageDown/Home/End, a kółko jest blokowane wszędzie poza albumem, szafą i kopią zapisu.
9. Pasek wczytywania się nie cofa.
10. Szafa na niskim ekranie ma 6 kart w rzędzie.
11. Paczka Poki nie zawiera `sw.js` ani `manifest.webmanifest`.

## Co nie wyszło
Nic.

## Co sprawdzono
`npx tsc --noEmit`, `npm run build`, `npm run build:poki` (bez `sw.js` i manifestu). Kod `platform.ts` przejrzany ręcznie. Testy Playwright po poprawkach: patrz raport poranny.
