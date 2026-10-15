# Fable Shelter – prompty do grafik

Wszystkie prompty w jednym miejscu. Model: Z-Image Turbo (bez LoRA), 8 kroków.
Kolejność dla każdej postaci: **przód** (Z-Image Turbo) → **tył** i **bok** (edycja obrazu z przodem jako referencją) → 3D (Hunyuan 3.0 z trzema widokami albo Pixal3D z przodem, DecimateMesh 25000).

## Stały styl (ostatni akapit każdego promptu przodu)

```
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, big round glossy eyes, cozy storybook mood, single character, full body, front view, facing the camera, symmetrical pose, standing, centered, plain light grey background, soft even studio lighting, game asset, no effects, no props
```

## Tył i bok (edycja obrazu, referencja = wybrany przód)

Tył:
```
the same character seen from directly behind, back view, same proportions, same colors and materials, same lighting, plain light grey background, full body
```

Bok:
```
the same character seen from the left side, side view profile, same proportions, same colors and materials, same lighting, plain light grey background, full body
```

---

## Teren 2: Staw pod wierzbami

### Żabi książę (`zabiksiaze`)
Choroba w grze: kicha złotymi iskierkami i na moment rośnie mu korona.
```
cute baby frog prince creature, bright leaf green fur, pale yellow belly, tiny golden crown tilted on its head, wide happy mouth, little pink cheeks, chubby round body, short legs, standing straight, arms at sides,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, big round glossy eyes, cozy storybook mood, single character, full body, front view, facing the camera, symmetrical pose, standing, centered, plain light grey background, soft even studio lighting, game asset, no effects, no props
```

### Mała Nessie (`nessie`)
Choroba w grze: czkawka fontanną wody.
```
cute baby loch ness monster creature, soft teal fur, light aqua belly, long gentle neck curving up, small round head with two tiny nubs, four little flippers, short tail, chubby body, sweet smile, standing straight,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, big round glossy eyes, cozy storybook mood, single character, full body, front view, facing the camera, symmetrical pose, standing, centered, plain light grey background, soft even studio lighting, game asset, no effects, no props
```

### Wodnik (`wodnik`)
Choroba w grze: ciągle cieknie mu z kapelusza.
```
cute little water sprite creature, pale blue fur, wide brimmed hat made of a big green lily pad, tiny webbed hands, droplet shaped tuft of hair under the hat, round chubby body, curious happy face, standing straight, arms at sides,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, big round glossy eyes, cozy storybook mood, single character, full body, front view, facing the camera, symmetrical pose, standing, centered, plain light grey background, soft even studio lighting, game asset, no effects, no props
```

### Świetlik (`swietlik`)
Choroba w grze: jego światełko migocze jak zepsuta żarówka.
```
cute baby firefly creature, soft lavender fur, round glowing pale yellow belly like a lantern, two small translucent wings on its back, two curly antennae with little balls, chubby round body, sleepy happy face, standing straight, arms at sides,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, big round glossy eyes, cozy storybook mood, single character, full body, front view, facing the camera, symmetrical pose, standing, centered, plain light grey background, soft even studio lighting, game asset, no effects, no props
```

### Rekwizyty stawu
Dla rekwizytów zamień ostatnie zdanie stylu na: `single object, three quarter view from slightly above, centered, plain light grey background, soft even studio lighting, game asset, no characters`.

Kwiat lilii z nektarem (stacja z fioletowym lekarstwem):
```
a big magical water lily flower floating on a round lily pad, soft violet petals, glowing purple nectar in the middle with a few bubbles, chunky cute shapes,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, cozy storybook mood, single object, three quarter view from slightly above, centered, plain light grey background, soft even studio lighting, game asset, no characters
```

Legowisko na liściu lilii:
```
a round cozy bed made of a big green lily pad with soft raised edges and a small white pillow, chunky cute shapes,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, cozy storybook mood, single object, three quarter view from slightly above, centered, plain light grey background, soft even studio lighting, game asset, no characters
```

Drewniany mostek:
```
a small arched wooden footbridge with rope railings, chunky rounded planks, cute storybook shapes,
stylized 3D render, plush toy look, soft fuzzy fabric texture, pastel colors, cozy storybook mood, single object, three quarter view from slightly above, centered, plain light grey background, soft even studio lighting, game asset, no characters
```

---

## Teren 3: Wrzosowa polana (na wschód od obozu, za żywopłotem)
Modele zrobione 15.10.2026 przez Claude'a (Z-Image, potem Pixal3D, sam przód). Futrzaste kształty (leszy, sówka) wychodziły w Pixal3D jako „zgnieciona folia”, a pomogło `241.resolution=512` i `186.target_face_count=40000`.

