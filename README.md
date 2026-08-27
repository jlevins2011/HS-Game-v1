# ✨ Lumen Isles — Explore. Build. Shine.

A 3D floating-island adventure for homeschool families with its own visual
identity: sculpted low-poly isles drifting in the sky, rounded storybook
trees and creatures — no cubes in sight. Kids chop trees, quarry stone
outcrops, salvage ruins, build real structures from walls, roofs, and
stairs, span rope bridges across open sky, restore withered land at
glowing **Lightsprings**, and descend into crystal grottos — and school
practice (reading, spelling, Latin, Bible, math) appears naturally inside
the play as floating **wonderstones**, **curio chests**, restoration
rites, crafting challenges, and **Starfall** events they *want* to answer.

The running build's version is shown on the home screen (bottom-left) and in
the pause menu, so you always know what's on the iPad. Bump
`CONFIG.BRAND.version` / `.built` in `js/config.js` for each build you send.

Built for iPad touch (works in any modern browser, mouse + WASD too).
No installs, no accounts, no ads, no chat. Progress saves on-device;
a one-tap backup file protects it. *(Working title — branding is centralized
in `js/config.js` and easy to change.)*

## Launch it

**Easiest (GitHub Pages):**
1. Repo → Settings → Pages → "Deploy from a branch" → pick your branch, `/ (root)` → Save
2. Open the published URL on the iPad in Safari
3. Share → **Add to Home Screen** — it launches full-screen like an app

**Or locally:** open `index.html` in a browser, or host the folder on any
static server. The game loads three.js from `vendor/three.min.js` when that
file is present (fully offline play) and falls back to the jsDelivr CDN
otherwise — to make the game 100% offline, download
`https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js` into
`vendor/three.min.js`.

## For kids

Tap **➕ NEW EXPLORER**, pick a name and badge, and go. Left thumb walks
(virtual joystick), right thumb looks around, tap to interact — the prompt
under the aim dot always says what a tap will do. ⬆️ jumps, 🎒 opens the
satchel, 🛠️ opens build mode.

- **The world is made of things, not blocks**: chop puffwood trees, quarry
  stone outcrops and glowing ore veins, pick flowers and berries, salvage
  old ruins — everything regrows, so the isles never run dry
- **⛲ Lightsprings**: each isle has withered, gray zones around dormant
  springs. Offer materials and answer the two-part **Rite of Light** to
  reignite one — color floods back, flowers bloom, and the isle-light
  meter fills. Restore them all and the **bridge anchors** awaken
- **🌉 Sky bridges**: build rope-bridge spans from the anchors across open
  sky to reach the isle's floating satellite islets
- **🛠️ Building**: compose real structures from floors, walls, doorways,
  windows, roofs, stairs, fences, planters, lantern posts, and a camp
  tent (your respawn point). Point at the side of a tile and the wall goes
  there — all four sides — with ⟳ to step around. **Doors really swing:** tap
  one to open it, tap again to shut it (a closed door blocks the way, and it
  stays how you left it). For a roof, stand in your house and look up — the
  roof caps whatever is on the tile. Taking a piece back refunds its materials
- **🔮 Wonderstones** and **🧰 curio chests** hold challenges with spark + loot rewards
- **Elder Alder** gives SUPER CHALLENGES that earn legendary tools — the
  **Rootbreaker Drill** (opens the sealed crystal grotto beneath the isle),
  the **Skyrider Badge** (unlocks Cloudhaven Skydock and its airship), and
  the **Sunforged Mallet**
- **Wren the Tinker**'s challenges unlock the **Sky Kiln** and **Lantern Kit**
- **Finch and Poppy** give gathering quests; **Pip the fox** loves petting
  (and pickpockets when a challenge goes really badly)
- **Planters** grow sunfruit and moonmelon from seeds — crops keep growing
  while away
- Creatures (tuftles, puffbirds, shellhoppers, glowmoths) play chase and
  leave gifts; the brush collects tuftle fluff without the chase
