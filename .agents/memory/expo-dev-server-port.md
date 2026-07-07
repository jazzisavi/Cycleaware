---
name: Expo dev server stuck on port 8081 prompt
description: Why the in-IDE Mobile App preview / Expo Go suddenly times out, and the one-step fix
---

# Symptom
Replit's in-IDE "Mobile App" preview (the phone-frame iframe) and Expo Go on a real
device both show "The request timed out" while loading `exp://...picard.replit.dev`.
The app code is fine — nothing was broken by a code change.

# Root cause
The Expo dev server (`Start Frontend` workflow, must bind port **8081**) fails to start
cleanly when a stale/zombie process is already holding 8081. Expo then halts on an
interactive prompt: `Port 8081 is being used by another process — Use port 8082 instead? (Y/n)`.
It never gets an answer, so Metro never serves the manifest. The thing answering on
8081 is the old stale process, not the live app — so the preview and Expo Go time out.

# Fix
Restart the `Start Frontend` workflow (`restart_workflow("Start Frontend")`). It kills
the stale process and rebinds 8081. Confirm via logs that you see
`Metro waiting on exp://...` and `Web is waiting on http://localhost:8081` (NOT the
8082 prompt). Then reload the preview / rescan QR after ~15s.

# Important framing
Replit's in-IDE Mobile App preview is NOT a native iOS/Android simulator and does NOT
need Xcode/a Mac — it renders the Expo app over the dev server in-browser. Do not tell
the user it requires Xcode. Native OS simulators (iOS Simulator, Android Emulator) are
genuinely unavailable on Replit's Linux cloud, but that is a separate thing from this
in-browser preview, which works fine when 8081 is bound correctly.
