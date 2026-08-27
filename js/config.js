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
    version: "2.0.3",
    built: "2026-08-27",
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
    reach: 6                        // interact distance (blocks)
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
    choicesEasy: 3, choicesHard: 4  // answer-option counts
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
