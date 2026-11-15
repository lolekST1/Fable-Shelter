# Odłożone uwagi z recenzji

Zgłoszenia z iloczynem częstości i wagi poniżej 5 (zasada z CLAUDE.md). Kod nieruszany; wracamy, gdy coś w tym miejscu i tak się zmienia.

| Data | Miejsce | Uwaga | Częstość × waga | Gdyby poprawiać |
|---|---|---|---|---|
| 2026-11-15 | `tools/tests/audit.mjs` (B3, podwójne dispose) | Przy trzech kopiach `afterDouble === 0` przejdzie też bez flagi `disposed`; regresję łapie dopiero `afterLast === 1` | 1 × 2 = 2 | Dwie kopie, `x.dispose()` dwa razy, potem `freed === 0`, póki `y` żyje |
| 2026-11-15 | `src/creature.ts` (konstruktor) | Komentarz „the file's mesh stays untouched” jest nieścisły: geometria z pliku jest raz zmieniana przy wliczaniu położenia | 1 × 1 = 1 | Dopisać „apart from the one-time bake” |
| 2026-11-15 | `docs/ARCHITEKTURA.md` (akapit `creature.ts`) | Portrety mają własne parsowanie nie tyle przez osobny renderer, co dlatego, że `freeModel` po obrazku zwolniłby tekstury żywym kopiom w scenie | 1 × 1 = 1 | Poprawić uzasadnienie w zdaniu o portretach |
| 2026-11-15 | `src/main.ts` (`c.onDispose`) | Zamknięcie trzyma sparsowany GLTF w pamięci JS, dopóki ktoś trzyma referencję do zwolnionej kopii (np. osoba adoptująca przez kilka sekund); pamięć grafiki jest zwolniona | 1 × 1 = 1 | `c.onDispose = undefined` po wywołaniu w `dispose()` |
