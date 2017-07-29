#!/bin/bash
set -e

function pngtopam {
  # because pngtopnm doesn't output with RGB_ALPHA files.
  INPUT="$(cat "$@" | base64)"
  pamstack -tupletype=RGB_ALPHA <(echo "$INPUT" | base64 -D | pngtopnm) \
                                <(echo "$INPUT" | base64 -D | pngtopnm -alpha)
}

function pamtopng {
  # because pnmtopng doesn't accept RGB_ALPHA files.
  INPUT="$(cat "$@" | base64)"
  pnmtopng -force <(echo "$INPUT" | base64 -D | pamchannel 0 1 2) \
           -alpha=<(echo "$INPUT" | base64 -D | pamchannel 3)
}

for x in `ls small-images/*.png`; do
  F="$(basename "$x")"
  pngtopam "small-images/$F" | pamscale 2 | pamtopng > "images/$F"
done