### Leszy (`leszy`)
Choroba w grze: gubi liście jak drzewo jesienią.
```
cute little forest spirit creature, soft moss green fur with a few tiny leaves and two small mushrooms on its head, short twig antlers, round chubby body, gentle happy smile, standing straight, arms at sides,
```

### Wilkołaczek (`wilkolaczek`)
Choroba w grze: wyje do księżyca w środku dnia (nutki).
```
cute baby werewolf pup creature, soft silver grey fur, big fluffy pointed ears, two tiny fangs in a happy grin, fluffy tail, round chubby body, standing straight on two feet, arms at sides,
```

### Skrzat (`skrzat`)
Choroba w grze: kurczy się do połowy i wraca z piskiem.
```
cute tiny forest gnome creature, round chubby body with soft beige fur, big pointy red hat with white dots, short fluffy white beard, rosy round nose, cheerful face, standing straight, arms at sides,
```

### Sówka (`sowka`)
Choroba w grze: zawroty głowy, nad głową krążą gwiazdki.
```
cute baby owl creature, soft caramel brown fluffy feathers, cream colored belly, tiny ear tufts, small round wings at both sides, round chubby body, wise happy face, standing straight on two little feet,
```
Do każdego dopisz akapit stylu z góry pliku.

---

## Teren 4: Śnieżne wzgórze (na południowy zachód od obozu, za zaspą)
Modele zrobione 16.10.2026 w nocy (Z-Image Turbo, potem Pixal3D z samego przodu): yeti z `241.resolution=512` i 40000 trójkątów (futro), reszta 25000. Powieki z `ymax` 250–300, bo bez tego łapało kopytka albo guziki.

### Yeti-maluch (`yeti`)
Choroba w grze: czka śnieżkami. Lekarstwo: gorące kakao.
```
cute baby yeti creature, very fluffy snow white fur with a light blue tint, pale blue face and belly, two tiny rounded horns, big flat feet, round chubby body, happy toothy smile, standing straight, arms at sides,
```

### Renifer (`renifer`)
Choroba w grze: nos miga na czerwono jak lampka ostrzegawcza. Lekarstwo: gorące kakao.
```
cute baby reindeer creature, soft caramel brown fur, cream belly and muzzle, small velvet antlers, big round red nose, a tiny knitted red scarf, round chubby body, cheerful face, standing straight on two feet, arms at sides,
```

### Bałwanek (`balwanek`)
Choroba w grze: topnieje, kapie z niego i się kurczy. Lekarstwo: zimna woda ze źródełka (niebieska).
```
cute little snowman creature made of two soft round snowballs, plush white fabric, small carrot nose, coal button eyes, a red knitted beanie with a pompom, twig arms, round chubby body, happy smile, standing straight,
```

### Pingwinek (`pingwinek`)
Choroba w grze: ślizga się i kręci w kółko. Lekarstwo: gorące kakao.
```
cute baby penguin creature, soft fluffy dark blue grey down, white belly, small orange beak and orange feet, tiny flippers at its sides, a small yellow knitted scarf, round chubby body, happy face, standing straight,
```
Do każdego dopisz akapit stylu z góry pliku.

### Rekwizyty Śnieżnego wzgórza
- Ognisko z kakao (stacja): `a small campfire in a ring of round stones with a little iron pot of hot cocoa hanging from a wooden tripod, steam rising, chunky cute shapes,` + styl rekwizytów
- Legowisko z koca: `a round cozy pet bed made of a red knitted wool blanket with a soft cream cushion and a white pompom, chunky cute shapes,` + styl rekwizytów
- Duże ognisko: `a big cozy bonfire with stacked logs in a ring of snowy stones, bright warm flames, chunky cute shapes, simple solid shapes,` + styl rekwizytów (zrobione 16.10.2026 w FLUX 3 Klein, plik `DuzeOgnisko-flux3_00002_WYBRANY.png`; w Pixal3D wyszło czysto za pierwszym razem)

---

## Osoby adoptujące i domek schroniska (zrobione 15.10.2026)
Pliki: `D:\ComfyUI-Shared\output\FS\ludzie` i `...\rekwizyty\Domek-*`. Pixal3D z 40000 trójkątów. Osoby obrabiane jak stworki (tekstury 1024, oczy z `ymin`), domek jak rekwizyt.
- Dziewczynka: `cute little girl character, two short pigtails, yellow raincoat, red rubber boots, big happy smile, standing straight, arms at sides,` + styl postaci
- Chłopiec: `cute little boy character, messy brown hair, green striped sweater, blue shorts, sneakers, cheerful face, standing straight, arms at sides,` + styl postaci
- Babcia: `cute chubby grandma character, grey hair in a bun, round glasses, lilac knitted cardigan, long skirt, warm smile, standing straight, arms at sides,` + styl postaci
- Dziadek: `cute chubby grandpa character, white mustache, flat cap, brown vest over a white shirt, warm smile, standing straight, arms at sides,` + styl postaci
- Domek: `a cozy magical animal shelter cottage built into a giant round tree stump, mossy roof with a few little mushrooms, round wooden front door with a pink heart sign above it, warm glowing round windows, a small lantern by the door, chunky cute shapes,` + styl rekwizytów

