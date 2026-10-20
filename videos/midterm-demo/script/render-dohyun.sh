#!/usr/bin/env bash
# 편마다 index.html로 올려 렌더링하고, 마지막에 전체판을 이어 붙인다.
set -e
cd "$(dirname "$0")/.."
mkdir -p renders/dohyun
for e in ep00 ep01 ep02 ep03 ep04 ep05 ep06 ep07; do
  cp "episodes/$e.html" index.html
  npx hyperframes render -o "renders/dohyun/$e.mp4" --quiet --skill general-video
  echo "rendered $e"
done
: > renders/dohyun/list.txt
for e in ep00 ep01 ep02 ep03 ep04 ep05 ep06 ep07; do echo "file '$e.mp4'" >> renders/dohyun/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i renders/dohyun/list.txt -c copy renders/dohyun/full.mp4
echo "full done"
