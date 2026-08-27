# Lumen Isles — Platform Audit

**Branch audited:** `claude/lumen-redesign-v2` @ `b08187d` (app version 2.1.0)
**Date:** 2026-08-27
**Scope:** what exists today, what it assumes, and what must change to grow into a
homeschool learning platform with a parent web dashboard and a teacher/classroom module.

This document changes no production code. It is a survey and a set of constraints for
the architecture work that follows. It deliberately does **not** propose database
schemas, pick a backend vendor, or redesign gameplay, activities, controls, or the world.

Where a data shape is sketched, it is marked **(shape, not schema)** — it illustrates
what a boundary must carry, not how to store it.

---

## 0. How to read this

- **§1–§5** describe what is actually in the code today, with file:line references.
- **§6–§7** describe what the two new surfaces need.
- **§8** covers leaving room for optional teacher progress sharing.
- **§9** proposes the boundaries between the four systems.
- **§10** is the technical-debt and blocking-assumptions inventory.
- **§11** is the short list of decisions worth escalating.

A recurring theme: **the code is small, readable, and honest, but it is a
single-device, single-household, single-adult-role application all the way down.**
Almost nothing is wrong for what it is. Almost everything needs a seam it does not
currently have.

---

## 1. Architecture as it stands

### 1.1 Delivery model

There is no build step, no package manager, no module system, and no test harness in
the repository. `index.html` (105 lines) loads 27 ordered `<script>` tags; every module
is a global IIFE assigned to a `var` (`Store`, `Learning`, `Activities`, `UI`, `Game`,
`Parent`, `Reports`, …). three.js r128 is vendored at `vendor/three.min.js` with a
jsDelivr `document.write` fallback.

Consequences that matter for platform work:

- **Load order is the dependency graph.** `js/content/*.js` must run before `store.js`
  (they push onto `window.BUILTIN_CURRICULA`); `store.js` before `learning.js`; `ui.js`
  before `parent.js`. Nothing enforces this.
- **Nothing can be imported by another app.** A parent web dashboard or a classroom app
  cannot `import { Learning }` — it would have to load the whole global soup, including
  three.js, in the right order.
- **No tests are committed.** The verification suites written during development
  (`test-speak.js`, `test-jam.js`, `test-parent.js`, `test-pace.js`, `test-house.js`,
  `play-r*.js`) live in a scratch directory outside the repo. Any refactor of the
  learning or persistence layer currently has no safety net in-tree.

### 1.2 Module dependency graph (actual, from the source)

```
config.js      → (nothing)
audio.js       → (nothing)
content/*.js   → (nothing; push onto window.BUILTIN_CURRICULA)
geo/terrain/objects/build/player/controls/creatures/npcs/garden  → world layer
store.js       → CONFIG
learning.js    → CONFIG, Store, Stats, UI, Game, GameAudio
activities.js  → UI, GameAudio
reports.js     → CONFIG, Store, Stats, Learning, UI
parent.js      → CONFIG, Store, Learning, Reports, UI, Game, GameAudio
ui.js          → CONFIG, Store, Stats, Learning, Activities, Parent, Game,
                 Player, Controls, Build, Terrain, ISLE_DEFS, GameAudio
game.js        → everything
```

Three edges are the ones that will hurt:

| Edge | Where | Why it blocks reuse |
|---|---|---|
| `Learning → UI` | `learning.js:557`, `:566` (`UI.toast` on tier ramp) | the scheduler cannot run without a game HUD |
| `Learning → Game` | `learning.js:538–540` (`Game.notifyEdu`, `Game.pipSteal`) | reporting a result drives Starfall timing and a fox stealing items |
| `Reports → UI` | `reports.js:54` (`UI.rankFor`) | a progress report needs the game's level-rank table |

`Activities → UI/GameAudio` is a *thin* edge by comparison: `Activities` needs only
`UI.openOverlay`, `UI.closeOverlay`, and `GameAudio`. That makes it the cleanest
candidate for reuse in a non-game surface (see §7.2).

### 1.3 Centralized tuning

`js/config.js` (86 lines) holds branding, movement/physics, reward economy, learning
tuning (`CONFIG.LEARN`), world pacing, and report cadence. It has **zero dependencies**.
This is the one genuinely portable file in the repo and a good model for how a shared
package should be shaped.

---

## 2. Player / profile system

### 2.1 What a profile is

`Store.addProfile()` (`store.js:79–92`) creates:

```js
{ id, name, emoji, color, band, createdAt }   // shape, not schema
```

- `id` — `uid()` at `store.js:58`: `"p" + Date.now().toString(36) + random4`. Locally
  unique; **not globally unique in any meaningful sense** and not a UUID.
- `name` — free text, clamped to 16 chars. No surname, no DOB, no email. This is a
  deliberate and good data-minimization choice.
- `emoji` / `color` — cosmetic, chosen from `AVATARS` / `COLORS` (`ui.js:894–895`).
- `band` — **the only academic-level field on a child**, and it has exactly two values.
- `createdAt` — client clock.

### 2.2 The two-band assumption (blocking)

`band` is set once, in the New Explorer flow, by a two-button choice:
"🌱 About 6–9" / "🌳 About 10–13" (`ui.js:930–933`). It is written to the profile
(`store.js:85`) and read in exactly one place: `defaultAssignments(band)`
(`store.js:62–76`), which returns a hardcoded starter list:

```
younger → reading2:3, spelling2:2, math1:2, bible1:2
older   → reading5:3, spelling5:3, math1:2, bible1:2
```

After that first call, **`band` is never read again anywhere in the codebase**
(verified by grep across `js/`). It is dead metadata the moment the profile exists.

This is the single most consequential assumption in the data model:

- there is no grade for a child;
- there is no grade or level *per subject*;
- a child who reads at grade 5 and spells at grade 2 cannot be expressed at all
  except by manually assigning `reading5` and `spelling2` and hoping the weights work;
- there is no way to advance a child at the start of a school year.

### 2.3 Profile selection and session

