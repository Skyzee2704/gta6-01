#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/browser-server.sh"
command -v ffmpeg >/dev/null || { echo 'FAIL ffmpeg missing'; exit 1; }
mkdir -p screenshots
capture() {
  local index=$1 shot=$2 png="/tmp/solmar-$2.png" out="screenshots/$1-$2.jpg" size luma floor q
  timeout 300s node tools/browser-drive.mjs "${URL}?shot=$shot&seed=1&quality=low" "$png" || { echo "FAIL $shot browser capture"; return 1; }
  for q in $(seq 3 31); do
    ffmpeg -v error -y -i "$png" -q:v "$q" -frames:v 1 "$out" || return 1
    size=$(stat -c %s "$out")
    if ((size<=262144)); then break; fi
  done
  ((size<=262144)) || { echo "FAIL $shot size $size"; return 1; }
  luma=$(python3 tools/luma.py "$out")
  floor=.35; [[ "$shot" == onfoot ]] && floor=.25
  if awk -v y="$luma" -v f="$floor" 'BEGIN {exit !(y!="" && y>=f)}'; then
    echo "PASS $out bytes=$size mean_luma=$luma"
  else
    echo "FAIL $out bytes=$size mean_luma=$luma floor=$floor"; return 1
  fi
}
index=0; failed=0
for shot in cover title onfoot map; do
  index=$((index+1))
  if ! capture "$index" "$shot"; then failed=$((failed+1)); fi
done
echo "shots: $((4-failed))/4 passed; low quality disables shadows for SwiftShader"
((failed==0))
