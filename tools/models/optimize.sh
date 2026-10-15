#!/usr/bin/env bash
# Shrink a raw Hunyuan3D / Pixal3D GLB into a game-ready one.
#   models/optimize.sh in.glb name [hy3|pixal]
# Writes work/<name>_game.glb and public/models/<name>.glb.txt (base64, what the game loads).
# hy3: weld + simplify (raw HY3 meshes are ~500k faces). pixal: already decimated in ComfyUI
# (DecimateMesh 25000), so no simplify; its AO map is broken and gets removed. TEX=512 for small props.
set -euo pipefail
cd "$(dirname "$0")/.."
IN=$1; NAME=$2; KIND=${3:-hy3}
GT="npx gltf-transform"
mkdir -p work
T=work/$NAME
if [ "$KIND" = pixal ]; then
  node models/noao.mjs "$IN" "$T.a.glb"
  $GT weld "$T.a.glb" "$T.b.glb"
else
  $GT weld "$IN" "$T.a.glb"
  $GT simplify "$T.a.glb" "$T.b.glb" --ratio "${RATIO:-0.04}" --error 0.002
fi
$GT resize "$T.b.glb" "$T.c.glb" --width "${TEX:-1024}" --height "${TEX:-1024}"
$GT webp "$T.c.glb" "$T.d.glb" --quality 82
node models/notan.mjs "$T.d.glb" "${T}_game.glb"
rm -f "$T".[abcd].glb
base64 -w0 "${T}_game.glb" > "../public/models/$NAME.glb.txt"
ls -la "${T}_game.glb" "../public/models/$NAME.glb.txt"
