---
description: Przegląd wydajności gry. Najpierw pomiar i raport, zmiany w kodzie dopiero po zatwierdzeniu.
---

Zrób przegląd wydajności Fable Shelter. Nie zmieniaj kodu w `src/`, dopóki Karol nie zatwierdzi raportu.

## 1. Zmierz, zanim cokolwiek ocenisz
- `npm run build`, potem `npx vite preview --port 4173`, a w `tools/`: `node tests/perf.mjs`
  (wywołania rysowania w sześciu miejscach i liczba widocznych meshów).
- Napisz jednorazowy skrypt pomiaru w scratchpadzie, nie w repo. Zapis i adres jak w `perf.mjs`
  (`?dtmax=0.4&quality=0&nostory`, wszystko kupione). W pełnym obozie zbierz:
  - `__renderer.info.render.triangles` i `__calls()`,
  - czas klatki: mediana i 95. percentyl z 300 klatek (`performance.now()` w `requestAnimationFrame`),
  - czas samej logiki: `__G().update` opakowany na czas pomiaru w skrypcie, nie w `src/`,
  - profil CPU z 10 s przez CDP (`Profiler.start` / `Profiler.stop`): 15 funkcji z największym czasem własnym,
  - liczbę nowych obiektów na klatkę: `HeapProfiler.startSampling` przez 10 s i miejsca, które najwięcej alokują.
- Przeglądarka testowa (swiftshader) liczy grafikę na procesorze. Porównuj liczby między sobą, nie z telefonem.
  Przy obciążonym komputerze (ComfyUI, inne testy) wyniki są zawyżone, więc pomiar puść dwa razy.

## 2. Wybierz 5 najdroższych miejsc i przypisz każde do jednego przypadku
- Dużo trójkątów (ciężki model, wiele kopii) → `models/lighter.sh` albo `InstancedMesh`.
- Wiele osobnych meshów tego samego rodzaju → `InstancedMesh` albo scalona geometria.
- Nowe obiekty w każdej klatce (`new Vector3`, tablice, domknięcia w `update`, `walk`, `circles`, `route`)
  → obiekty używane ponownie.
- Szukanie po wszystkich stworkach co klatkę (`find`, `filter`, `some`) → lista albo indeks
  aktualizowany przy zmianie stanu.
- Coś ma już cache, a dalej jest wolne → przeprojektuj to miejsce, nie dokładaj drugiego cache.
- Kolejne `await` przy wczytywaniu modeli, które od siebie nie zależą → `Promise.all`.
- Koszt pikseli (rozdzielczość, cienie) → istniejące poziomy trybu oszczędnego, bez nowych przełączników.
- Nic nie pasuje → napisz, czego pomiar nie pokazuje, i zaproponuj prosty eksperyment.

## 3. Raport (bez zmian w kodzie)
Tabela: miejsce (`plik:linia`), zmierzony koszt, przypadek, proponowana zmiana, spodziewany zysk
w liczbach i którym pomiarem to sprawdzić. Pod tabelą lista rzeczy sprawdzonych i tanich,
żeby nikt ich drugi raz nie mierzył.

## Ograniczenia
- three.js zostaje na 0.162.0 (WebGL 1, patrz CLAUDE.md). Nie proponuj aktualizacji.
- Zmiana musi działać na WebGL 1 i WebGL 2 oraz na każdym poziomie trybu oszczędnego (`tests/nowebgl2.mjs`, `tests/quality.mjs`).
- Pomijaj miejsca, które zajmują mniej niż 5% czasu klatki.
- Po zatwierdzeniu: jedna zmiana naraz. Po każdej ten sam pomiar oraz `tests/looks.mjs`
  z `TAG=before` i `TAG=after`, żeby wygląd się nie zmienił.
