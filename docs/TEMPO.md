# Fable Shelter – tempo gry

> Przeniesione z CLAUDE.md 5.11.2026, żeby nie ładowało się w każdej sesji. Treść bez zmian.

## Tempo gry (test całej gry, 15.10.2026)
Automatyczny gracz (szybszy od człowieka) przechodzi całą grę w 49–58 minut gry. Pierwsze 10 zakupów zajmuje po 1,5–2 min (5–15 wyleczeń), ostatnie po 4–5 min (25–40 wyleczeń). W grze jest ok. 170 adopcji na 350–400 wyleczeń. Progi serduszek (3/6/10/13) nigdy nie blokują, bo gracz ma ich wtedy 35/45/65/85. Po ostatnim zakupie przybywa ok. 330 monet na minutę i nie ma ich na co wydać. Pożegnania zajmują graczowi ok. 1/3 czasu. Krzak jagód leży na drodze do kociołka i napełnia ręce jagodami, więc nieuważny gracz częściej chodzi do kosza (w jednym przebiegu 4. zakup przyszedł dopiero po 10,8 min zamiast ok. 5).
Po zmianach (teren 4, progi 15/30/50/70/90/110, jagody tylko dla głodnych) cała gra trwa u automatycznego gracza 74 minuty gry. Zakupy Śnieżnego wzgórza zajmują po 4–6 min (33–59 wyleczeń). Szybki gracz nadal nie czeka na serduszka, wolniejszy może.

## Tempo gry z zatoczką (test całej gry, 17.10.2026)
Po obniżce cen zatoczki automatyczny gracz przechodzi wszystko (34 zakupy) w 136 minut gry. Zakupy zatoczki trwają po 5,6–7,6 minuty, tak jak na Śnieżnym wzgórzu. Progi serduszek nie blokują ani sekundy. Przy pierwszych cenach zatoczki jej zakupy zajmowały 7–14 minut.
Pułapki znalezione przez ten test: kieszeń między domkiem a końcem wydmy (opiekun utykał tam na zawsze) i pacjenci obozu sadzani przy domku, poza zasięgiem opiekuna. Jeśli nie ma wolnego miejsca, pacjent przy domku nie siada i przychodzi później.

## Tempo gry po poprawkach testera (test całej gry, noc 17/18.10.2026)
Dwa przejścia: wszystkie 34 zakupy w 128 i 132 minuty gry (wcześniej 136), bez zacięć, progi serduszek nie blokują ani sekundy. Dłuższe ścielenie (1,6 s) i kosz z opóźnieniem nie spowolniły gry. Czas opiekuna: pożegnania ok. 42%, ścielenie ok. 22%, leczenie ok. 11%. Ok. 300 pacjentów na przejście odchodzi z braku wolnych legowisk.

## Tempo gry z jaskinią (test całej gry, noc 20/21.10.2026)
Jedno przejście `CAREFUL=1 MAXMIN=280`: wszystkie 39 zakupów w 180 minut gry, bez zacięć, progi serduszek nie blokują. Zakupy jaskini trwają po 6,2–7,3 minuty, zatoczki po 5,4–6,7. W tym przebiegu 34 zakupy przyszły po 146 minutach, a w czterech innych tej nocy po 150 minutach było ich tylko 27–30. Rozrzut między przebiegami jest duży, więc pojedynczy przebieg nie wystarcza do porównań.

