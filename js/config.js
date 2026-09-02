"use strict";
/* ============================================================
   LUMEN ISLES — CONFIG
   Every important tuning value and every piece of branding
   lives here so the game can be re-balanced (or renamed)
   without touching game code.
   ============================================================ */
var CONFIG = {

  /* -------- branding (working name — easy to swap) -------- */
  BRAND: {
    name: "Lumen Isles",
    tagline: "Explore. Build. Shine.",
    icon: "✨",
    // Bump this on every build you send to a device. It shows on the home
    // screen and in the pause menu so you always know what's running.
    version: "2.2.1",
    built: "2026-09-02",
    currencyName: "sparks",
    currencyIcon: "✨",
    playerTitle: "Keeper"           // what the child is called in-world
  },

  /* -------- movement & physics (proven values from v1) -------- */
  MOVE: {
    speed: 4.2,                     // walk speed, blocks/sec
    jump: 7.6,                      // jump velocity
    gravity: 21,
    waterSpeedMul: 0.55,
    lookSensitivity: 0.0042,
    joyRadius: 55,                  // touch joystick radius (px)
    reach: 6,                       // interact distance (blocks)
    // Cloudcap glider: hold ⬆️ while falling
    glideFallSpeed: 1.7,            // max descent while gliding (blocks/sec)
    glideSpeedMul: 1.45             // horizontal boost while gliding
  },

  /* -------- progression & rewards -------- */
  REWARDS: {
    gatherXP: 1,                    // XP per block gathered
    wonderstoneSparks: 2, wonderstoneXP: 12,
    chestSparks: 3, chestXP: 15,
    questSparks: 3, questXP: 25,
    superSparks: 3, superXP: 25,
    starfallSparks: 2, starfallXP: 10,
    creatureXP: 3,
    harvestXP: 4,
    // XP needed for level n: base + a*n + b*n^2 (quadratic like v1)
    xpBase: 60, xpLinear: 30, xpQuad: 10
  },

  /* -------- grades & subjects (the parent's setup screen) --------
     A child has one grade; each graded subject gets its own lesson set,
     "<subject>-<grade>" (reading-3, spelling-3, math-3), seeded from the
     child's grade and overridable per subject. Non-graded subjects are a
     single set switched on or off. -------- */
  GRADES: ["K", "1", "2", "3", "4", "5"],
  GRADE_LABELS: { K: "Kindergarten", "1": "1st grade", "2": "2nd grade", "3": "3rd grade", "4": "4th grade", "5": "5th grade" },
  SUBJECTS: [
    { id: "reading",  label: "Reading",  icon: "📖", graded: true,  weight: 3, defaultOn: true },
    { id: "spelling", label: "Spelling", icon: "✏️", graded: true,  weight: 3, defaultOn: true },
    { id: "math",     label: "Math",     icon: "🔢", graded: true,  weight: 2, defaultOn: true },
    { id: "bible",    label: "Bible",    icon: "📜", cid: "bible1", weight: 2, defaultOn: true,  note: "all ages" },
    { id: "latin",    label: "Latin",    icon: "🏛️", cid: "latin1", weight: 1, defaultOn: false, note: "intro" }
  ],
  DEFAULT_GRADE: "2",               // what a child gets who skips the grown-up step

  /* -------- learning: adaptive difficulty tuning -------- */
  LEARN: {
    tierUpWins: 12,                 // clean wins before a tier ramps up
    reviewChance: 0.2,              // fraction of challenges that review older material
    backOffAt: 5,                   // struggle points before difficulty steps back
    starfallMinutes: 5,             // minutes without learning before a Starfall rolls in
    // mastery boxes 0..5 -> how often an item is chosen (higher = more often)
    boxWeights: [4, 4, 2, 1, 0.5, 0.25],
    unseenWeight: 3,                // weight of never-tried items
    strugglePickChance: 0.45,       // chance a challenge deliberately targets a weak item
    choicesEasy: 3, choicesHard: 4, // answer-option counts
    // Minimum minutes between challenges, out of the box. Parents change
    // this per child in the Parents area (Assignments tab); children can't.
    defaultPaceMinutes: 0,          // 0 = no enforced gap
    paceChoices: [0, 1, 2, 3, 5, 8, 10, 15, 20, 30],
    // clean wins at the TOP tier of a grade set before the Parents area
    // suggests moving up a grade. Promotion is always a parent's tap.
    promoteWins: 10
  },

  /* -------- speech: how the teacher voice says things --------
     Single letters are the weak spot in every browser speech engine. A bare
     "a" is read as the article ("uh"), and the obvious respelling "ay" comes
     out as "eye" on some voices. So every letter gets an explicit respelling
     using a word the engine cannot mistake.

     Voices genuinely disagree, and we cannot hear what a given iPad does, so
     `letterAlts` holds other spellings a parent can pick from in
     Parents → Reports & Settings → Voice check. Their choice is saved on that
     device only (a different iPad may have a different voice). -------- */
  SPEECH: {
    letterRate: 0.85,
    letters: {
      a: "ay",  b: "bee", c: "see", d: "dee", e: "ee",   f: "eff",
      g: "jee", h: "aitch", i: "eye", j: "jay", k: "kay", l: "ell",
      m: "em",  n: "en",  o: "oh",  p: "pee", q: "cue",  r: "ar",
      s: "ess", t: "tee", u: "you", v: "vee", w: "double you",
      x: "ex",  y: "why", z: "zee"
    },
    // ambiguous ones only — the letters where engines disagree
    letterAlts: {
      a: ["ay", "eigh", "ayy", "A"],
      e: ["ee", "eee", "E"],
      g: ["jee", "gee", "G"],
      h: ["aitch", "haitch", "H"],
      i: ["eye", "i", "I"],
      r: ["ar", "are", "R"],
      u: ["you", "yoo", "U"],
      w: ["double you", "double-u", "W"],
      y: ["why", "wye", "Y"],
      z: ["zee", "zed", "Z"]
    },
    // spoken in the Voice check screen so a parent can hear what their device
    // does with the words most likely to come out wrong
    checkWords: ["read", "live", "bow", "wind", "tear", "lead", "close",
                 "minute", "aqua", "terra", "Bethlehem", "Nazareth"]
  },

  /* -------- world / creature pacing -------- */
  WORLD: {
    creatureMax: 12,
    creatureRespawnSec: 40,
    cropGrowSec: 90,                // seconds per crop growth stage
    berryRegrowSec: 75,             // picked berry bushes regrow
    fireflyCount: 24                // ambient glow motes
  },

  /* -------- Pip the fox (comic relief thief) -------- */
  PIP: {
    stealCooldownMs: 120000,
    stealAfterMistakes: 3           // a really rough challenge tempts Pip
  },

  /* -------- parent reports -------- */
  REPORT: {
    everyDays: 7,
    endpoints: []                   // optional extra POST endpoints (Formspree-style)
  }
};
