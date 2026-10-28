/**
 * Player-facing words in twelve languages. The Polish text stays in the code where it is used and is the key here;
 * t() gives the translation for the language the game runs in. The language: ?lang=xx for tests, then on Poki the
 * portal's own language (PokiSDK.getLanguage(), see setLanguage in platform.ts), then the browser's; anything not
 * listed falls back to English. Poki's order of languages worth having: English, French, Italian, German, Spanish,
 * Turkish, then Brazilian Portuguese and Russian, then Chinese (simplified), Japanese, Korean
 * (developers.poki.com/guide/localization). Translations are Claude's own, not checked by native speakers.
 * A new label: write it in Polish, wrap it in t() and add a row below with all eleven translations.
 * Creature names stay short (about 11 letters at most): album cards cut longer ones.
 */

export type Lang = 'pl' | 'en' | 'fr' | 'it' | 'de' | 'es' | 'tr' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko';
const LANGS: Lang[] = ['pl', 'en', 'fr', 'it', 'de', 'es', 'tr', 'pt', 'ru', 'zh', 'ja', 'ko'];
/** columns of the table below, in this order */
const COLS: Exclude<Lang, 'pl'>[] = ['en', 'fr', 'it', 'de', 'es', 'tr', 'pt', 'ru', 'zh', 'ja', 'ko'];

const pick = (code: string | null | undefined): Lang | null => {
  const c = (code ?? '').toLowerCase().slice(0, 2);
  return LANGS.includes(c as Lang) ? (c as Lang) : null;
};
const forced = pick(new URLSearchParams(location.search).get('lang'));
export let lang: Lang = forced ?? pick(navigator.language) ?? 'en';
document.documentElement.lang = lang;

/** the portal's language (Poki), unless ?lang forces one; call before the game builds its cards and menus */
export function setLanguage(code: string | null | undefined) {
  if (forced) return;
  lang = pick(code) ?? 'en';
  document.documentElement.lang = lang;
}

