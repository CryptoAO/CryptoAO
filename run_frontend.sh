#!/usr/bin/env bash
set -euo pipefail

cd src/frontend
flutter pub get
flutter run
