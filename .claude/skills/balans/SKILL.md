---
name: balans
description: "Sprawdza tempo i ekonomię Fable Shelter na kilku przejściach całej gry i porównuje z punktem odniesienia. Użyj po zmianie cen, nagród, progów serduszek, nowego terenu albo gdy pada pytanie, czy gra nie jest za wolna lub za szybka. Argument (opcjonalny): co sprawdzić albo jaką zmianę przetestować."
---

# /balans

Cel: odpowiedzieć liczbami, jak zmiana wpływa na tempo gry, zanim trafi do graczy.

## Kroki
1. Ustal, co jest pytaniem: sam pomiar obecnej wersji, porównanie przed i po zmianie, czy szukanie lepszych liczb.
   Jeśli argument jest pusty, zmierz obecną wersję i porównaj z `docs/tempo.json`.
2. Zleć pracę agentowi `ekonomista` (Agent, `subagent_type: ekonomista`). Przekaż mu:
   - pytanie i ewentualną zmianę do przetestowania (dokładne liczby i miejsca w kodzie),
   - czy wolno mu zmieniać kod gry (tylko gdy użytkownik o to prosił albo zmiana jest częścią bieżącego zadania),
   - liczbę przebiegów: domyślnie 3, przy porównaniu dwóch wersji po 3 na każdą.
   Agent działa długo (kilkanaście minut na przebieg). W tym czasie możesz robić inne rzeczy.
3. Z raportu agenta przekaż użytkownikowi tylko to, co zmienia decyzję: 1–3 obserwacje z liczbami,
   jedną rekomendację i krótko alternatywy. Bez powtarzania całej tabeli, chyba że użytkownik o nią prosi.
4. Jeśli zmiana zostaje w grze, upewnij się, że agent zapisał nowy punkt odniesienia (`SAVE=1 node tests/tempo.mjs`)
   i dopisał sekcję „Tempo gry …” do `CLAUDE.md`. Rozstrzygnięcia podjęte bez pytania dopisz do `.claude/decisions.md`.

## Uwagi
- Pojedynczy przebieg nie wystarcza do porównań. Mniej niż 3 przebiegi tylko wtedy, gdy chodzi o szybkie
  sprawdzenie, czy gra w ogóle przechodzi się do końca (zacięcia, blokady).
- Testy przy obciążonym procesorze nie zmieniają minut gry (liczą się kroki gry, nie czas rzeczywisty), ale trwają dłużej.
