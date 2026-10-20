# Fable Shelter na Poki – zasady i wnioski

Przeczytane 21.10.2026 w przewodniku dla twórców (developers.poki.com). Liczby i procenty umowy Poki ustala indywidualnie, w przewodniku ich nie ma.

## Najważniejsze zasady Poki
- **Odbiorcy.** Główna strona Poki jest formalnie dla osób od 16 lat, młodsi trafiają na osobne Poki Kids. Każda gra musi być jednak „bezpieczna dla odbiorców w każdym wieku”. Poki odrzuca przemoc, długotrwały strach, hazard, alkohol i czaty. Pluszowe schronisko pasuje do tego bardzo dobrze.
- **Pieniądze wyłącznie z reklam Poki.** Nie wolno mieć zakupów w grze, przycisków „kup monety” ani „wyłącz reklamy”, ani reklam innych firm. Poki bierze udział w przychodach z graczy, których sam przyprowadzi.
- **Reklama z nagrodą** (`rewardedBreak`): zawsze z wyboru gracza i nigdy jako blokada postępu. Obok musi stać zwykły przycisk, co najmniej tak duży jak przycisk reklamy. Przycisk reklamy nie może być zielony i musi mieć wyraźny znak 🎬. Jedna reklama daje jedną nagrodę. Gra nie może mieć własnych zegarów do następnej reklamy ani natarczywie zachęcać do oglądania. Z blokerem reklam gra musi działać, ale nagrody wtedy nie ma (i nie wolno pokazywać komunikatu o blokerze).
- **Reklama w przerwie** (`commercialBreak`): tylko przy powrocie do gry z pauzy lub menu. To Poki decyduje, czy reklama w ogóle się pokaże.
- **Zdarzenia SDK:** `gameplayStart` przy pierwszym dotknięciu gracza, `gameplayStop` przy każdej pauzie i menu, nigdy dwa takie same zdarzenia z rzędu. Na czas reklamy dźwięk musi być wyciszony.
- **Sieć:** gra nie może łączyć się z zewnętrznymi serwerami bez zgody Poki. Google Analytics jest zakazane. Statystyki wysyła się przez `PokiSDK.measure(kategoria, co, akcja)`, a Poki pokazuje je w swoim panelu.
- **Urządzenia:** gra musi działać na komputerze, telefonie i tablecie. Na komputerze okno ma proporcje 16:9 (np. 1031×580), a na telefonie wypełnia cały ekran. Gry grywalne pionowo mają według Poki więcej graczy i dostają dodatkowy pasek reklam (Gamebar).
- **Wczytywanie:** gracze odchodzą, gdy wczytywanie trwa ponad 10 s. Zalecane jest ładowanie po kawałku. Bez ekranów tytułowych na start, a samouczek ma być obrazkowy, nie tekstowy.
- **Język:** publiczność jest globalna, więc tekst po angielsku (lub tylko po polsku) wyklucza dużą jej część. Poki zaleca kilka języków.
- **Zapis:** gra ma zapisywać postęp, a `localStorage` musi być w `try/catch` (tryb incognito). Chmura Poki (AUDS) jest prototypem do dzielenia się treściami, nie do zapisów graczy.
- **Umowa:** preferowana jest wyłączność na całą sieć (przeglądarki, Discord, YouTube Playables) przez 5 lat. Sklepy z aplikacjami (Google Play, App Store) i Steam zostają nasze. Bez wyłączności Poki płaci jednorazowo, bez udziału w przychodach.
- **Test przed premierą:** gra trafia na kilka dni do około 10 000 graczy. Liczą się trzy rzeczy, każda tak samo ważna: kliknięcia w miniaturkę, średni czas na stronie i odsetek osób, które naprawdę zaczęły grać (`gameplayStart`).

## Wnioski dla Fable Shelter
1. **Poki zamiast „zakupu na wspieranie” z pierwszego planu.** Na Poki zakupów nie ma, więc zarabiamy na reklamach z nagrodą (zrobione na gałęzi `boostery`: skrzynka ×2, monety ×2, ochotnik) i na reklamach w przerwach (zamknięcie albumu i szafy). Zakup jednorazowy zostaje pomysłem na wersję w Google Play.
2. **Wyłączność a nasza strona na Vercelu.** Umowa z wyłącznością obejmuje całą sieć, więc fable-shelter.vercel.app pewnie trzeba by wyłączyć albo ukryć. **To decyzja dla Karola** przed zgłoszeniem.
3. **Języki to największa luka.** Gra jest prawie bez tekstu, ale karty (cel gry, nowy pacjent, nowe lekarstwo, Halloween, boostery, kopia zapisu) i nazwy w albumie są tylko po polsku. Przed Poki potrzebny jest co najmniej angielski, a język trzeba wybierać z przeglądarki.
4. **Komputer 16:9.** Gra jest projektowana pionowo (390×844). Trzeba sprawdzić i dopracować widok w poziomym oknie 1031×580 (kamera, przyciski, karty) i sterowanie myszą.
5. **Wczytywanie.** Na start schodzi około 6 MB (1 MB kodu i 4,5 MB modeli), a reszta (razem 74 MB) dociąga się później. To się mieści, ale modele są zapisane jako base64 (o około 1/3 większe). Na Poki, gdzie pliki hostuje Poki, można je podawać jako zwykłe `.glb`. Do tego przydałby się pasek wczytywania.
6. **Karta z celem gry na start** jest bliska „ekranu tytułowego”, którego Poki nie lubi. Ma jednak obrazki i jedno stuknięcie, więc pewnie jest w porządku. Warto ją sprawdzić w ich teście z prawdziwymi graczami.
7. **Statystyki** już działają przez `measure()` (gałąź `boostery`): kroki samouczka, każdy zakup, adopcje (1, 5, 10, 25…), boostery, kopia zapisu i sesje według dnia gry (czy ktoś wraca).
8. **Kopia zapisu** w albumie to kod do skopiowania. Na Poki nie wymaga żadnego serwera, więc nie potrzebuje zgody na połączenia.

## Co dalej przed zgłoszeniem
1. Decyzja: wyłączność na Poki czy zostajemy przy własnej stronie (punkt 2).
2. Angielska wersja tekstów i wybór języka.
3. Widok 16:9 na komputerze i sterowanie myszą.
4. Konto w Poki for Developers, wgranie wersji testowej i sprawdzenie w Poki Inspector.

## Źródła
- https://developers.poki.com/guide/requirements-quality
- https://developers.poki.com/guide/content-player-safety
- https://developers.poki.com/guide/how-monetization-works
- https://developers.poki.com/guide/revenue-deal-types
- https://developers.poki.com/guide/sdk-html5
- https://developers.poki.com/guide/game-events
- https://developers.poki.com/guide/external-resources-policy
- https://developers.poki.com/guide/auds
- https://developers.poki.com/guide/what-we-look-for
- https://developers.poki.com/guide/web-fit-test
- https://developers.poki.com/guide/easy-access
- https://poki.com/pl/c/terms-of-use
