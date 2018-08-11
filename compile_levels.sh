#!/bin/bash
set -e

# generate something like this:
#
#   var levels = [
#     {
#       backgroundFile: "images/levels/1/background.png",
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
    echo "    backgroundFile: \"images/levels/$LEVEL/background.png\","
    echo "    spriteFiles: ["
    for SPRITE in `ls "deploy/images/levels/$LEVEL" | grep -v '^background.png$'`; do
      echo "      \"images/levels/$LEVEL/$SPRITE\","
    done
    echo "    ]"
    echo "  },"
  done
  echo "];"
) | tr '\n' '\1' | sed 's/,\([ ]*\]\)/\1/g' | tr '\1' '\n' > deploy/js/levels.js