## Rekwizyty z modeli 3D (zrobione 15.10.2026)
Pliki: `D:\ComfyUI-Shared\output\FS\rekwizyty`. Pixal3D z `241.resolution=512` i 12000 trójkątów. Potem `TEX=512 optimize.sh … pixal` i `tools/models/upright.mjs`, który prostuje przechył z ujęcia z góry. Jeśli automat się pomyli, kąt podaje się ręcznie, np. kociołek `-28 0`. W grze `PROP_MODEL` w `game.ts`, a dopóki model się nie wczyta, widać prosty kształt.
- Krzak jagód (drugie podejście, pierwsze dało kulę malin bez liści): `a small round leafy green bush with lots of shiny red berries growing between the leaves, chunky cute shapes,` + styl rekwizytów
- Ul: `a cute straw beehive skep sitting on a short tree stump, a little round entrance with golden honey dripping, chunky cute shapes,` + styl rekwizytów
- Legowisko z mchu: `a round cozy bed made of soft green moss with a few purple heather sprigs and a small white pillow, chunky cute shapes,` + styl rekwizytów
- Trzecie podejście (16.10.2026, udane): zamiast liści i mchu proste, gładkie bryły, wtedy Pixal3D nie robi zgniecionej folii. 12000 trójkątów, `241.resolution=512`.
  - Krzak: `a small chubby round shrub made of a few big smooth rounded leaf clumps like soft green pillows, with big shiny red berries sitting on top, simple solid shapes, chunky cute shapes,` + styl rekwizytów
  - Mech: `a round cozy pet bed shaped like a thick smooth green felt donut with a soft rounded rim, a small white pillow in the middle, two tiny purple flowers on the rim, simple solid shapes, chunky cute shapes,` + styl rekwizytów
- Kociołek, źródełko, zioła, legowisko, kosz, lilia i legowisko z liścia: prompty poniżej i w sekcji stawu.

## Rekwizyty obozu

Kociołek: `a round chubby iron cauldron on three short legs, bubbling pink potion inside, chunky cute shapes,` + styl rekwizytów
Źródełko: `a small stone spring with a ring of round pebbles, clear blue water pool and a little stone spout, chunky cute shapes,` + styl rekwizytów
Grządka ziół: `a wooden planter box full of fresh green herb sprouts, chunky cute shapes,` + styl rekwizytów
Krzak jagód: `a round bush full of shiny red berries, chunky cute shapes,` + styl rekwizytów
Legowisko: `a round plush pet bed in soft lilac with a small white pillow, chunky cute shapes,` + styl rekwizytów
Kosz: `a woven wicker basket with a round rim, chunky cute shapes,` + styl rekwizytów

## FLUX 3 Image Klein a Z-Image Turbo (porównanie 16.10.2026)
Te same prompty, po 3 obrazy na postać: yeti, renifer, bałwanek, pingwinek, krzak, legowisko z mchu. Arkusz: `D:\ComfyUI-Shared\output\FS\porownanie\porownanie_zimage_vs_flux3.jpg`. FLUX 3 Klein w wersji distilled (int8, 15 kroków, bez „upsamplera” promptu), workflow w ComfyUI: `image_flux3_klein_distilled-tworzenie obrazów (szybki, 15 kroków)`.
- Czas: podobny, ok. 40 s za 3 obrazy 1024×1024 na RTX 4060 (z wczytaniem modelu).
- FLUX 3 dokładniej trzyma się promptu (małe różki yeti, uśmiech z zębami, żółty szalik z warkoczem) i daje wyraźną fakturę filcu, jak prawdziwa maskotka. Rekwizyty wychodzą gładkie i proste, co dobrze pasuje do Pixal3D.
- Z-Image ma bardziej puchate futro, rumieńce i miękkie światło, czyli ten sam styl co 20 gatunków, które już są w grze. Tło jest jaśniejsze i bardziej szare.
- Wniosek: stworki dalej w Z-Image, żeby nowe pasowały do starych. FLUX 3 warto brać do rekwizytów i do edycji obrazu (tył i bok z referencji), bo ma też tryb edycji.

## Nazwy plików
Zapisuj wybrane do `D:\ComfyUI-Shared\output\FS` jak dotąd, np. `Nessie-image-turbo_00003.png`, `nessie_tył_00001.png`, `nessie_lewy_00001.png`, a modele `nessie.glb`. Resztę przejrzę, wybiorę i oznaczę `WYBRANY`.
