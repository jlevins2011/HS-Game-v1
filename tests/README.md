# Tests

Browser tests driven by Playwright + CDP touch events, run against an iPad-shaped
viewport and an iPad user agent. They stub `window.speechSynthesis` with a faithful
model — utterances **queue** and play one at a time, and `cancel()` discards what is
queued — because both behaviors are what the audio layer is written against.

## Running them

`audio-tts.test.js` is pure Node — no server, no browser:

    node tests/audio-tts.test.js

The browser tests need `playwright-core` (not vendored — `npm i playwright-core` in any
directory and point `NODE_PATH` at its `node_modules`, or install it at the repo root)
and the repo served on port 8905:

    python3 -m http.server 8905 --bind 127.0.0.1 &     # serve the repo root
    node tests/test-content.js
    node tests/test-migration.js
    node tests/test-setup.js
    node tests/test-editor.js
    node tests/test-glider.js
    node tests/test-nudge.js
    node tests/test-balloon.js
    node tests/test-letters.js
    node tests/test-spell-live.js

Chromium comes from `PLAYWRIGHT_BROWSERS_PATH`; launch flags used here are
`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --no-sandbox`.
Each script exits non-zero on failure and starts from an empty localStorage, so they
can run in any order.

## What is covered

- `audio-tts.test.js` — the iPad speak()-inside-the-tap rules: cancel + silent
  dummy + word all in one tick on iPad, no watchdog speak() from a timer there,
  the deferred retry that only Chrome/desktop uses, the click fallback, and
  unlock priming. Loads `js/config.js` into the sandbox first, as the browser
  does, so the letter table is the real one.
- `test-content.js` — **content lint.** Every built-in set × tier is driven through
  the real challenge builders: every kind a tier should produce does appear, every
  challenge is well-formed (answer among the choices, unique choices, tiles spell the
  word, verse words rebuild the verse), picture emoji are unique within a tier, every
  graded subject has a set for every grade K–5, `say:` reaches the challenge, and the
  read card shows a word in its own case. Run this after touching any content file.
- `test-migration.js` — seeds a pre-2.2.0 household (two age bands, legacy set ids,
  a custom set, a PIN) and two v2 saves, then checks: bands → grades, ids remapped,
  `math1` lands on each child's own grade, rows gain `enabled`/`autoGrade` with weights
  kept, mastery/tier/stats/world state intact, pre-migration copies stashed under
  `*_bak`, a sibling who hasn't played yet is read through the migration without being
  written, and the Parents area shows it all.
- `test-setup.js` — the New Explorer hand-off: grade auto-sync, a per-subject override
  that survives grade changes and re-syncs when put back in step, on/off, SAVE starts
  the game with exactly the right rows, Skip uses defaults and flags the profile,
  Edit setup from the Explorers tab, and the PIN gate (cancel returns to the
  hand-off; Skip stays open).
- `test-editor.js` — the bank editor: deleting words creates a household copy under the
  same id, the original built-in is untouched, mastery on untouched words survives,
  play stops asking deleted words and starts asking added ones, `say:` reaches the voice
  (including the classical Latin respellings), Restore original, custom sets edit in
  place, math is view-only, and the Assignments on/off switch remembers weight.
- `test-glider.js` — Cloudcap: falls normally without it, floats with it while ⬆️ is
  held, drops when released, the real button swaps to 🪂 mid-air, the one-time hint,
  and the Tinker Bench recipe.
- `test-nudge.js` — the question timer: a wonderstone is never held back; after the
  parent-set time without a question a wishing star brings one, answering it is
  rewarded and resets the clock; Off means no stars; the clock survives a reload with
  a minute of grace; an older "pacing" value carries over as the timer.
- `test-balloon.js` — the Skydock balloon: the ramp is walkable onto the deck; without
  a Cloudcap a tap only hops; with one it climbs to the sky with the rider carried on
  the deck, first flight is rewarded, the prompt changes, stepping off starts it home
  while the child glides, it lands by itself, and tapping from the ground only hints.
- `test-letters.js` — the letter-name table, per-device overrides that stay out of
  the family backup, queue-vs-interrupt, and the Voice check screen.
- `test-spell-live.js` — taps real letter tiles in a real spelling challenge.

## What these cannot do

They verify the **string handed to the speech engine**, never how it sounds. Whether
"ay" is heard as "ay" or "eye" depends on the voice installed on the device, so
pronunciation itself has to be checked by ear — which is what the Voice check screen
in the Parents area is for. Likewise the content lint proves every tier is playable;
it cannot judge whether a word list is right for a grade. Read the content.
