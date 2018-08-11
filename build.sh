#!/bin/bash
set -e

clear
tsc --outFile deploy/js/main.js --strict main.ts
