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

Tap **➕ NEW EXPLORER**, pick a name and badge, then hand the iPad to a grown-up for
a minute (or tap *Skip*). Left thumb walks
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
- **🎈 The Skydock balloon**: walk up the ramp into the basket and tap the balloon.
  With a Cloudcap it climbs high into the sky — jump out at the top and glide home.
  Without one it just bobs. It floats back down to the dock the moment you leave
- **🪂 Cloudcap**: tinker one from fluff, feathers and timber, then **hold ⬆️ while
  falling to glide** — sail off a cliff to a satellite islet, chase a Starfall
  mid-air, look where you want to go. Let go to drop
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
  answer the wishing star's riddle to catch the sparks (parents set how long
  "a while" is, per child)
- New isles unlock with levels: Meadowmere → Ambershore → Frostspire →
  Mossveil → Starfen

## For parents

**Long-press the 🗝️ Parents button** (home screen or pause menu). Optionally
set a 4-digit PIN there.

- **Explorers** — each child's grade and subject plan, where they are in every set
  (the tier name and what it practices), and **🌟 ready-to-move-up** prompts when a
  child keeps winning at the top of a grade set (promotion is always your tap —
  "Not yet" quiets it until another run of clean wins). **🎓 Edit setup** opens
  the grade screen; per-child progress (first-try accuracy by skill, needs-review
  patterns, recently mastered); reset/remove
- **🎓 The grade screen** — pick a grade (K–5) and every subject follows it:
  Reading, Spelling and Math each get that grade's set. Change any one subject on
  its own if a child is ahead or behind in it — it then stays put when the grade
  changes, and follows again if you put it back in step. Bible and Latin are on/off.
  New explorers reach this screen right after picking a name, behind the PIN if one
  is set; "Skip" keeps sensible defaults and flags the child in the Explorers tab.
