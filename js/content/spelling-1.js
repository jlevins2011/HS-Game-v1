"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — SPELLING, GRADE 1 (original content)
   The phonics ladder in four steps: doubled endings, blends,
   digraphs, silent e. Activities: spot and spell.
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "spelling-1", name: "Spelling · Grade 1", subject: "spelling", grade: "1",
  icon: "✏️",
  desc: "Short vowels with doubled endings, blends, sh/ch/th words, and silent e.",
  tiers: [
    {
      name: "Double Ending Words",
      focus: "short vowels with -ll, -ss, -ff, -zz endings",
      words: ["will", "bell", "hill", "doll", "fill", "tell", "sell", "well", "off", "puff",
              "huff", "mess", "kiss", "fuss", "hiss", "buzz", "fizz", "add", "egg", "mitt"]
    },
    {
      name: "Blend Words",
      focus: "beginning blends like fl, st, cl, dr, fr, sn, sw, tr",
      words: ["flag", "stop", "clap", "drum", "frog", "glad", "plum", "skip", "snap", "spin",
              "swim", "trip", "crab", "grin", "sled", "twin", "blot", "drip", "flip", "slug"]
    },
    {
      name: "Sh, Ch, Th Words",
      focus: "digraphs sh, ch, th, wh",
      words: ["ship", "shop", "shut", "dash", "fish", "wish", "chin", "chop", "chat", "rich",
              "such", "that", "this", "with", "bath", "math", "moth", "path", "when", "whip"]
    },
    {
      name: "Silent E Words",
      focus: "the magic e that makes the vowel say its name",
      words: ["cake", "game", "name", "late", "made", "bike", "ride", "five", "time", "hide",
              "hope", "rope", "bone", "nose", "home", "cute", "tube", "mule", "rule", "June"]
    }
  ]
});
