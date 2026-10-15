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

## Rekwizyty z modeli 3D (zrobione 15.10.2026)
Pliki: `D:\ComfyUI-Shared\output\FS\rekwizyty`. Pixal3D z `241.resolution=512` i 12000 trójkątów. Potem `TEX=512 optimize.sh … pixal` i `tools/models/upright.mjs`, który prostuje przechył z ujęcia z góry. Jeśli automat się pomyli, kąt podaje się ręcznie, np. kociołek `-28 0`. W grze `PROP_MODEL` w `game.ts`, a dopóki model się nie wczyta, widać prosty kształt.
- Krzak jagód (drugie podejście, pierwsze dało kulę malin bez liści): `a small round leafy green bush with lots of shiny red berries growing between the leaves, chunky cute shapes,` + styl rekwizytów
- Ul: `a cute straw beehive skep sitting on a short tree stump, a little round entrance with golden honey dripping, chunky cute shapes,` + styl rekwizytów
- Legowisko z mchu: `a round cozy bed made of soft green moss with a few purple heather sprigs and a small white pillow, chunky cute shapes,` + styl rekwizytów
- Kociołek, źródełko, zioła, legowisko, kosz, lilia i legowisko z liścia: prompty poniżej i w sekcji stawu.

## Rekwizyty obozu

Kociołek: `a round chubby iron cauldron on three short legs, bubbling pink potion inside, chunky cute shapes,` + styl rekwizytów
Źródełko: `a small stone spring with a ring of round pebbles, clear blue water pool and a little stone spout, chunky cute shapes,` + styl rekwizytów
Grządka ziół: `a wooden planter box full of fresh green herb sprouts, chunky cute shapes,` + styl rekwizytów
Krzak jagód: `a round bush full of shiny red berries, chunky cute shapes,` + styl rekwizytów
Legowisko: `a round plush pet bed in soft lilac with a small white pillow, chunky cute shapes,` + styl rekwizytów
Kosz: `a woven wicker basket with a round rim, chunky cute shapes,` + styl rekwizytów

## Nazwy plików
Zapisuj wybrane do `D:\ComfyUI-Shared\output\FS` jak dotąd, np. `Nessie-image-turbo_00003.png`, `nessie_tył_00001.png`, `nessie_lewy_00001.png`, a modele `nessie.glb`. Resztę przejrzę, wybiorę i oznaczę `WYBRANY`.