## Tempo gry (3 przejścia, 30.10.2026, punkt odniesienia `docs/tempo.json`)
Trzy przejścia `CAREFUL=1` na kodzie z namiotem dla gościa, 12 językami i poprawką zamarzania przy adopcji: wszystkie 39 zakupów w 117,5–119 minut gry. Rozrzut między przebiegami to zwykle około minuty na zakup (wyjątek: 7. zakup, 0,2–3,3 min). To dużo szybciej niż 180 minut z 20/21.10. Późne zakupy (zatoczka, jaskinia) trwają po 3,3–5 minut, pierwsze dziesięć po 0,7–2,2. Serduszka nie blokują ani sekundy (po ostatnim zakupie gracz ma ok. 540). Po ostatnim zakupie przybywa ok. 1000 monet na minutę (wcześniej 330), a najdroższa rzecz w szafie kosztuje 2500. Mimo namiotów ok. 810 pacjentów na przejście odchodzi bez legowiska. Czas opiekuna: pożegnania 41%, ścielenie 16%, leczenie 13%, monety 12%.
Przed poprawką drugi przebieg zamarzł w 81. minucie: osoba adoptująca doszła do końca ścieżki, stworek się przesunął i `a.path[a.path.length - 1]` był pusty. Wyjątek w `setAnimationLoop` zatrzymuje całą grę, także u gracza.

## Tempo gry (balans serduszek, monet i legowisk, 30.10.2026, 3 przejścia, nowy `docs/tempo.json`)
Zmienione: próg serduszek furtki 50 → 60, łopaty 90 → 134, kilofa 190 → 415 oraz ceny w szafie: korona 1500 → 4000, bańki 1300 → 3500, gwiazdki 2500 → 8000. Trzy przejścia `CAREFUL=1`: wszystkie 39 zakupów w 120 minut (było 119), mediana tempa zakupów bez zmian (±0,5 min). Serduszka blokowały automat łącznie 78, 15 i 0 s (wcześniej 0), mediana 15 s. Szafa kosztuje teraz ok. 21 000 monet zamiast 12 000 (ok. 21 minut nadwyżki zamiast 12); automat szafy nie kupuje, więc monet/min po ostatnim zakupie nadal ok. 1000. Odesłani pacjenci: 796 (było 813), to nie błąd (patrz `.claude/decisions.md`).

## Standard pomiaru tempa (12.11.2026)
Tempo mierzymy zawsze tak samo: przejścia jedno po drugim (`RUNS=N` w jednym procesie), `CAREFUL=1 SPEED=20`, nic w tle (ComfyUI, inne testy, budowanie, drugi `playthrough`). Przebiegów zrobionych inaczej nie porównuj z `docs/tempo.json`.
Powód: kolejny pacjent nie przyjdzie, dopóki nie wczyta się model poprzedniego (`spawning` w `spawnPatient`). Wczytanie trwa w czasie rzeczywistym, a test przewija grę, więc im szybsze przewijanie i im bardziej zajęty procesor, tym mniej pacjentów na minutę gry. Widać to po odesłanych: w obciążonych przebiegach było ich 25–47 na 200 minut, w punkcie odniesienia ok. 800 na 120.
Pomiar z 12.11.2026 na wersji sprzed audytu (`db1ffdc`), zakupy do 60. minuty gry i minuta zakupu 13. / 20.:
- punkt odniesienia z 30.10 (`docs/tempo.json`): 24, 20 / 44;
- jeden przebieg, `SPEED=20`, nic w tle: 24, 21 / 43;
- jeden przebieg, `SPEED=60` (u użytkownika, na `audit/a8-a12`): 22, 22 / 48;
- dwa przebiegi naraz, `SPEED=60`: 21, 24 / 51 (z wymuszonym `?halloween`: 22, 21 / 48, czyli wydarzenie nie ma wpływu);
- trzy przebiegi naraz i kilka przeglądarek testowych, `SPEED=60`: 18–20, 23–27 / 57–70.
Punkt odniesienia z 30.10 odpowiada więc warunkom standardu (sprawdzone na pierwszych 70 minutach gry; nie zapisano, jak go wtedy puszczano).
Przy tych samych warunkach wersja sprzed audytu, `main` (`588345c`) i `audit/a8-a12` wyszły tak samo (po 2 przejścia `MAXMIN=200` naraz: 31–34, 31–35 i 32–37 zakupów), więc poprawki z audytu tempa nie zmieniły. Wolny przebieg użytkownika z 12.11 (38 zakupów w 150 minut) to skutek `SPEED=60`.