`UI.renderPlayerButtons()` (`ui.js:897`) draws one button per profile plus
"➕ NEW EXPLORER". `UI.selectProfile()` (`ui.js:886`) writes `lumen_last_player` to
localStorage — **and nothing ever reads that key** (dead write) — then calls
`Store.load(profile)` and `Game.start()`.

There is exactly one active profile at a time, held in module state
(`store.js:212–213`: `var data`, `var profile`), re-exported as `Store.data` /
`Store.profile` on load. Any code that wants "the current child" reads those globals.
There is no session object, no notion of *who is operating the device* (child vs adult),
and no way to have a child loaded for reporting purposes without also loading them
for play.

### 2.4 No adult identity at all

There is no parent record. "Parent" is a *mode*, not an entity:
a 1500 ms press-and-hold on the 🗝️ button (`UI.holdToOpen` at `ui.js:818–828`, wired
at `ui.js:815` and `ui.js:987`), optionally gated by a 4-digit PIN stored at
`Store.family.settings.pin`. There is no adult name, email
identity, account, or role field anywhere. The only adult-ish data is
`settings.emails[]`, which is a list of *report recipients*, not users.

---

## 3. Content, curricula, and the learning engine

### 3.1 Curriculum shape

Built-in curricula live in `js/content/*.js` and self-register by pushing onto
`window.BUILTIN_CURRICULA`. Parent-created sets live in `Store.family.custom` and are
merged at read time by `Store.allCurricula()` (`store.js:133–135`):

```js
allCurricula() { return (window.BUILTIN_CURRICULA || []).concat(family.custom); }
```

A curriculum is (shape, not schema):

```js
{
  id, name, subject, grade, icon, desc,
  translation?,          // Bible only, e.g. "KJV"
  language?,             // vocab only, e.g. "Latin"
  custom?: true,         // set by Store.addCustomCurriculum
  tiers: [ { name, focus, words?|pairs?|verses?|facts?|sentences?|gen? } ]
}
```

Seven built-ins ship today: `reading2`, `reading5`, `spelling2`, `spelling5`,
`latin1` (subject `vocab`), `bible1`, `math1`.

**`grade` is decorative.** It is present on every built-in (`"2"`, `"5"`, `"all"`,
`"intro"`, `"1-5"`) and is **never read by any code** (grep: zero non-content hits).
There is no grade filter, no grade picker, no grade-based recommendation.

### 3.2 Tiers are the only level concept, and parents cannot touch them

Difficulty inside a curriculum is a **tier index**, stored per child per curriculum at
`Store.data.learn.tiers[cid] = { tier, tierWins, struggle }` (`learning.js:62–67`).

- `pickTierIndex()` (`learning.js:70–78`) uses the child's current tier, and with
  probability `CONFIG.LEARN.reviewChance` (0.2) drops one tier for review.
- `applyRamp()` (`learning.js:543–569`) advances a tier after
  `CONFIG.LEARN.tierUpWins` (12) clean wins and backs off after
  `CONFIG.LEARN.backOffAt` (5) struggle points.
- "super" challenges (Elder Alder, Wren, Rite of Light) pass `boost: 1`, running one
  tier harder (`learning.js:464`).

There is **no parent control over tier**. A parent cannot set a starting level, cannot
lock a level, cannot skip ahead, and cannot see which tier a child is on except
indirectly through `Learning.focusList()` — which is exported but **never called by the
parent UI** (only defined; no caller in `parent.js` or `reports.js`).

### 3.3 Subjects are a hardcoded closed set

`subject` ∈ `{reading, spelling, vocab, bible, quiz, math}`, and the string is switched
on in at least six places:

| File | Subject-string occurrences | What breaks if you add a subject |
|---|---|---|
| `learning.js` | 26 | `itemsOf`, `skillMix`, `getChallenge` dispatch, `buildFallback` |
| `reports.js` | 15 | `SKILL_LABELS` map keyed `"subject/skill"` |
| `parent.js` | 10 | `subjectLabel`, `TYPE_HELP`, `parseLessonSet` |
| `activities.js` / `ui.js` | 1 each | minor |

Adding "Science" or "History" today means editing four files and a label map. There is
no subject registry, no capability declaration ("this subject supports these skills"),
and no way for content to describe how it should be practiced.

A related sharp edge: `Parent.parseLessonSet()` (`parent.js:364`) maps its five paste
formats onto only three subjects — `spelling`, `reading`, `vocab`, plus `bible` for the
verse format and `quiz` for the question format. **A parent pasting poetry or a
catechism into the "Bible verses" format gets content tagged `subject: "bible"`,** which
then flows into Bible weighting and Bible stat buckets. The paste format and the subject
are conflated.

### 3.4 Item normalization and item keys

`itemsOf(cur, tierIdx)` (`learning.js:82–107`) flattens a tier into
`[{ key, ...fields }]` per subject. The `key` is the mastery identity:

| Subject | Key |
|---|---|
| reading / spelling | `word.toLowerCase()` |
| vocab | `pair[0].toLowerCase()` |
| bible / quiz — verse | `"v:" + ref` |
| bible / quiz — fact | `"q:" + q.slice(0,60)` |
| math (generated) | the expression with spaces stripped, e.g. `"7×8"` |
| sentences | `"s:" + text.slice(0,40)` |

Item keys are **scoped by curriculum id** in the mastery tree, so the same word in two
curricula is two independent mastery records. That is defensible, but it means:

- re-importing the same content under a new `cid` silently resets all its mastery;
- there is no cross-curriculum notion of "this child knows the word *because*".

### 3.5 Skills — the genuinely good part

Fourteen distinct skills are tracked, each measuring a different competency:

`hear` · `read` (independent decoding, never speaks the word) · `meaning` ·
`meaningdef` · `sentences` · `spell` · `spot` · `recognize` · `recall` · `verse` ·
`versebuild` · `fact` · `solve` · `speak`

Rendering is dispatched by `ch.kind` in `Activities.present()` (`activities.js:475–493`)
across 15 kinds (`meaning` produces two kinds).

