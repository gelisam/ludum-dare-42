#!/bin/bash
set -e
for x in `ls small-images/*.png`; do
  F="$(basename "$x")"
  pngtopnm "small-images/$F" | pamscale 2 | pnmtopng > "images/$F"
done
