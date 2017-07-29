#!/bin/bash
set -e

./build.sh || true
fswatcher --throttle=200 --path main.ts ./build.sh
