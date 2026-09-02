"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — SPELLING, KINDERGARTEN (original)
   Three-letter, short-vowel words only. Activities: spot (tap
   the correct spelling) and spell (build it from letter tiles).
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "spelling-k", name: "Spelling · Kindergarten", subject: "spelling", grade: "K",
  icon: "✏️",
  desc: "Three-letter words with short vowels — cat, sun, bed — the first words a child spells.",
  tiers: [
    {
      name: "Sound Seeds",
      focus: "short a, e, u words like cat, bed and sun",
      words: ["cat", "hat", "map", "fan", "jam", "bed", "net", "red", "wet", "leg",
              "sun", "cup", "bus", "mud", "hug", "bug"]
    },
    {
      name: "Little Sprouts",
      focus: "short i and o words like pig and top",
      words: ["pig", "dig", "six", "wig", "zip", "kid", "lid", "fin",
              "top", "pot", "log", "hop", "mop", "dog", "fox", "job"]
    },
    {
      name: "Big Blooms",
      focus: "all five short vowels mixed together",
      words: ["bat", "van", "rag", "pen", "hen", "jet", "rug", "tub", "nut", "gum",
              "hop", "rod", "sob", "bin", "rip", "yak"]
    }
  ]
});