- Go quiet on learning for a while and **🌠 STARFALL** tumbles from the sky —
  answer the wishing star's riddle to catch the sparks
- New isles unlock with levels: Meadowmere → Ambershore → Frostspire →
  Mossveil → Starfen

## For parents

**Long-press the 🗝️ Parents button** (home screen or pause menu). Optionally
set a 4-digit PIN there.

- **Explorers** — profiles, per-child progress (first-try accuracy by skill,
  needs-review patterns, recently mastered), reset/remove
- **Lessons** — the built-in sets plus **Create a lesson set**: paste a list,
  pick the type, save. Formats:
  - *Spelling*: one word per line
  - *Reading*: `word` or `word 🐶` (emoji enables picture activities)
  - *Vocabulary*: `aqua = water`
  - *Bible verses*: `John 3:16 | For God so loved the world...`
  - *Questions*: `Question? | right answer | wrong | wrong`
- **Assignments** — per child, set each lesson set's weight 0–5 (how often it
  appears in play). Bible weighting is simply the weight on Bible sets.
  Multiple sets per child and one set for multiple children both work.
- **Reports & Settings** — weekly family email reports, on-screen report
  preview, **backup export/restore** (a JSON file — protects against cleared
  browser data and moves progress to a new device), parent PIN.

**Email reports**: add parent addresses in the dashboard. Delivery uses
formsubmit.co (free relay) — the first send triggers a one-time "activate"
email to each address; click its link once and weekly reports flow while the
game is played. No server or credentials required. (Formspree-style endpoint
URLs also work via `CONFIG.REPORT.endpoints`.)

## How the learning works

Each challenge measures a distinct skill, tracked separately per item:

- hearing a word → tapping it (auditory recognition)
- seeing a written word → tapping the picture (**independent decoding — the
  word is never spoken**)
- picture/definition → word (meaning)
- spelling: spotting correct spellings and building words from tiles
- vocabulary in both directions (recognize and recall), plus spelling it
- Bible: verse completion, building verses word-by-word, knowledge questions
- math facts, generated endlessly but tracked fact-by-fact
- optional read-aloud with the microphone (skippable, never required)

### The 🔊 buttons

Every challenge card has a speaker button, and it always works the same way:
tap it as many times as you like, and it repeats. Tapping it again while it's
talking cuts the old word off and starts over, so an impatient tap is never
swallowed. The button flashes when it registers your tap even if the device's
voice takes a moment to start.

One button behaves differently **on purpose**: on the "read this word" card
the speaker says *"Read the word, then tap the picture that matches"* and
never says the word itself. That card is the one that measures whether a
child can decode a word without hearing it first — saying it aloud would
turn it back into a listening test. The word is spoken as soon as the child
gets it right.

An adaptive scheduler (Leitner-style boxes 0–5 per item **per skill**) brings
back what a child misses, rests what's mastered (with occasional review), and
leans toward the skill each child is weaker at. Difficulty tiers ramp up on
clean streaks and quietly step back during rough patches. Tuning lives in
`js/config.js` (`CONFIG.LEARN`).

## Built-in content

- Reading Grade 2 & Grade 5 (with meanings), Spelling Grade 2 & Grade 5
- **Latin · First Steps** — original introductory material written for this game
- **Bible · Verses & Stories** — memory verses quoted verbatim from the KJV
  (public domain) and narrative knowledge questions; **every Bible item carries
  its Scripture reference** so it can be audited. Parents control how much
  appears and can add their own verses/catechism/church curriculum.
- Math facts through multiplication and division

## For tinkerers

Vanilla JS, no build step. `js/config.js` centralizes branding, movement,
rewards, pacing, and learning tuning. Content lives in `js/content/`.
The engine (movement, physics, touch controls, TTS) is proven kid-tested code.
Persistence is a thin layer (`js/store.js`) with whole-family
export/import — a clean seam for cloud sync later.
