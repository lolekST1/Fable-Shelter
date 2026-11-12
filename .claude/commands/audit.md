---
description: Pełny przegląd projektu po premierze nowego modelu. Najpierw raport, poprawki dopiero po zatwierdzeniu.
---

Przeczytaj cały projekt Fable Shelter i znajdź wszystko, co jest zepsute, niespójne, nieefektywne
albo już niepotrzebne. Nowy model może wyłapać rzeczy, które poprzedni przeoczył.

Tryb: $ARGUMENTS
- puste albo `raport`: nie zmieniaj żadnego pliku. Oddaj tylko raport.
- `napraw`: popraw wyłącznie pozycje z grupy A z ostatniego raportu, które Karol zatwierdził.

## 1. Co przeczytać
- Cały `src/`, `tools/tests/`, `models/` (skrypty), `package.json`, `vite.config.*`.
- `CLAUDE.md`, pliki w `docs/` i `.claude/decisions.md`. Każde twierdzenie z dokumentacji
  porównaj z kodem. Opis, który już nie zgadza się z kodem, to osobna pozycja w raporcie:
  agenci ufają dokumentacji bardziej niż kodowi, więc nieaktualny opis szkodzi.
- Decyzje zapisane w `.claude/decisions.md` traktuj jako ustalone. Nie proponuj ich zmiany,
  chyba że kod pokazuje, że decyzja już nie działa.

## 2. Czego szukać
- Błędy: złe warunki, stany, z których gra nie wychodzi, wyścigi przy wczytywaniu, wycieki
  (nasłuchiwacze, timery, obiekty three.js bez `dispose`).
- Niespójności: ta sama logika w kilku miejscach, różne nazwy tej samej rzeczy, flagi i statusy
  rozrzucone po plikach zamiast jednego stanu.
- Martwy kod: funkcje, pliki, assety i testy, których nic nie używa.
- Wydajność pomiń, jeśli nie widać jej gołym okiem. Do pomiarów jest `/perf-review`.

## 3. Raport
Dwie grupy, w każdej `plik:linia`, problem w jednym zdaniu, proponowana zmiana:
- A. Pewne: błąd albo martwy kod potwierdzony w kodzie, poprawka bez ryzyka dla rozgrywki i wyglądu.
- B. Do decyzji Karola: wszystko, co zmienia zachowanie gry, balans, wygląd albo wymaga wyboru.
Na końcu: nieaktualne miejsca w dokumentacji i lista obszarów sprawdzonych bez uwag.

## 4. Tryb `napraw`
- Jedna poprawka na commit, z opisem, który punkt raportu zamyka.
- Po każdej: `npm run build`. Po zmianach w scenie także `tools/tests/looks.mjs` z `TAG=before`
  i `TAG=after`, żeby wygląd się nie zmienił.
- three.js zostaje na 0.162.0 (WebGL 1, patrz CLAUDE.md).
- Grupy B nie ruszaj.