- **Lessons** — every set, built-in or yours, opens with **✏️ View / edit**: tiers,
  words, verses and questions, each with add / edit / remove and an optional
  *say it as…* pronunciation. **Editing a built-in makes your own copy under the
  same name** — the child's progress on the words you didn't touch is kept, a removed
  word stops appearing, an added one enters as new, and **Restore original** puts it
  back. Math sets are shown read-only (they're generated from recipes). Plus
  **Create a lesson set**: paste a list, pick the type, save. Formats:
  - *Spelling*: one word per line
  - *Reading*: `word` or `word 🐶` (emoji enables picture activities)
  - *Vocabulary*: `aqua = water`
  - *Bible verses*: `John 3:16 | For God so loved the world...`
  - *Questions*: `Question? | right answer | wrong | wrong`
- **Assignments** — per child, a switch turns each set on or off (off remembers
  its weight) and a weight 1–5 sets how often it appears in play. Bible weighting
  is simply the weight on the Bible set. Multiple sets per child and one set for
  multiple children both work; grades themselves are chosen in Explorers → Edit setup.
  This tab also holds the **🌠 Question timer** — the *longest* a child may play
  without a question (Off, or 1–30 minutes), set per child, with a one-tap "use
  this for every explorer". When it runs out, a wishing star falls from the sky
  with a challenge — part of the game and rewarded like any other — and any
  question they answer on their own resets the clock. Questions are never held
  back: wonderstones and chests open whenever they're found. The setting lives in
  parent settings, not in a child's save: it can't be reached from any child-facing
  screen, and reloading the game doesn't restart the clock.
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
voice takes a moment to start. On iPad the voice is started in the same tap
(Safari drops a delayed speak, which is what made the button seem broken
when a card was already reading itself out).

**If a letter sounds wrong**, open Parents → Reports & Settings → **🗣️ Voice check**.
It names the voice your device is actually using, plays every letter, and lets you pick
a different spelling for any that come out wrong — speech engines genuinely disagree,
and a bare "a" is read as the article ("uh") while the obvious fix "ay" comes out as
"eye" on some voices. Your picks are saved on that device only, since the right spelling
depends on which voice is installed there.

Words can carry their own pronunciation: a `say:` field on any word, verse or
question (set it in the bank editor as *say it as…*) is what the voice reads instead
of the spelling — for homographs like *read* and *live*, Latin, and unusual names.

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

- **Reading K–5** — sight words and picture words for K–1 (shown lowercase, as in
  books), compounds/prefixes/suffixes for 3, chapter-book vocabulary with meanings
  for 4–5, with practice sentences throughout
- **Spelling K–5** — three-letter words up through -tion/-sion, one phonics step per tier
- **Math Facts & Fluency K–5** — generated from per-grade recipes and tracked
  fact-by-fact. Labeled honestly: multiple-choice fluency, a supplement to a math
  curriculum, not a replacement
- **Latin · First Steps** — original introductory material written for this game,
  spoken with **classical** pronunciation (v as w, c and g always hard, ae as "eye")
  via per-word `say:` respellings
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

## Sunwake Atoll (2.6.0)

Open the pause menu, choose Travel, and select Sunwake Atoll. The isle is
available from level 1, with palm groves, a turquoise lagoon, two outer
islets to bridge to, and a beacon to restore. Gather shells and glowcoral;
bring 6 shells, 2 glass, and 2 glowdust to the beacon for a one-time reward
of 12 sparks, 3 glimmer, and 30 light. Glass can be made at a kiln or bought
through Trade & supplies. Shells and glowdust also support existing recipes.

The world lives in `js/sunwake.js`, using optional terrain and population
hooks. Older island seeds and object order stay unchanged. Beacon progress,
harvested resources, and buildings use the existing per-isle save system.
Education and shared-family services remain separate from the world module.

Local verification: run `tests/test-sunwake.js` with the game served on port
8905. It covers travel, land/water layout, gathering, beacon costs and rewards,
repeat-reward protection, retention of an existing world, and saved reloads.

## First discovery (2.6.1)

A fresh explorer enters with a short Keeper introduction and one action: Begin
my first discovery. This opens an activity through the existing learning
scheduler, using that child's assigned curricula and normal mastery/reporting.
Completing it earns 5 sparks and 10 light, then suggests gathering timber.
There is no new timer. Existing saves bypass the introduction; each new
explorer saves completion independently. A skipped or unavailable lesson earns
nothing and can be retried through Menu → First discovery.

To verify: add a fresh explorer with lessons assigned, enter the world, and
tap Begin my first discovery. Answer the real activity, see the earned sparks,
then return to exploring. Reload to confirm it does not repeat; add a sibling
to confirm their introduction is independent. `tests/test-first-discovery.js`
checks these paths, including mistakes, reporting and no assigned lessons.

## Asterfall Observatory (2.7.0)

Earn level 12, then select Asterfall Observatory in Menu → Travel. The travel
menu and game travel entry point both enforce its level requirement.
Follow the gold waystones up the terraces to the celestial instrument.
Visit the Jade, Violet and Amber lenses and complete one assigned learning
discovery at each; the usual mastery and reporting systems record the work.
No timer or material charge applies to lens attempts. Skipped or unavailable
lessons do not align a lens.

Return with 6 glimmer, 4 glass and 2 starstone to awaken the moving rings and
earn 40 sparks, 6 aurorium and 60 light once. Crystals and starstone veins
grow on the isle; starstone requires a skysteel mallet, and glass comes from
a kiln or Trade & supplies. Two outer islets provide bridge destinations.
The expedition and rewards save separately for each explorer.

`tests/test-asterfall.js` exercises the level boundary, terrain routes, bridge
anchors, all three real lessons, restoration costs, rewards and reloads.

## Useful finds and picnic supplies (2.7.1)

In the satchel, select a berry tart and choose Enjoy a berry tart. It adds
one timber or stone to the next ten completed timber/stone gathers. Other
resources, unfinished swings, travel and elapsed time do not spend it.
The remaining bonus saves per explorer, appears in the satchel and cannot
be stacked by accidentally eating another tart.

Old inventory buckets and water buckets can each be reclaimed into one
skysteel; rope becomes two fluff; inventory lanterns become one glass and
two emberstone. This is an explicit action, preserving keepsakes until the
player chooses it. Placed lanterns and the lantern kit are unaffected.

Item cards now include registered restoration costs and villager request
uses, Tinker/Kiln guidance, a building shortcut, and an option to trade five
items together. `tests/test-item-finish.js` verifies the real gathering path,
reclamation, saved bonus, catalog use coverage and explorer isolation.

## Keeper Expeditions and Field Journal (2.8.0)

The compass below the HUD opens three voluntary 5–10 minute adventure paths:
Whispering Wilds, The Keeper's Hearth, and Starlight Trail. Each reveals one
step at a time and connects gathering, creatures or building with a challenge
from the explorer's assigned lessons. There are no deadlines or daily streaks.
Progress survives travel and reloads.

Completed expeditions award 10 sparks, 20 light, and one of six guaranteed
Field Journal discoveries. Each trail awards its two discoveries in order, so
the player does not lose a completion to a random duplicate. An expedition
completed on an isle also leaves a small Keeper marker near that isle's arrival
point on the next visit. After a journal entry is earned, a grown-up can hold
the postcard action and pass the Parents gate to save a personalized PNG.

Every regular overlay now receives a compact **Read this screen** control. It
speaks instructions and action labels without reading answer choices. In an
independent decoding activity it deliberately excludes the target word. The
NPC request HUD and selected building description can also be tapped to hear
them. The controls use the existing on-device speech layer and store no voice
data.

Expedition starts, progress and completions emit `lumen:expedition-*` browser
events for a future shared family service. Local saves track starts,
completions, abandoned choices, duration, journal discoveries, and session
length without adding an account or telemetry service. Parents see completion
and average-session summaries per explorer.

`tests/test-expeditions.js` covers choice, staged progress, a real lesson,
rewards, non-duplicate discoveries, postcards, isle markers, reloads,
read-aloud answer safety, session metrics, and sibling isolation.
