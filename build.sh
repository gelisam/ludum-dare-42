#!/bin/bash
set -e

clear
./compile_levels.sh
tsc --outFile deploy/js/main.js --strict main.ts
