---
name: Static bundle deploy
description: How Expo mobile delivery works in this project — static bundles, not live Metro.
---

## Rule
After ANY frontend code change, you MUST:
1. Run `node scripts/build.js`
2. Restart `Start Backend` workflow

## Why
Mobile Expo Go loads pre-built static JS bundles from `static-build/` served by Express. It does NOT connect to the Metro dev server. Hot module reloading only works for the web version (port 8081).

**Why:** The build script exports bundles for iOS and Android manifests, downloads all assets, and updates manifest URLs. Without this step, mobile users continue seeing the old code.

## Web vs mobile
- Web preview (port 8081): served by Metro dev server, has HMR — no rebuild needed
- Mobile Expo Go: served from `static-build/` via Express (port 5000) — rebuild always needed

## Do NOT restart `Start Frontend` unless
- Dependencies changed (package.json modified)
- Metro dev server crashed or got stuck
