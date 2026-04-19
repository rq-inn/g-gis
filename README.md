# GloranthaGIS

## Overview
- Static web app for map viewing and related UI flows.

## JS structure
- Runtime entry points are `./js/main.js` and `./js/ui.js`.
- Non-UI logic lives under `./js/logic/`.
- UI-related files live under `./js/ui/`.
- `index.html` loads scripts from `./js/**`.

## Asset structure
- CSV and similar app data live under `./data/`.
- App icons and shared images live under `./images/`.

## Notes
- Legacy root-level `.js` files may still remain during migration, but active script loading now uses the `js` directory.
