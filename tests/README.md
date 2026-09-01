# Tests

Browser tests driven by Playwright + CDP touch events, run against an iPad-shaped
viewport and an iPad user agent. They stub `window.speechSynthesis` with a faithful
model — utterances **queue** and play one at a time, and `cancel()` discards what is
queued — because both behaviors are what the audio layer is written against.

## Running them

`audio-tts.test.js` is pure Node — no server, no browser:

    node tests/audio-tts.test.js

The browser tests need the repo served:

    python3 -m http.server 8905 --bind 127.0.0.1 &     # serve the repo root
    node tests/test-letters.js
    node tests/test-spell-live.js

Chromium comes from `PLAYWRIGHT_BROWSERS_PATH`; launch flags used here are
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --no-sandbox`.
Each script exits non-zero on failure.

## What is covered

- `audio-tts.test.js` — the iPad speak()-inside-the-tap rules: cancel + silent
  dummy + word all in one tick on iPad, no watchdog speak() from a timer there,
  the deferred retry that only Chrome/desktop uses, the click fallback, and
  unlock priming. Loads `js/config.js` into the sandbox first, as the browser
  does, so the letter table is the real one.
- `test-letters.js` — the letter-name table (all 26 letters get an explicit
  respelling, none is left as a bare character), lone-letter sight words routing
  through it, per-device overrides saving and *not* travelling in a family backup,
  queue-vs-interrupt behavior, and the Parents → Voice check screen.
- `test-spell-live.js` — taps real letter tiles in a real spelling challenge and
  checks that every tapped letter is spoken as a letter name.

## What these cannot do

They verify the **string handed to the speech engine**, never how it sounds. Whether
"ay" is heard as "ay" or "eye" depends on the voice installed on the device, so
pronunciation itself has to be checked by ear — which is what the Voice check screen
in the Parents area is for.
