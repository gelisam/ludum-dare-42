#!/bin/bash
set -e

# generate something like this:
#
#   var levels = [
#     {
#       spriteFiles: [
#         "images/levels/1/L-blob.png",
#         "images/levels/1/J-blob.png"
#       ]
#     },
#     {
#       spriteFiles: [
#         "images/levels/2/tape.png",
#         "images/levels/2/scissors.png"
#       ]
#     }
#   ];
(
  echo "var levels = ["
  for LEVEL in `ls "deploy/images/levels" | sort -n`; do
    echo "  {"
    echo "    spriteFiles: ["
    for SPRITE in `ls "deploy/images/levels/$LEVEL"`; do
      echo "      \"images/levels/$LEVEL/$SPRITE\","
    done
    echo "    ]"
    echo "  },"
  done
  echo "];"
) | tr '\n' '\1' | sed 's/,\([ ]*\]\)/\1/g' | tr '\1' '\n' > deploy/js/levels.js
