#!/usr/bin/env bash
# Make game models lighter in place: fewer triangles for public/models/<name>.glb.txt (what the game loads).
#   models/lighter.sh 0.3 prop_kociolek prop_kosz ...     (ratio, then names)
# ERROR=0.01 is how far the surface may move (share of the model's size). Stops at that error even if the ratio
# is not reached, so details stay. The old file is kept in work/lighter/<name>.orig.glb until you delete it.
set -euo pipefail
cd "$(dirname "$0")/.."
RATIO=$1; shift
mkdir -p work/lighter
for NAME in "$@"; do
  T=work/lighter/$NAME
  base64 -d "../public/models/$NAME.glb.txt" > "$T.orig.glb"
  npx gltf-transform simplify "$T.orig.glb" "$T.glb" --ratio "$RATIO" --error "${ERROR:-0.01}" > /dev/null
  base64 -w0 "$T.glb" > "../public/models/$NAME.glb.txt"
  tris() { npx gltf-transform inspect "$1" 2>/dev/null | sed "s/[[0-9;]*m//g" | grep TRIANGLES | awk -F'│' '{gsub(/[^0-9]/, "", $6); s += $6} END {print s}'; }
  echo "$NAME: $(tris "$T.orig.glb") -> $(tris "$T.glb") triangles"
done
