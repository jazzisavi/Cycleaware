---
name: Static bundle build under shell timeout
description: How to complete scripts/build.js when it exceeds the 120s shell command cap
---

**Rule:** Don't run `node scripts/build.js` cold — it starts its own Metro and won't finish within the 120s bash cap, and detached/nohup runs get killed by the sandbox. Instead: (1) restart the `Start Frontend` workflow (Metro on 8081, kept alive by Replit, sets the same `EXPO_PUBLIC_DOMAIN=$REPLIT_DEV_DOMAIN:5000` the build uses), (2) warm both production bundles with `curl "http://localhost:8081/client/index.bundle?platform=<ios|android>&dev=false&hot=false&lazy=false&minify=true"` until 200 (Metro transform cache persists in /tmp/metro-cache), (3) run `node scripts/build.js` — it detects the running Metro and finishes in well under 120s, (4) restart `Start Backend` so mobile picks up the new static-build dir.

**Why:** build.js's prepareDirectories wipes static-build/ at start, so a killed run leaves the app with NO bundles; foreground 120s runs and setsid/nohup background runs both failed repeatedly before this approach worked.

**How to apply:** Any time static bundles must be rebuilt after code changes (required for mobile Expo Go delivery per replit.md).