`skillMix()` (`learning.js:159–188`) chooses which skill to practice, weighted by
`skillNeed(subject, skill)` (`learning.js:151–157`), which reads **this week's**
`stats.challenges[subject + "/" + skill]` first-try rate. Untried skills get 1.2;
a weak skill approaches 2.15; a mastered one floors at 0.35.

Note the aggregation level: `skillNeed` is keyed by **subject/skill, not curriculum**.
All reading curricula (grade 2, grade 5, an imported teacher bank) share one
`reading/hear` bucket.

### 3.6 Mastery and adaptive review

Per child, per curriculum, per item, **per skill** (`learning.js:110–116`):

```js
Store.data.learn.mastery[cid][itemKey][skill] = { box, win, miss, last }
```

- `box` is a Leitner box `-1` (unseen) … `5`.
- Correct with zero mistakes → `box + 1`; a mistake → `box − 1` (−2 for ≥3 mistakes)
  (`learning.js:519–530`).
- Selection weight comes from `CONFIG.LEARN.boxWeights = [4,4,2,1,0.5,0.25]`, with
  unseen items at `unseenWeight: 3`, and a **×2 resurfacing bump** for `box ≥ 3` items
  untouched for more than 5 days (`learning.js:118–127`).
- `chooseItem()` (`learning.js:135–146`) deliberately targets a struggling item
  (`miss > win`) with probability `strugglePickChance: 0.45`.

This is a real, working spaced-repetition system with per-skill resolution. It is the
most valuable asset in the codebase and the thing the platform must not lose.

### 3.7 Assignments and subject weighting

`Store.family.assignments[profileId] = [ { cid, weight } ]` (`store.js:22`, `:127–130`).
Weight is an integer 0–5, set in the Parents area by −/+ buttons
(`parent.js:503–507`, `:542–556`). `Learning.activeAssignments()` (`learning.js:55–60`)
filters to `weight > 0` and to curricula that still resolve, then `getChallenge()` picks
one by weighted random (`learning.js:468–470`).

Two structural notes:

- **"Enabled" is not a field.** Disabling a subject means setting weight 0, which
  *deletes the assignment row entirely* (`parent.js:548`). Re-enabling starts at 1 —
  the previous weight is forgotten. There is no `enabled` flag independent of intensity.
- **Weight is the only lever.** There is no per-assignment level, no date range,
  no "practice these 12 words this week", no goal, and no source attribution.

### 3.8 Progress data — what is recorded, and what is not

Recorded, in `Store.data.stats` (`store.js:178–187`):

```js
{
  weekStart, lastReportAt, playMs, daysPlayed[],
  challenges: { "subject/skill": { tries, clean, mistakes } },
  lastChallengeAt,
  lifetime: { challenges, clean, sparks, gathered, built, quests, harvested }
}
```

Plus the mastery tree in `Store.data.learn.mastery` described above.

**Not recorded anywhere:**

- any per-attempt event log — no attempt has a timestamp, a duration, a response
  latency, or a record of what the child actually chose;
- any history or trend — `Stats.rollWeek()` (`store.js:368–375`) **erases**
  `challenges`, `playMs`, and `daysPlayed` after a report is sent. Last week's accuracy
  is gone, not archived;
- per-curriculum weekly accuracy (only per subject/skill);
- session boundaries;
- anything that would let a dashboard draw a line chart.

