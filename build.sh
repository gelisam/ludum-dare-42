#!/bin/bash
set -e

clear
tsc --outFile deploy/main.js --strict main.ts