type Row = [en: string, fr: string, it: string, de: string, es: string, tr: string, pt: string, ru: string, zh: string, ja: string, ko: string];
const T: Record<string, Row> = {
  // goal and hearts cards
  'Schronisko dla bajkowych stworków': ['Fairy-Tale Critter Shelter', 'Refuge des créatures féeriques', 'Rifugio delle creature fatate', 'Fabelwesen-Tierheim', 'Refugio de criaturas mágicas', 'Masal Yaratıkları Barınağı', 'Abrigo das Criaturas Mágicas', 'Приют сказочных зверушек', '童话小动物收容所', 'おとぎの生きもの保護施設', '동화 동물 보호소'],
  'Wylecz': ['Cure', 'Soigne', 'Cura', 'Heile', 'Cura', 'İyileştir', 'Cure', 'Вылечи', '治疗', 'なおす', '치료'],
  'Nakarm i połóż spać': ['Feed & tuck in', 'Nourris et couche', 'Nutri e metti a letto', 'Füttern & ins Bett', 'Alimenta y acuesta', 'Besle ve yatır', 'Alimente e ponha para dormir', 'Накорми и уложи', '喂食并哄睡', 'ごはんとおやすみ', '밥 주고 재우기'],
  '4 serduszka': ['4 hearts', '4 cœurs', '4 cuori', '4 Herzen', '4 corazones', '4 kalp', '4 corações', '4 сердечка', '4颗爱心', 'ハート4つ', '하트 4개'],
  'Nowy dom': ['New home', 'Nouveau foyer', 'Nuova casa', 'Neues Zuhause', 'Nuevo hogar', 'Yeni yuva', 'Novo lar', 'Новый дом', '新家', '新しいおうち', '새 집'],
  'Serduszka': ['Hearts', 'Cœurs', 'Cuori', 'Herzen', 'Corazones', 'Kalpler', 'Corações', 'Сердечки', '爱心', 'ハート', '하트'],
  'Adopcja': ['Adoption', 'Adoption', 'Adozione', 'Adoption', 'Adopción', 'Sahiplenme', 'Adoção', 'Усыновление', '领养', '里親', '입양'],
  'Nowe tereny': ['New lands', 'Nouvelles terres', 'Nuove terre', 'Neue Gebiete', 'Nuevas tierras', 'Yeni bölgeler', 'Novas terras', 'Новые земли', '新区域', '新しいエリア', '새 지역'],
  'Nowy pacjent': ['New patient', 'Nouveau patient', 'Nuovo paziente', 'Neuer Patient', 'Nuevo paciente', 'Yeni hasta', 'Novo paciente', 'Новый пациент', '新病人', '新しい患者', '새 환자'],
  'Nowe lekarstwo!': ['New medicine!', 'Nouveau remède !', 'Nuova medicina!', 'Neue Medizin!', '¡Nueva medicina!', 'Yeni ilaç!', 'Novo remédio!', 'Новое лекарство!', '新药！', '新しい薬！', '새 약!'],
  'Halloween w schronisku!': ['Halloween at the shelter!', 'Halloween au refuge !', 'Halloween al rifugio!', 'Halloween im Tierheim!', '¡Halloween en el refugio!', 'Barınakta Cadılar Bayramı!', 'Halloween no abrigo!', 'Хэллоуин в приюте!', '收容所的万圣节！', '保護施設でハロウィン！', '보호소의 핼러윈!'],
  'Nowa strona albumu': ['New album page', "Nouvelle page d'album", "Nuova pagina dell'album", 'Neue Albumseite', 'Nueva página del álbum', 'Yeni albüm sayfası', 'Nova página do álbum', 'Новая страница альбома', '新的相册页', 'アルバムに新ページ', '새 앨범 페이지'],
  'Kapelusz w szafie': ['Hat in the wardrobe', "Chapeau dans l'armoire", "Cappello nell'armadio", 'Hut im Schrank', 'Sombrero en el armario', 'Dolapta şapka', 'Chapéu no armário', 'Шляпа в шкафу', '衣柜里的帽子', 'クローゼットに帽子', '옷장 속 모자'],
  // species (album cards, new patient cards)
  'Chmurnik': ['Cloudlet', 'Nuageon', 'Nuvoletto', 'Wölkchen', 'Nubecín', 'Bulutçuk', 'Nuvinho', 'Тучка', '云宝', 'くもっち', '구름이'],
  'Feniks': ['Phoenix', 'Phénix', 'Fenice', 'Phönix', 'Fénix', 'Anka', 'Fênix', 'Феникс', '凤凰', 'フェニックス', '불사조'],
  'Smok': ['Dragon', 'Dragon', 'Drago', 'Drache', 'Dragón', 'Ejder', 'Dragão', 'Дракон', '小龙', 'ドラゴン', '드래곤'],
  'Gryf': ['Griffin', 'Griffon', 'Grifone', 'Greif', 'Grifo', 'Grifon', 'Grifo', 'Грифон', '狮鹫', 'グリフォン', '그리폰'],
  'Grzybołak': ['Shroomy', 'Champi', 'Funghetto', 'Pilzi', 'Champi', 'Mantarcık', 'Cogumelo', 'Грибок', '蘑菇仔', 'キノコっこ', '버섯이'],
  'Kraken': ['Kraken', 'Kraken', 'Kraken', 'Kraken', 'Kraken', 'Kraken', 'Kraken', 'Кракен', '海怪', 'クラーケン', '크라켄'],
  'Jednorożec': ['Unicorn', 'Licorne', 'Unicorno', 'Einhorn', 'Unicornio', 'Tekboynuz', 'Unicórnio', 'Единорог', '独角兽', 'ユニコーン', '유니콘'],
  'Bazyliszek': ['Basilisk', 'Basilic', 'Basilisco', 'Basilisk', 'Basilisco', 'Basilisk', 'Basilisco', 'Василиск', '蛇怪', 'バジリスク', '바실리스크'],
  'Żabi książę': ['Frog Prince', 'Grenouille', 'Ranocchio', 'Froschprinz', 'Sapo Rey', 'Kurbağa', 'Sapo Rei', 'Лягушонок', '青蛙王子', 'カエル王子', '개구리 왕자'],
  'Nessie': ['Nessie', 'Nessie', 'Nessie', 'Nessie', 'Nessie', 'Nessie', 'Nessie', 'Несси', '尼斯湖怪', 'ネッシー', '네시'],
  'Świetlik': ['Glowbug', 'Luciole', 'Lucciola', 'Glühwurm', 'Luciérnaga', 'Ateşböcek', 'Vagalume', 'Светлячок', '萤火虫', 'ホタル', '반딧불이'],
  'Wodnik': ['Drippy', 'Gouttin', 'Gocciolo', 'Tropfi', 'Goterín', 'Damlacık', 'Gotinha', 'Капелька', '水滴仔', 'しずくん', '물방울이'],
  'Leszy': ['Leshy', 'Léchy', 'Leshy', 'Leschi', 'Leshy', 'Leşi', 'Leshy', 'Леший', '森林精', 'レーシー', '레시'],
  'Wilkołaczek': ['Wolfling', 'Louveteau', 'Lupetto', 'Wölfchen', 'Lobito', 'Kurtçuk', 'Lobinho', 'Волчонок', '小狼人', 'オオカミっこ', '늑대아이'],
  'Skrzat': ['Gnomelet', 'Lutin', 'Folletto', 'Wichtel', 'Duende', 'Cüce', 'Duende', 'Гномик', '小精灵', 'こびと', '꼬마요정'],
  'Sówka': ['Owlet', 'Chouette', 'Gufetto', 'Eulchen', 'Buhito', 'Baykuşçuk', 'Corujinha', 'Совёнок', '小猫头鹰', 'フクロウ', '부엉이'],
  'Yeti': ['Yeti', 'Yéti', 'Yeti', 'Yeti', 'Yeti', 'Yeti', 'Yeti', 'Йети', '雪人怪', 'イエティ', '예티'],
  'Renifer': ['Reindeer', 'Renne', 'Renna', 'Rentier', 'Reno', 'Rengeyik', 'Rena', 'Олень', '驯鹿', 'トナカイ', '순록'],
  'Bałwanek': ['Snowbuddy', 'Bonhomme', 'Pupazzo', 'Schneemann', 'Muñeco', 'Kardanadam', 'Boneco', 'Снеговик', '雪人', 'ゆきだるま', '눈사람'],
  'Pingwinek': ['Pengy', 'Pingouin', 'Pinguino', 'Pingu', 'Pingüino', 'Penguen', 'Pinguim', 'Пингвинёнок', '小企鹅', 'ペンギン', '펭귄'],
  'Krabik': ['Crabby', 'Crabou', 'Granchio', 'Krabbi', 'Cangrejo', 'Yengeç', 'Caranguejo', 'Крабик', '小螃蟹', 'カニっこ', '꽃게'],
  'Foczka': ['Seal Pup', 'Phoquette', 'Fochetta', 'Robbe', 'Foquita', 'Fokçuk', 'Foquinha', 'Тюленёнок', '小海豹', 'アザラシ', '물범'],
  'Żółwik': ['Shelly', 'Tortue', 'Tartaruga', 'Schildi', 'Tortuga', 'Tosbağa', 'Tartaruga', 'Черепашка', '小海龟', 'カメっこ', '거북이'],
  'Syrenka': ['Mermaid', 'Sirène', 'Sirenetta', 'Nixe', 'Sirenita', 'Denizkızı', 'Sereia', 'Русалочка', '小美人鱼', '人魚', '인어'],
  'Nietoperek': ['Batling', 'Chauvette', 'Pipistrello', 'Fledermaus', 'Murciélago', 'Yarasa', 'Morcego', 'Летучка', '小蝙蝠', 'コウモリ', '박쥐'],
  'Kret': ['Moley', 'Taupi', 'Talpino', 'Maulwurf', 'Topito', 'Köstebek', 'Toupeira', 'Кротик', '小鼹鼠', 'モグラ', '두더지'],
  'Żuczek': ['Bugsy', 'Scarabée', 'Scarabeo', 'Käferchen', 'Escarabajo', 'Böcek', 'Besourinho', 'Жучок', '小甲虫', 'カブトっこ', '딱정벌레'],
  'Golemik': ['Rocky', 'Caillou', 'Sassolino', 'Steini', 'Piedrito', 'Taşçık', 'Pedrinho', 'Камушек', '石头仔', 'いしころ', '돌멩이'],
  'Dyniak': ['Pumpkid', 'Potiron', 'Zucchina', 'Kürbsi', 'Calabaza', 'Balkabak', 'Abóbora', 'Тыковка', '南瓜仔', 'カボチャ', '호박이'],
  'Duszek': ['Boo', 'Bouh', 'Fantasmino', 'Geisti', 'Fantasmita', 'Hayalet', 'Fantasma', 'Призрак', '小幽灵', 'おばけ', '유령'],
  // ailments
  'Sypie śniegiem': ['Snows everywhere', 'Neige partout', 'Nevica ovunque', 'Schneit überall', 'Nieva sin parar', 'Her yere kar yağdırıyor', 'Neva sem parar', 'Сыплет снегом', '到处下雪', '雪を降らせる', '눈을 뿌려요'],
  'Zgasł mu płomień': ['Flame went out', "Sa flamme s'est éteinte", 'La fiamma si è spenta', 'Flamme erloschen', 'Se le apagó la llama', 'Alevi söndü', 'A chama apagou', 'Погасло пламя', '火焰熄灭了', '炎が消えた', '불꽃이 꺼졌어요'],
  'Kicha iskrami': ['Sneezes sparks', 'Éternue des étincelles', 'Starnutisce scintille', 'Niest Funken', 'Estornuda chispas', 'Kıvılcım hapşırıyor', 'Espirra faíscas', 'Чихает искрами', '打喷嚏冒火花', '火花のくしゃみ', '불꽃 재채기'],
  'Gubi pióra': ['Losing feathers', 'Perd ses plumes', 'Perde le piume', 'Verliert Federn', 'Pierde plumas', 'Tüy döküyor', 'Perdendo penas', 'Теряет перья', '掉羽毛', '羽が抜ける', '깃털이 빠져요'],
  'Pyli zarodnikami': ['Puffs spores', 'Crache des spores', 'Sparge spore', 'Pustet Sporen', 'Suelta esporas', 'Spor saçıyor', 'Solta esporos', 'Пылит спорами', '喷孢子', '胞子をまく', '포자를 뿜어요'],
  'Czka bańkami': ['Hiccups bubbles', 'Hoquette des bulles', 'Singhiozza bolle', 'Hickst Blasen', 'Hipa burbujas', 'Baloncuk hıçkırıyor', 'Soluça bolhas', 'Икает пузырями', '打嗝冒泡泡', 'しゃっくりで泡', '거품 딸꾹질'],
  'Kicha konfetti': ['Sneezes confetti', 'Éternue des confettis', 'Starnutisce coriandoli', 'Niest Konfetti', 'Estornuda confeti', 'Konfeti hapşırıyor', 'Espirra confete', 'Чихает конфетти', '打喷嚏喷彩纸', '紙ふぶきのくしゃみ', '색종이 재채기'],
  'Kicha, aż spada korona': ['Sneezes its crown off', 'Éternue sa couronne', 'Starnutisce via la corona', 'Niest die Krone weg', 'Estornuda y pierde la corona', 'Hapşırınca tacı düşüyor', 'Espirra e a coroa cai', 'Чихает так, что падает корона', '喷嚏打掉了王冠', 'くしゃみで王冠が落ちる', '재채기에 왕관이 떨어져요'],
  'Tryska wodą': ['Squirts water', "Crache de l'eau", 'Spruzza acqua', 'Spritzt Wasser', 'Echa chorros de agua', 'Su fışkırtıyor', 'Esguicha água', 'Брызгает водой', '喷水', '水をふき出す', '물을 뿜어요'],
  'Cieknie mu z kapelusza': ['Leaky hat', 'Chapeau qui fuit', 'Cappello che gocciola', 'Undichter Hut', 'Sombrero con goteras', 'Şapkası sızdırıyor', 'Chapéu vazando', 'Течёт из шляпы', '帽子漏水', '帽子から水もれ', '모자에서 물이 새요'],
  'Gaśnie mu światełko': ['Light is fading', 'Sa lumière faiblit', 'La luce si spegne', 'Licht wird schwach', 'Su luz se apaga', 'Işığı sönüyor', 'A luz está apagando', 'Гаснет огонёк', '光快灭了', '光が消えそう', '불빛이 꺼져가요'],
  'Kamienieje': ['Turning to stone', 'Se change en pierre', 'Diventa di pietra', 'Wird zu Stein', 'Se vuelve piedra', 'Taşa dönüşüyor', 'Virando pedra', 'Каменеет', '变成石头', '石になっちゃう', '돌이 되어가요'],
  'Gubi liście': ['Losing leaves', 'Perd ses feuilles', 'Perde le foglie', 'Verliert Blätter', 'Pierde hojas', 'Yaprak döküyor', 'Perdendo folhas', 'Теряет листья', '掉叶子', '葉っぱが落ちる', '잎이 떨어져요'],
  'Wyje do księżyca': ['Howls at the moon', 'Hurle à la lune', 'Ulula alla luna', 'Heult den Mond an', 'Aúlla a la luna', 'Aya uluyor', 'Uiva para a lua', 'Воет на луну', '对着月亮嚎叫', '月に遠吠え', '달을 보고 울어요'],
  'Kurczy się': ['Shrinking', 'Rapetisse', 'Si rimpicciolisce', 'Schrumpft', 'Se encoge', 'Küçülüyor', 'Encolhendo', 'Уменьшается', '在缩小', '小さくなる', '작아져요'],
  'Kręci mu się w głowie': ['Feels dizzy', 'A la tête qui tourne', 'Ha le vertigini', 'Ist schwindlig', 'Está mareado', 'Başı dönüyor', 'Está tonto', 'Кружится голова', '头晕', '目がまわる', '어지러워요'],
  'Czka śnieżkami': ['Hiccups snowballs', 'Hoquette des boules de neige', 'Singhiozza palle di neve', 'Hickst Schneebälle', 'Hipa bolas de nieve', 'Kartopu hıçkırıyor', 'Soluça bolas de neve', 'Икает снежками', '打嗝冒雪球', 'しゃっくりで雪玉', '눈덩이 딸꾹질'],
  'Miga mu nos': ['Blinking nose', 'Nez qui clignote', 'Naso lampeggiante', 'Blinkende Nase', 'Nariz parpadeante', 'Burnu yanıp sönüyor', 'Nariz piscando', 'Мигает нос', '鼻子一闪一闪', '鼻がチカチカ', '코가 깜빡여요'],
  'Topnieje': ['Melting', 'Fond', 'Si scioglie', 'Schmilzt', 'Se derrite', 'Eriyor', 'Derretendo', 'Тает', '在融化', 'とけちゃう', '녹고 있어요'],
  'Kręci się w kółko': ['Spins in circles', 'Tourne en rond', 'Gira in tondo', 'Dreht sich im Kreis', 'Da vueltas sin parar', 'Dönüp duruyor', 'Gira sem parar', 'Кружится на месте', '原地转圈', 'ぐるぐる回る', '빙글빙글 돌아요'],
  'Szczypie się w nos': ['Pinches its own nose', 'Se pince le nez', 'Si pizzica il naso', 'Zwickt sich in die Nase', 'Se pellizca la nariz', 'Kendi burnunu çimdikliyor', 'Belisca o próprio nariz', 'Щиплет себя за нос', '夹自己的鼻子', '自分の鼻をはさむ', '자기 코를 집어요'],
  'Kicha piaskiem': ['Sneezes sand', 'Éternue du sable', 'Starnutisce sabbia', 'Niest Sand', 'Estornuda arena', 'Kum hapşırıyor', 'Espirra areia', 'Чихает песком', '打喷嚏喷沙子', '砂のくしゃみ', '모래 재채기'],
  'Chowa się w skorupę': ['Hides in its shell', 'Se cache dans sa carapace', 'Si nasconde nel guscio', 'Versteckt sich im Panzer', 'Se esconde en su caparazón', 'Kabuğuna saklanıyor', 'Se esconde no casco', 'Прячется в панцирь', '躲进壳里', '甲羅にかくれる', '등껍질에 숨어요'],
  'Plącze się w wodorostach': ['Tangled in seaweed', 'Emmêlée dans les algues', 'Impigliata nelle alghe', 'In Seetang verheddert', 'Enredada en algas', 'Yosunlara dolanmış', 'Enroscada em algas', 'Запуталась в водорослях', '被海藻缠住', '海藻にからまる', '해초에 엉켰어요'],
  'Kicha pestkami': ['Sneezes seeds', 'Éternue des pépins', 'Starnutisce semi', 'Niest Kerne', 'Estornuda pepitas', 'Çekirdek hapşırıyor', 'Espirra sementes', 'Чихает семечками', '打喷嚏喷种子', 'タネのくしゃみ', '씨앗 재채기'],
  'Znika co chwilę': ['Keeps vanishing', 'Disparaît sans cesse', 'Continua a sparire', 'Verschwindet ständig', 'Desaparece a cada rato', 'Sürekli kayboluyor', 'Some toda hora', 'То и дело исчезает', '老是消失', 'すぐ消えちゃう', '자꾸 사라져요'],
  'Czka echem': ['Hiccups echoes', 'Hoquette en écho', 'Singhiozza a eco', 'Hickst Echos', 'Hipa con eco', 'Yankılı hıçkırıyor', 'Soluça eco', 'Икает эхом', '打嗝有回声', 'しゃっくりがこだま', '메아리 딸꾹질'],
  'Zakopuje się w ziemi': ['Keeps digging in', "S'enterre sans cesse", 'Continua a scavare', 'Gräbt sich ständig ein', 'Se entierra sin parar', 'Sürekli toprağa gömülüyor', 'Vive se enterrando', 'Закапывается в землю', '一直往土里钻', '土にもぐっちゃう', '땅속으로 숨어요'],
  'Mieni się kolorami': ['Flashes all colours', 'Change de couleur', 'Cambia colore', 'Schillert bunt', 'Cambia de color', 'Renkten renge giriyor', 'Muda de cor', 'Переливается цветами', '变来变去的颜色', '色がころころ変わる', '색이 바뀌어요'],
  'Sypie się kamyczkami': ['Sheds pebbles', 'Perd des cailloux', 'Perde sassolini', 'Bröselt Steinchen', 'Suelta piedritas', 'Çakıl döküyor', 'Solta pedrinhas', 'Сыплется камешками', '掉小石子', '小石がこぼれる', '자갈이 떨어져요'],
  // medicines
  'Eliksir z kociołka': ['Cauldron potion', 'Potion du chaudron', 'Pozione del calderone', 'Kesseltrank', 'Poción del caldero', 'Kazan iksiri', 'Poção do caldeirão', 'Зелье из котла', '坩埚药水', '大釜のくすり', '가마솥 물약'],
  'Woda ze źródełka': ['Spring water', 'Eau de source', 'Acqua di fonte', 'Quellwasser', 'Agua de manantial', 'Kaynak suyu', 'Água da fonte', 'Вода из родника', '泉水', '泉の水', '샘물'],
  'Zioła': ['Herbs', 'Herbes', 'Erbe', 'Kräuter', 'Hierbas', 'Şifalı otlar', 'Ervas', 'Травы', '草药', 'ハーブ', '약초'],
  'Nektar z lilii': ['Lily nectar', 'Nectar de lys', 'Nettare di giglio', 'Liliennektar', 'Néctar de lirio', 'Zambak nektarı', 'Néctar de lírio', 'Нектар лилии', '百合花蜜', 'ユリの蜜', '백합 꿀물'],
  'Złoty miód': ['Golden honey', 'Miel doré', 'Miele dorato', 'Goldhonig', 'Miel dorada', 'Altın bal', 'Mel dourado', 'Золотой мёд', '金色蜂蜜', '金色のハチミツ', '황금 꿀'],
  'Kakao z ogniska': ['Campfire cocoa', 'Cacao du feu de camp', 'Cacao del falò', 'Lagerfeuerkakao', 'Cacao de fogata', 'Kamp ateşi kakaosu', 'Chocolate da fogueira', 'Какао с костра', '篝火可可', 'たき火のココア', '모닥불 코코아'],
  'Perła z muszli': ['Seashell pearl', 'Perle de coquillage', 'Perla di conchiglia', 'Muschelperle', 'Perla de concha', 'Deniz kabuğu incisi', 'Pérola da concha', 'Жемчужина', '贝壳珍珠', '貝の真珠', '조개 진주'],
  'Kryształ z groty': ['Cave crystal', 'Cristal de grotte', 'Cristallo di grotta', 'Höhlenkristall', 'Cristal de cueva', 'Mağara kristali', 'Cristal da caverna', 'Кристалл из пещеры', '洞穴水晶', '洞くつの水晶', '동굴 수정'],
  'Jagody': ['Berries', 'Baies', 'Bacche', 'Beeren', 'Bayas', 'Meyveler', 'Frutinhas', 'Ягоды', '浆果', 'ベリー', '베리'],
  // request of the day
  'Dziś': ['Today', "Aujourd'hui", 'Oggi', 'Heute', 'Hoy', 'Bugün', 'Hoje', 'Сегодня', '今天', 'きょう', '오늘'],
  // boosters and the offline chest
  'Pomoc dla schroniska': ['Help the shelter', 'Aide au refuge', 'Aiuta il rifugio', 'Hilfe fürs Tierheim', 'Ayuda al refugio', 'Barınağa yardım', 'Ajude o abrigo', 'Помощь приюту', '帮助收容所', '保護施設を手伝う', '보호소 돕기'],
  '🎬 Obejrzyj': ['🎬 Watch', '🎬 Regarder', '🎬 Guarda', '🎬 Ansehen', '🎬 Ver', '🎬 İzle', '🎬 Assistir', '🎬 Смотреть', '🎬 观看', '🎬 見る', '🎬 보기'],
  'Monety ×2 przez 3 minuty': ['Coins ×2 for 3 minutes', 'Pièces ×2 pendant 3 minutes', 'Monete ×2 per 3 minuti', 'Münzen ×2 für 3 Minuten', 'Monedas ×2 durante 3 minutos', '3 dakika boyunca altın ×2', 'Moedas ×2 por 3 minutos', 'Монеты ×2 на 3 минуты', '金币×2，持续3分钟', 'コイン×2（3分間）', '3분 동안 코인 ×2'],
  'Ochotnik ściele łóżka i karmi przez 3 minuty': ['A helper makes beds and feeds for 3 min', 'Un bénévole fait les lits et nourrit pendant 3 min', 'Un aiutante rifà i letti e dà da mangiare per 3 min', 'Ein Helfer macht 3 Min. lang Betten und füttert', 'Un ayudante hace camas y alimenta durante 3 min', 'Bir gönüllü 3 dakika yatak yapar ve besler', 'Um ajudante arruma camas e alimenta por 3 min', 'Помощник 3 минуты стелет и кормит', '志愿者帮忙铺床喂食3分钟', 'ボランティアが3分間ベッドとごはん', '도우미가 3분 동안 잠자리와 밥을 챙겨요'],
  'Nie, dziękuję': ['No, thanks', 'Non merci', 'No, grazie', 'Nein, danke', 'No, gracias', 'Hayır, teşekkürler', 'Não, obrigado', 'Нет, спасибо', '不用了，谢谢', 'けっこうです', '괜찮아요'],
  'Skrzynka z monetami': ['Coin chest', 'Coffre de pièces', 'Forziere di monete', 'Münztruhe', 'Cofre de monedas', 'Altın sandığı', 'Baú de moedas', 'Сундук с монетами', '金币宝箱', 'コインの箱', '코인 상자'],
  'Odbierz': ['Collect', 'Récupérer', 'Raccogli', 'Abholen', 'Recoger', 'Topla', 'Coletar', 'Забрать', '领取', '受け取る', '받기'],
  // save backup
  'Kopia zapisu': ['Save backup', 'Sauvegarde', 'Copia di salvataggio', 'Spielstand-Kopie', 'Copia de guardado', 'Kayıt yedeği', 'Cópia do progresso', 'Копия сохранения', '存档备份', 'セーブのコピー', '저장 백업'],
  'Kopiuj': ['Copy', 'Copier', 'Copia', 'Kopieren', 'Copiar', 'Kopyala', 'Copiar', 'Копировать', '复制', 'コピー', '복사'],
  'Wklej kod kopii': ['Paste a backup code', 'Colle un code de sauvegarde', 'Incolla un codice di copia', 'Kopie-Code einfügen', 'Pega un código de copia', 'Yedek kodunu yapıştır', 'Cole um código de cópia', 'Вставь код копии', '粘贴备份代码', 'コードを貼りつけ', '백업 코드 붙여넣기'],
  'Wczytaj': ['Load', 'Charger', 'Carica', 'Laden', 'Cargar', 'Yükle', 'Carregar', 'Загрузить', '读取', '読みこむ', '불러오기'],
  'Skopiowano': ['Copied', 'Copié', 'Copiato', 'Kopiert', 'Copiado', 'Kopyalandı', 'Copiado', 'Скопировано', '已复制', 'コピーしました', '복사됨'],
  'Zaznacz i skopiuj': ['Select and copy', 'Sélectionne et copie', 'Seleziona e copia', 'Markieren und kopieren', 'Selecciona y copia', 'Seç ve kopyala', 'Selecione e copie', 'Выдели и скопируй', '选中并复制', '選んでコピー', '선택해서 복사'],
  'To nie jest cały kod kopii': ['That is not a whole backup code', "Ce code n'est pas complet", 'Il codice non è completo', 'Der Code ist nicht vollständig', 'El código no está completo', 'Bu kod eksik', 'O código está incompleto', 'Код неполный', '代码不完整', 'コードが不完全です', '코드가 완전하지 않아요'],
  'Na pewno? Obecny postęp zniknie': ['Sure? Your current progress will be lost', 'Sûr ? Ta partie actuelle sera perdue', 'Sicuro? I progressi attuali andranno persi', 'Sicher? Dein aktueller Fortschritt geht verloren', '¿Seguro? Perderás tu progreso actual', 'Emin misin? Mevcut ilerlemen silinecek', 'Tem certeza? Seu progresso atual será perdido', 'Точно? Текущий прогресс пропадёт', '确定吗？当前进度会丢失', '本当に？今の進みが消えます', '정말요? 지금 진행이 사라져요'],
};

/** the Polish text, or its translation in the game's language (unknown texts stay as they are) */
export const t = (pl: string) => (lang === 'pl' ? pl : T[pl]?.[COLS.indexOf(lang)] ?? pl);