The only temporal data in the entire system is `mastery[...].last` (a single "most
recent touch" timestamp per item+skill) and `daysPlayed[]` for the current week.

**This is the biggest gap for "view meaningful progress."** Every richer view a parent
dashboard would want — progress over time, this week vs last, time-to-mastery, which
words were missed and when — is not derivable from what is stored, because the raw
events were never kept.

There is also a live bug in the weekly roll: `Reports.send()` calls `Stats.rollWeek()`
on success (`reports.js:148–152`), which touches **only the currently loaded child**,
even though `buildTextReport()` covers the whole family (`reports.js:94–107`). Siblings'
weekly windows never reset, so their "this week" numbers accumulate indefinitely.

---

## 4. The parent interface today

`js/parent.js` (691 lines) renders a four-tab dashboard into the game's own modal
overlay (`#overlay-card`), opened by press-and-hold, optionally PIN-gated
(`parent.js:56–101`).

| Tab | Capability |
|---|---|
| 👧 Explorers | list children, per-child progress view, reset progress, remove child, add child |
| 📚 Lessons | list all curricula (built-in + custom), create a set by pasting a list in one of five formats, delete a custom set |
| 🎯 Assignments | per child: subject weights 0–5; question pacing (0–30 min, per child, "apply to all") |
| 📬 Reports & Settings | report email recipients, send now, on-screen report preview, JSON export/restore, parent PIN |

The per-child progress view (`parent.js:247–301`) shows: time this week, days played,
level and sparks, assigned lessons with weights, a first-try accuracy table by
subject/skill, "needs review" items, "going strong" items, and lifetime counters.

### 4.1 Limitations, in rough order of importance

1. **It is not a separate application.** It lives inside the game document, depends on
   `UI.openOverlay`, `Controls.setEnabled`, `GameAudio`, and calls `Game.running` /
   `Game.stop()` (`parent.js:218`). It cannot be served as a standalone web page
   without the game, three.js, and the whole global load order.
2. **It is device-local.** A parent must physically hold the child's iPad. There is no
   way to look at progress from a phone or laptop.
3. **No grade or level control** — see §2.2 and §3.2. A parent can change *how often* a
   subject appears, never *what level* it runs at.
4. **No enable/disable** distinct from weight (§3.7).
5. **No content editing.** Custom sets are create-and-delete only; there is no edit
   path, so fixing one typo in a 30-word list means retyping the list. Built-in content
   cannot be edited, subsetted, or reordered at all.
6. **Progress is a snapshot, never a trend** (§3.8).
7. **Weight semantics are opaque.** "Weight 3" has no unit. The dashboard cannot answer
   "how many reading questions will my child see today?"
8. **Reports are one-shot and destructive.** Sending rolls the week (and only for one
   child, per the bug above).
9. **No multi-parent, no roles, no audit.** The PIN is a single shared secret with no
   lockout, no rate limit, and no recovery.
10. **The dashboard cannot represent content it did not create.** There is no concept of
    a source, a publisher, a version, or an import — everything is either `custom: true`
    (this household typed it) or built in.

---

## 5. Persistence, and exactly what is local-only

### 5.1 The storage surface — complete

Everything the application persists lives in `localStorage`, in three key patterns:

| Key | Written by | Contents |
|---|---|---|
| `lumen_family_v1` | `Store.saveFamily()` `store.js:50` | profiles, custom curricula, assignments, all parent settings (PIN, emails, pacing) |
| `lumen_save_v1_<profileId>` | `Store.save()` / `saveNow()` `store.js:244`, `:252` | one child's entire save: player, inventory, tools, world state per isle, quests, **mastery**, **stats** |
| `lumen_last_player` | `ui.js:887` | dead write, never read |

That is the whole persistence layer. **There is no IndexedDB, no service worker, no
cache API, no cookie, no session storage, and no server-side state of any kind.**

### 5.2 What "local-only" means concretely

- Progress exists on exactly one browser profile on one device. Safari on the iPad and
  Chrome on the same iPad are two separate universes.
- Clearing website data, or iOS evicting storage for an infrequently used site,
  destroys everything. The mitigation is manual: `Store.exportAll()` /
  `importAll()` (`store.js:290–312`) produce and consume a single JSON bundle
  (`{app:"lumen-isles", exportedAt, family, saves:{profileId: save}}`) via a download
  link and a file input in the Parents area.
- There is no sync, no conflict resolution, no last-write-wins, no revision counter,
  and no device identity. Two devices cannot be reconciled; restoring a backup is a
  **total overwrite** of `family` and of every save it contains (`store.js:299–309`).
- Saves are debounced writes of the whole blob: `save()` at 250 ms, `saveFamily()` at
  200 ms, plus `saveNow()` on stop and on `visibilitychange`.

### 5.3 Migration handling is fragile

Both loaders validate an exact version and **silently fall through to a fresh object on
anything else**:

- `store.js:42` — `if (pf && pf.version === 1) { … }` — a family blob with `version: 2`
  is discarded; the in-memory `family` stays fresh and the next `saveFamily()`
  overwrites the real data.
- `store.js:235–236` — `version === 2` merges, `version === 1` migrates via
  `migrateV1()`, **anything else leaves `data` as `freshData()`** and the next `save()`
  destroys the original.

`deepMergeDefaults()` (`store.js:216–225`) makes *additive* schema changes safe (new
fields appear with defaults), which is how `stats.lastChallengeAt` and the pacing
settings were added without a migration. But there is no forward-compatibility story,
no migration ladder, and no backup-before-migrate. **Any version bump made without a
matching migration branch is silent, total data loss.**

### 5.4 Identity generation is not collision-safe for a networked world

- Profiles: `"p" + Date.now().toString(36) + random4` (`store.js:58`).
- Custom curricula: `"c" + Date.now().toString(36)` (`store.js:142`) — **no random
  component at all.** Two lesson sets created in the same millisecond collide locally;
  across devices, collisions are near-certain the moment content moves between
  households.

Any content that will be published, shared by code, or imported needs globally unique,
stable identity. Neither generator provides it.

---

## 6. Backend and cloud: what exists vs. what is stubbed

### 6.1 What exists

**Exactly one outbound network call in the entire application** (`reports.js:158`):

```js
fetch("https://formsubmit.co/ajax/" + email, { method: "POST", body: {…, message: report} })
```

`Reports.send()` POSTs a plaintext weekly family report to formsubmit.co, a free email
relay, once per configured recipient address. `Reports.maybeAutoSend()`
(`reports.js:178–184`) fires this on `Game.start()` when
`Date.now() - lastReportAt > reportDays * 24h`.

Properties worth stating plainly:

- No authentication, no API key, no account. Anyone who knows the endpoint shape can
  post to it.
- The payload contains **child first names, level, minutes played, days played,
  first-try accuracy by skill, and a list of words/verses each child is missing** — sent
  in cleartext form (over TLS) to a third-party relay that is not under our control and
  has no data-processing agreement with the family.
- Delivery is fire-and-forget; the only feedback is `response.ok`.
- On success it triggers `Stats.rollWeek()`, so a *successful send is destructive* to
  the week's data.

### 6.2 What is stubbed or merely gestured at

| Thing | Status |
|---|---|
| `CONFIG.REPORT.endpoints: []` (`config.js:80`) | an empty array of extra POST URLs, joined in `Reports.targets()` (`reports.js:128–136`). This is the only intentional "plug in your own backend" seam. |
| "clean seam for future cloud sync" (`store.js:3–5`) | aspirational comment. `exportAll`/`importAll` are the seam, and they are whole-bundle replace, not sync. |
| Auth / accounts | none |
| Device or install identity | none |
| Server-side content | none |
| Sharing, codes, invitations | none |
| Telemetry / analytics | none — and deliberately so |

### 6.3 What the privacy posture is today (and why it is worth preserving)

The application collects a first name, an emoji, and an age band. It has no chat, no
ads, no third-party analytics, no location, and no external calls except the parent-
initiated report. Any platform work should treat this as a **product constraint to
defend**, not an accident to be normalized away when a backend arrives.

---

## 7. What must change

### 7.1 For a parent web dashboard

The requested capabilities and what each actually requires:

#### (a) Select a child's grade

**Today:** impossible. `band` has two values, is write-once, and is read exactly once
(§2.2).

**Needs:**
- a real academic-level field on the child, expressive enough for the domain
  (K–12 plus non-grade-level markers like "pre-reader" or "intro");
- that field must be *advisory* — the default from which per-subject levels are seeded —
  not a hard gate, or you re-create the two-band trap at higher resolution;
- an explicit "start of year / advance" action, because a grade that can never change
  is the same bug with more values.

#### (b) Independently select each subject's grade/level

**Today:** impossible in two separate ways. There is no per-subject level field, and
tier is machine-controlled with no parent access (§3.2).

**Needs:**
- the assignment row must grow from `{cid, weight}` into something carrying a level
  (shape, not schema): `{ contentRef, enabled, weight, level, levelPolicy, source }`;
- `levelPolicy` matters more than `level`: parents will want *adaptive* (today's
  behavior), *fixed* (hold here), and *floor* (never drop below) — and the ramp in
  `applyRamp()` must consult it instead of always ramping;
- curricula need a declared level scale so a UI can offer meaningful choices. Right now
  a tier is just an index with a whimsical name ("Sunrise Words", "Bloom Words"); the
  `grade` field exists but is unused and inconsistent (`"2"`, `"all"`, `"intro"`,
  `"1-5"`);
- deciding whether "grade" selects *which curriculum* (reading2 vs reading5) or *which
  tier within one* is a modeling fork, not a detail — see §11.

#### (c) Enable/disable subjects

**Today:** conflated with weight 0, which deletes the row and forgets the setting (§3.7).

**Needs:** an `enabled` boolean orthogonal to `weight`, so disabling preserves level,
weight, and mastery, and re-enabling resumes exactly where it left off.

#### (d) Adjust curriculum/content

**Today:** create and delete only; built-ins are immutable and un-subsettable (§4.1.5).

**Needs:**
- an edit path for household content (which implies content revisions, because a child
  may have mastery against the old version);
- the ability to *derive* from built-ins — "Reading Grade 2 minus these 8 words",
  "these 15 words only this week" — without copying the whole set, which today would
  fork mastery under a new `cid`;
- a stable item identity independent of the containing set, so editing a set does not
  orphan mastery. Today `mastery[cid][itemKey]` couples the two.

#### (e) Add custom curricula / question banks

**Today:** works, but only from paste-a-list, only into five formats, only stored inside
`family.custom`, with a collision-prone id (§5.4), and with format conflated with
subject (§3.3).

**Needs:** separating *content* from *the household's copy of content*; a content
record that can originate elsewhere (a teacher, a marketplace, another parent) and
still be referenced by an assignment.

#### (f) View meaningful progress

**Today:** a snapshot with no history, destroyed weekly (§3.8).

**Needs — and this is the load-bearing one:**
- **an append-only attempt/event record.** Every challenge presented and answered should
  produce a durable event (child, content ref, item, skill, correct, mistakes, when,
  how long, and the surface it happened on). Everything else — trends, streaks, time on
  task, per-subject weekly comparisons, "which words are stuck" — is a projection over
  that log. Aggregates like `stats.challenges` should become *derived caches*, not the
  system of record;
- weekly rolls must **archive**, not erase;
- per-curriculum (not just per-subject) aggregation;
- the family-wide roll bug (§3.8) fixed as part of the change.

Adding the event log is the single highest-leverage change in this document. It is also
the one that is *cheapest now and most expensive later*, because every day without it is
a day of history that can never be reconstructed.

#### (g) Cross-cutting requirements for any web dashboard

- **A network-addressable data model.** A dashboard on a laptop cannot read the iPad's
  localStorage. This is the point where a backend stops being optional.
- **Adult identity and auth.** A parent web dashboard needs a real account. Today the
  only adult concept is a 4-digit PIN on the device (§2.4).
- **A parent surface extracted from the game document.** `parent.js` must become an
  application that can render against a data adapter (local or remote), not a modal
  inside the game (§4.1.1).
- **Sync with conflict handling.** The child plays offline on an iPad; the parent edits
  assignments on a laptop. Two writers, one dataset. Today `importAll()` is a total
  overwrite and there is no revision counter to build on.

### 7.2 For a V1 Classroom module

The requested flow — *teacher creates content → shares code → parent explicitly imports →
child practices in Lumen Isles* — is architecturally friendly, because it is one-way and
because the payload (a question bank) is small and immutable-ish. The obstacles are
mostly identity and reuse, not data flow.

#### (a) Create/manage question banks

**Today:** `Parent.parseLessonSet()` (`parent.js:364–412`) is the only authoring tool: a
name, one of five paste formats, and a textarea. It produces a single-tier curriculum.

**Needs for a teacher-grade tool:** multi-item editing, validation and preview,
duplicate detection, tiers or none, versioning, and a durable id. Roughly: the existing
parser is a good *importer* and a poor *editor*, and it should be extracted from
`parent.js` into shared content tooling either way — a teacher and a parent should not
have two divergent parsers for "paste a spelling list".

#### (b) Run questions in a teacher-led classroom review mode

This is the most interesting technical requirement, because it is the first time the
learning system must run **without a child profile and without the game**.

What blocks it today:

- `Learning.getChallenge()` requires `Store.profile`, `Store.data.learn`, and
  `Store.data.stats` — it selects, weights, and schedules against **one child's mastery**
  (`learning.js:461–508`). A classroom has 20 children and no loaded save.
- `Learning.report()` writes mastery, calls `Stats.recordChallenge()`, and then calls
  `Game.notifyEdu()` / `Game.pipSteal()` (`learning.js:516–541`). In a classroom there
  is no game to notify.
- `applyRamp()` calls `UI.toast()` (`learning.js:557`, `:566`).
- `Activities.present()` is nearly clean — it needs only `UI.openOverlay`,
  `UI.closeOverlay`, and `GameAudio` (§1.2). **This is the reuse seam.** A classroom
  review mode can render the exact same activities the child sees at home, which is a
  real product advantage, if `Activities` is extracted with a small host interface
  instead of the `UI` global.

What a V1 classroom mode actually needs:

- a **selection mode** that is not mastery-driven: sequential, shuffled, or
  teacher-stepped through a bank, with no per-child state;
- a **presentation mode** suited to a projector (large type, no per-child audio
  autoplay, reveal-on-teacher-tap rather than tap-to-answer);
- an explicit decision that **classroom answers are not recorded as anyone's mastery**
  (V1), which keeps the one-way data promise honest and avoids the "whose progress is
  this?" question entirely.

The cleanest framing: introduce a **practice session** abstraction that both surfaces
implement — `{ source of items, selection strategy, who is answering (or nobody), where
results go (or nowhere) }`. The game's adaptive-scheduler behavior becomes one strategy;
teacher-led review becomes another. `Learning` today hardcodes exactly one.

#### (c) Publish a question bank

**Needs:** a content record with a globally unique id, a version, a publisher, a
visibility state (draft/published/unlisted), and immutability of published versions
(so a parent who imported v1 keeps working when the teacher edits into v2).

Today none of these exist: content is a plain object in an array in a household's
localStorage, with an id generated from a millisecond timestamp (§5.4).

#### (d) Share code + QR code

**Needs:** a short, human-typeable, non-guessable code (family-friendly alphabet — no
`0/O`, `1/l/I`) that resolves to a published bank version; an expiry/revocation story;
and a QR code that encodes a URL carrying the same code.

Implications for the client: QR *scanning* on iPad Safari means `getUserMedia` and a
decoder (or the camera app opening a deep link). The current app has **no camera
permission usage and no deep-link/route handling at all** — `index.html` is a single
page with no router and no URL parameter reading. Deep-link import (`/import/ABC-123`)
is the lower-friction path and needs routing that does not exist yet.

#### (e) Parent enters/scans the code and adds the bank

**Needs on the parent side:**

- an **import record** distinct from the content itself (shape, not schema):
  `{ contentId, version, publisherId, publisherName, importedAt, importedBy, scope }`;
- explicit assignment as a separate step — importing a bank should not silently start
  quizzing a child. The parent chooses which child, what weight, what level;
- provenance visible in the UI: "Mrs. Patel · Week 12 Spelling · imported Mar 3" must be
  distinguishable from a household-typed list, because the parent's trust decision and
  their ability to remove it depend on knowing where it came from;
- a **removal** path that detaches the content without destroying the child's mastery
  against it (see §8).

The one-way V1 flow is genuinely simpler than it looks, on one condition: **the teacher's
bank must be referenced, not copied.** If the import deep-copies the bank into
`family.custom` with a fresh local id (which is what today's code would naturally do),
then the teacher's content has no stable identity in the household, version updates are
impossible, and any future progress-sharing feature has nothing to correlate on.

---

## 8. Leaving room for optional teacher progress sharing

V1 is one-way and should stay one-way. The goal is to avoid building anything that would
have to be *torn out* to add opt-in sharing later. Four decisions do almost all the work:

1. **Global content identity, from day one.** Every attempt event should reference a
   stable `contentId` + `version` + `itemKey`, not a household-local `cid`. If progress
   is recorded against `c_m8x2k1` — a timestamp id that means nothing outside one iPad —
   then no amount of later consent plumbing can tell a teacher how the class did on
   *their* bank. This costs almost nothing now and is unrecoverable later.

2. **An attempt event log with a `source` and a `surface`.** Each event should already
   know *which content it came from* and *where it happened* (home game, classroom
   review, dashboard practice). Sharing then becomes a filter over an existing log —
   "events for content published by teacher T, for children whose guardian consented" —
   rather than a new data pipeline.

3. **Consent as a first-class record, defaulted off.** A grant should be its own entity
   (shape, not schema): `{ childId, granteeId, scope, grantedBy, grantedAt, revokedAt }`,
   with `scope` narrow enough to be meaningful — e.g. *aggregate only*, *this content
   only*, *this term only*. Building the consent record now (even if nothing reads it)
   means the later feature is a read path, not a migration. Consent must be revocable,
   and revocation must be enforced at read time, not by deleting data.

4. **Never let the teacher platform hold child records it does not need.** In V1 the
   teacher platform should know about *content*, *publishers*, and *share codes* — and
   nothing about children. If it later receives shared progress, it should receive a
   pseudonymous participant handle scoped to that teacher, not a child's identity from
   the household side. Designing the boundary that way now means "add sharing" never
   becomes "now the teacher database has children in it".

A useful test for any V1 decision: *if we shipped opt-in sharing 18 months from now,
would this choice force a migration?* Content identity and the event log are the two
places where the answer is yes.

---

## 9. The cleanest boundaries

Four systems, plus the shared layer that makes them coherent. The dividing question for
each boundary is **who owns the data and who is allowed to write it.**

### 9.1 Lumen Isles game client

**Owns:** the world, controls, rendering, physics, building, creatures, quests, the
reward economy (XP, sparks, levels, tools, isles), and the *game* portion of a child's
save.

**Consumes:** a practice session from the learning runtime; the child's assignment
configuration, read-only.

**Must not own:** curriculum content, assignment configuration, mastery semantics, or
progress reporting.

**The specific split to make:** today one localStorage blob holds both
`player/inventory/isles/quests` (pure game) and `learn/stats` (pure learning), and
`Store.reset(pid)` (`store.js:257–262`) destroys both together. **A parent who wants to
restart the adventure should not lose a year of reading mastery, and a child who
finishes a curriculum should not lose their house.** Splitting *game save* from
*learning record* is a small change today and a painful one after cloud sync exists.

The reward coupling can stay — the game deciding "a correct wonderstone answer is worth
2 sparks" is exactly the right kind of coupling, as long as it flows one way: the
learning runtime reports an outcome, the game decides what that is worth.

### 9.2 Parent / Home platform

**Owns:** the household — children, adult accounts and roles, enrollment (which content
at which level with what weight), imports and their provenance, consent grants, pacing
and other guardrails, backups, and progress views.

**Consumes:** content from the shared registry; progress projections from the shared
services.

**Surfaces:** the on-device Parents area (offline-capable, PIN-gated) and the web
dashboard. **These should be one application against two data adapters**, not two
codebases — the current `parent.js` is already close to this shape, since its render
functions are pure string builders over `Store`.

**Boundary rule:** the Parent platform is the *only* writer of enrollment and consent.
The game never writes an assignment; the classroom platform never writes into a
household. Everything the classroom offers arrives as a proposal the parent accepts.

### 9.3 Classroom / Teacher platform

**Owns:** teacher accounts, bank authoring and versioning, publication state, share
codes, and classroom session state (which bank, which question, is the answer revealed).

**Consumes:** the shared content model and the shared activity renderers.

**Must not own (V1):** children, households, enrollment, or progress. This is the
constraint that makes V1 tractable and the later sharing feature safe.

**Boundary rule:** the only thing that crosses from Classroom to Home is a
*published content version, addressed by a code, pulled by a parent.* No push, no
notification into a household, no teacher-initiated assignment.

### 9.4 Shared learning / content / backend services

The layer both platforms sit on. Four distinguishable concerns:

1. **Content model and registry** — what a curriculum, tier, item, and question bank
   *are*; identity, versioning, publication, and lookup by id or share code. Both
   platforms author into it; the game only reads.
2. **Learning runtime** (pure, embeddable, no DOM, no globals) — item normalization,
   skill mix, mastery/Leitner scheduling, selection strategies, challenge construction.
   Today this is `learning.js` with three edges to `UI`/`Game` that must be inverted
   into callbacks (§1.2).
3. **Activity renderers** — `activities.js` plus its CSS, hosted by a small interface
   (open a surface, close it, speak). Shared by the game, the classroom projector view,
   and any dashboard practice mode.
4. **Progress services** — the attempt event log, its projections, and consent-scoped
   read paths.

**A concrete near-term shape:** `config.js` (no deps) and `activities.js` (three thin
deps) are already extractable. `learning.js` needs the `UI.toast` and
`Game.notifyEdu/pipSteal` calls replaced by emitted events the host subscribes to.
`store.js` needs to be split along the game-save / learning-record / household seam.
That sequence — extract, invert, split — is doable without touching gameplay, and it is
the prerequisite for everything else in this document.

---

## 10. Technical debt and blocking assumptions

This audit was asked to check six specific assumptions. All six are present. Each is
listed with its exact location and its blast radius.

### 10.1 "Only two age bands"

**Confirmed.** `band ∈ {younger, older}` (`ui.js:930–933`, `store.js:62–76`), used once
at profile creation and never again. There is no grade on a child and no level on a
subject.

**Blast radius:** blocks dashboard requirements (a) and (b) entirely. Also means the
existing built-in content is stranded — `reading2` and `reading5` with nothing in
between and no path to grades 1, 3, 4, or 6+.

### 10.2 "Curriculum belongs directly to a player"

**Partly true, and in a slightly worse way than it sounds.** Assignments are keyed by
profile id in the family blob (`family.assignments[profileId]`), which is correct. But:

- **mastery is keyed by `cid`** inside the child's save, so content identity and
  progress identity are welded together (§3.4);
- **custom content lives inside the household blob** (`family.custom`), so content and
  household are welded together;
- there is no content record that exists independently of a household, which is exactly
  what publishing requires.

**Blast radius:** re-importing the same content under a new id silently resets mastery;
teacher banks cannot be versioned; deleting a curriculum orphans its mastery tree
forever with no cleanup (`removeCustomCurriculum` at `store.js:148–156` drops the
assignments but leaves `learn.mastery[cid]` in every child's save).

### 10.3 "Everything lives on one device"

**Confirmed, absolutely.** Three localStorage keys, one outbound `fetch`, no auth, no
device id, no revision counters, no sync (§5).

**Blast radius:** the web dashboard is not an incremental feature; it is the point where
a backend, an identity system, and a sync model all become required at once. This is the
largest single piece of work implied by the request.

### 10.4 "Parents are the only adult role"

**Confirmed, and understated** — there is no adult *entity* at all, only a PIN
(§2.4). There is no user record, no email as identity, no roles, no permissions, no
multi-parent household, no co-parent across two homes, and no tutor or grandparent.

**Blast radius:** teacher is not a variant of an existing role; the entire notion of an
authenticated adult must be introduced. Doing that once, generically (adult identity +
role + scoped grants), is far cheaper than adding "parent accounts" and later bolting on
"teacher accounts".

### 10.5 "Content is built-in or household-created only"

**Confirmed.** `Store.allCurricula()` is literally
`BUILTIN_CURRICULA.concat(family.custom)` (`store.js:133–135`), and the only provenance
marker is the boolean `custom: true`, surfaced as a "custom"/"built-in" tag
(`parent.js:321`).

**Blast radius:** there is nowhere to record a publisher, a version, an import date, or
a trust decision. Content provenance is a two-state enum that needs to become a record.
Also blocks any future "remove this teacher's bank but keep the mastery" behavior.

### 10.6 "Progress and game saves are inseparable"

**Confirmed, at the storage level.** One `lumen_save_v1_<pid>` blob holds
`player`, `elder`, `tinker`, `learn` (mastery), `isles` (world state), `quests`, and
`stats`. `Store.reset(pid)` deletes the whole key (`store.js:257–262`); the Parents area
labels this "Reset progress" (`parent.js:224–228`), which destroys a year of mastery
along with the child's house.

**Blast radius:** blocks independent sync cadence (world state is large and low-value to
sync; mastery is small and high-value), blocks "start a fresh adventure, keep your
learning", and makes any future server-side progress store awkward because it would
have to carry voxel-ish world data it does not care about.

### 10.7 Additional debt found during the audit

| # | Issue | Location | Severity |
|---|---|---|---|
| 1 | **No attempt event log.** Only aggregates; `rollWeek()` erases the week. No history is recoverable. | `store.js:368–375` | **High** — every day without it is unrecoverable history |
| 2 | **Silent data loss on unknown save versions.** Unrecognized `version` → fresh object → next write destroys the original. | `store.js:42`, `:235–236` | **High** |
| 3 | **Custom curriculum ids have no random component.** `"c" + Date.now().toString(36)`. | `store.js:142` | **High** once content moves between devices |
| 4 | **`rollWeek()` rolls only the active child** though the report covers the family. Siblings' weekly stats never reset. | `reports.js:148–152` | Medium — live bug today |
| 5 | **Orphaned mastery.** Deleting a curriculum leaves `learn.mastery[cid]` in every save forever; `needsReview()` then renders the raw cid. | `store.js:148–156`, `learning.js:584–608` | Medium |
| 6 | **Weekly stats are keyed `subject/skill`, not per curriculum,** so all reading content shares one bucket — and `skillNeed()` adapts on that merged number. | `store.js:342`, `learning.js:151–157` | Medium — worsens as content sources multiply |
| 7 | **Learning depends on UI and Game.** `UI.toast` on ramp; `Game.notifyEdu`/`pipSteal` on report. Cannot run headless. | `learning.js:538–539`, `:557`, `:566` | Medium — blocks classroom reuse |
| 8 | **Reports depend on UI.** `UI.rankFor` inside report generation. | `reports.js:54` | Low |
| 9 | **Third-party plaintext report relay.** Child names + performance to formsubmit.co, unauthenticated. | `reports.js:158` | Medium — a real privacy decision, currently made by default |
| 10 | **Parse format and subject are conflated.** "Bible verses" paste → `subject: "bible"`, so poetry or catechism lands in Bible weighting and Bible stats. | `parent.js:398–404` (bible branch) | Medium |
| 11 | **Subject is a hardcoded closed set** switched on in 4 files (53 occurrences). No subject registry or capability declaration. | `learning.js`, `reports.js`, `parent.js`, `activities.js` | Medium |
| 12 | **No content editing.** Custom sets are create/delete only; built-ins are immutable and un-subsettable. | `parent.js:316–465` | Medium |
| 13 | **`Learning.focusList()` is exported but never called.** Tier/focus info exists and is invisible to parents. | `learning.js:572–582` | Low — free win |
| 14 | **Dead write:** `lumen_last_player` is set on every profile selection and never read. | `ui.js:887` | Low |
| 15 | **No routing, no URL parameters, no deep links.** Single page, no router — blocks share-code deep links. | `index.html` | Medium for Classroom |
| 16 | **No tests in the repository.** All verification suites live outside the tree. | — | **High** for a refactor of this size |
| 17 | **PIN has no lockout, no rate limit, no recovery,** and is stored in cleartext in localStorage alongside the data it protects. | `store.js:25`, `parent.js:69–101` | Low today, Medium once accounts exist |
| 18 | **All timestamps are client clock.** Pacing has a forward-clock guard (`learning.js:642–646`); mastery `last` and `weekStart` do not. | throughout | Low now, Medium with sync |

---

## 11. Decisions Fable Should Make

Only the choices that genuinely fork the architecture. Everything else in this document
follows from these.

1. **Does "grade" select a curriculum, or a level within one?**
   Whether `reading2`/`reading5` remain separate curricula that a grade *picks between*,
   or collapse into one `reading` curriculum whose tiers *are* the grades, determines the
   content model, the parent UI, how mastery carries across a year boundary, and what a
   teacher's published bank actually is. This is the first fork; most of §7.1 depends on it.

2. **Is the attempt event log built now or later?**
   It is the prerequisite for every "meaningful progress" view and for any future teacher
   sharing, and it is the one decision that is strictly cheaper today — history not
   recorded is history that cannot be recovered. If yes, decide now whether the log is
   local-first with later upload, or whether it waits for the backend.

3. **What is the unit of content identity, and who mints it?**
   Household-local ids cannot be published or versioned (§5.4, §8.1). Deciding that every
   curriculum, item, and question bank carries a globally unique, stable id — and whether
   ids can be minted offline — sets whether V1 Classroom is a genuine foundation or a
   feature that must be rebuilt when sharing arrives.

4. **One adult identity model, or two?**
   Introducing "parent account" and "teacher account" as separate concepts is the most
   likely long-term regret. Deciding up front on a single adult identity with roles and
   scoped grants (guardian-of-child, publisher-of-content, and later grantee-of-progress)
   costs little now and is very expensive to retrofit.

5. **Where does the boundary between game save and learning record fall, and does the
   game keep its own store?**
   Splitting them (§9.1) enables independent sync cadence, "reset the adventure, keep the
   learning", and a server-side progress store that carries no world data. Doing it before
   sync exists is a small refactor; after, it is a migration of every household.

6. **Does the teacher's bank get copied into the household, or referenced?**
   Copy is simpler and matches today's code; reference is what makes versioning,
   provenance, revocation, and future progress correlation possible. This is the decision
   that most determines whether V1 Classroom is throwaway.

7. **Does classroom review mode record anything at all?**
   Recording nothing keeps the one-way promise airtight and avoids "whose progress is
   this?" entirely. Recording anonymously into the teacher's own space is more useful and
   opens a consent question immediately. Choose deliberately — it is much harder to start
   recording later than to stop.

8. **What replaces formsubmit.co, and when?**
   The current report path sends child names and performance data in cleartext to an
   unauthenticated third-party relay (§6.1, §10.7-9). Once a backend exists this should
   move; deciding whether email reports become a backend responsibility or are retired in
   favor of the dashboard affects what the Parent platform must own.

9. **Offline-first, or online-first with an offline cache?**
   The child plays on an iPad that may have no network. The parent edits on a laptop that
   does. Which side is authoritative — and what happens when both write — is a sync-model
   decision that shapes the data layer far more than the choice of backend vendor.

10. **Is a subject registry worth introducing now?**
    Subjects are hardcoded across four files (§10.7-11). Making subjects data — declaring
    which skills and activity kinds each supports — is what allows Science, History, or a
    teacher's arbitrary bank to exist without editing the engine. The alternative is to
    accept a fixed subject list as a product constraint and say so explicitly.
