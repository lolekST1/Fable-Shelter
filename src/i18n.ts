/**
 * Player-facing words in Polish or English. The Polish text stays in the code where it is used and is the key here;
 * t() gives the English one when the game runs in English. Polish browsers get Polish, every other one English;
 * ?lang=pl|en picks one for tests. A new label: write it in Polish, wrap it in t() and add its English below.
 */

const q = new URLSearchParams(location.search).get('lang');
export const lang: 'pl' | 'en' = q === 'pl' || q === 'en' ? q : navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
document.documentElement.lang = lang;

const EN: Record<string, string> = {
  // goal and hearts cards
  'Schronisko dla bajkowych stworków': 'Fairy-Tale Critter Shelter', 'Wylecz': 'Cure', 'Nakarm i połóż spać': 'Feed & tuck in',
  '4 serduszka': '4 hearts', 'Nowy dom': 'New home', 'Serduszka': 'Hearts', 'Adopcja': 'Adoption', 'Nowe tereny': 'New lands',
  'Nowy pacjent': 'New patient', 'Nowe lekarstwo!': 'New medicine!',
  'Halloween w schronisku!': 'Halloween at the shelter!', 'Nowa strona albumu': 'New album page', 'Kapelusz w szafie': 'Hat in the wardrobe',
  // species (album cards, new patient cards)
  'Chmurnik': 'Cloudlet', 'Feniks': 'Phoenix', 'Smok': 'Dragon', 'Gryf': 'Griffin', 'Grzybołak': 'Shroomy', 'Kraken': 'Kraken',
  'Jednorożec': 'Unicorn', 'Bazyliszek': 'Basilisk', 'Żabi książę': 'Frog Prince', 'Nessie': 'Nessie', 'Świetlik': 'Glowbug',
  'Wodnik': 'Drippy', 'Leszy': 'Leshy', 'Wilkołaczek': 'Wolfling', 'Skrzat': 'Gnomelet', 'Sówka': 'Owlet', 'Yeti': 'Yeti',
  'Renifer': 'Reindeer', 'Bałwanek': 'Snowbuddy', 'Pingwinek': 'Pengy', 'Krabik': 'Crabby', 'Foczka': 'Seal Pup', 'Żółwik': 'Shelly',
  'Syrenka': 'Mermaid', 'Nietoperek': 'Batling', 'Kret': 'Moley', 'Żuczek': 'Bugsy', 'Golemik': 'Rocky',
  'Dyniak': 'Pumpkid', 'Duszek': 'Boo',
  // ailments
  'Sypie śniegiem': 'Snows everywhere', 'Zgasł mu płomień': 'Flame went out', 'Kicha iskrami': 'Sneezes sparks',
  'Gubi pióra': 'Losing feathers', 'Pyli zarodnikami': 'Puffs spores', 'Czka bańkami': 'Hiccups bubbles',
  'Kicha konfetti': 'Sneezes confetti', 'Kicha, aż spada korona': 'Sneezes its crown off', 'Tryska wodą': 'Squirts water',
  'Cieknie mu z kapelusza': 'Leaky hat', 'Gaśnie mu światełko': 'Light is fading', 'Kamienieje': 'Turning to stone',
  'Gubi liście': 'Losing leaves', 'Wyje do księżyca': 'Howls at the moon', 'Kurczy się': 'Shrinking',
  'Kręci mu się w głowie': 'Feels dizzy', 'Czka śnieżkami': 'Hiccups snowballs', 'Miga mu nos': 'Blinking nose',
  'Topnieje': 'Melting', 'Kręci się w kółko': 'Spins in circles', 'Szczypie się w nos': 'Pinches its own nose',
  'Kicha piaskiem': 'Sneezes sand', 'Chowa się w skorupę': 'Hides in its shell', 'Plącze się w wodorostach': 'Tangled in seaweed',
  'Kicha pestkami': 'Sneezes seeds', 'Znika co chwilę': 'Keeps vanishing', 'Czka echem': 'Hiccups echoes',
  'Zakopuje się w ziemi': 'Keeps digging in', 'Mieni się kolorami': 'Flashes all colours', 'Sypie się kamyczkami': 'Sheds pebbles',
  // medicines
  'Eliksir z kociołka': 'Cauldron potion', 'Woda ze źródełka': 'Spring water', 'Zioła': 'Herbs', 'Nektar z lilii': 'Lily nectar',
  'Złoty miód': 'Golden honey', 'Kakao z ogniska': 'Campfire cocoa', 'Perła z muszli': 'Seashell pearl',
  'Kryształ z groty': 'Cave crystal', 'Jagody': 'Berries',
  // request of the day
  'Dziś': 'Today',
  // boosters and the offline chest
  'Pomoc dla schroniska': 'Help the shelter', '🎬 Obejrzyj': '🎬 Watch', 'Monety ×2 przez 3 minuty': 'Coins ×2 for 3 minutes',
  'Ochotnik ściele łóżka i karmi przez 3 minuty': 'A helper makes beds and feeds for 3 min', 'Nie, dziękuję': 'No, thanks',
  'Skrzynka z monetami': 'Coin chest', 'Odbierz': 'Collect',
  // save backup
  'Kopia zapisu': 'Save backup', 'Kopiuj': 'Copy', 'Wklej kod kopii': 'Paste a backup code', 'Wczytaj': 'Load',
  'Skopiowano': 'Copied', 'Zaznacz i skopiuj': 'Select and copy', 'To nie jest cały kod kopii': 'That is not a whole backup code',
  'Na pewno? Obecny postęp zniknie': 'Sure? Your current progress will be lost',
};

/** the Polish text, or its English one in the English game (unknown texts stay as they are) */
export const t = (pl: string) => (lang === 'pl' ? pl : EN[pl] ?? pl);
