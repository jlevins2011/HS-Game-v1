"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — INTRODUCTORY LATIN (original content)
   A gentle first-year introduction written for this game —
   not drawn from any commercial curriculum. Macrons are
   omitted for touch-typing friendliness.
   Activities:
   - recognize: hear/see the English -> tap the Latin
   - recall:    see the Latin -> tap the English
   - spell:     build the Latin word from letter tiles
   - sentence:  read a short Latin sentence -> tap the meaning
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "latin1", name: "Latin · First Steps", subject: "vocab", grade: "intro",
  icon: "🏛️",
  desc: "An original, gentle introduction to Latin: greetings, the world around us, first verbs, and describing words.",
  language: "Latin",
  tiers: [
    {
      name: "Salve! First Words",
      focus: "greetings and the world around us (nature nouns)",
      pairs: [
        ["salve", "hello"], ["vale", "goodbye"], ["ita", "yes"], ["non", "not / no"],
        ["et", "and"], ["sed", "but"], ["aqua", "water"], ["terra", "land / earth"],
        ["silva", "forest"], ["stella", "star"], ["luna", "moon"], ["sol", "sun"],
        ["insula", "island"], ["via", "road / way"], ["casa", "cottage / house"],
        ["hortus", "garden"], ["flos", "flower"], ["arbor", "tree"],
        ["caelum", "sky / heaven"], ["mons", "mountain"]
      ],
      sentences: [
        { text: "Stella et luna.", answer: "A star and the moon.",
          choices: ["A star and the moon.", "The sun and the sky.", "A road and a house."] },
        { text: "Aqua non est terra.", answer: "Water is not land.",
          choices: ["Water is not land.", "The forest is big.", "The island is far."] },
        { text: "Salve! Hortus est pulcher.", answer: "Hello! The garden is beautiful.",
          choices: ["Hello! The garden is beautiful.", "Goodbye! The road is long.", "Yes! The tree is tall."] }
      ]
    },
    {
      name: "People & Creatures",
      focus: "people, family, and animals",
      pairs: [
        ["puella", "girl"], ["puer", "boy"], ["mater", "mother"], ["pater", "father"],
        ["frater", "brother"], ["soror", "sister"], ["amicus", "friend"],
        ["regina", "queen"], ["rex", "king"], ["agricola", "farmer"],
        ["nauta", "sailor"], ["magister", "teacher"], ["equus", "horse"],
        ["canis", "dog"], ["feles", "cat"], ["avis", "bird"],
        ["piscis", "fish"], ["ursa", "bear"], ["ovis", "sheep"], ["vulpes", "fox"]
      ],
      sentences: [
        { text: "Puella et puer ambulant.", answer: "The girl and the boy walk.",
          choices: ["The girl and the boy walk.", "The queen and king sing.", "Mother and father sleep."] },
        { text: "Canis est amicus.", answer: "The dog is a friend.",
          choices: ["The dog is a friend.", "The cat is small.", "The horse is fast."] },
        { text: "Nauta aquam amat.", answer: "The sailor loves the water.",
          choices: ["The sailor loves the water.", "The farmer loves the land.", "The teacher loves books."] }
      ]
    },
    {
      name: "First Verbs",
      focus: "simple present-tense verbs (I walk, I love, I see...)",
      pairs: [
        ["amo", "I love"], ["ambulo", "I walk"], ["canto", "I sing"],
        ["video", "I see"], ["audio", "I hear"], ["voco", "I call"],
        ["porto", "I carry"], ["laboro", "I work"], ["habito", "I live (dwell)"],
        ["specto", "I watch"], ["do", "I give"], ["sum", "I am"],
        ["curro", "I run"], ["sedeo", "I sit"], ["dormio", "I sleep"],
        ["aedifico", "I build"], ["navigo", "I sail"], ["invenio", "I find"],
        ["teneo", "I hold"], ["rideo", "I laugh / smile"]
      ],
      sentences: [
        { text: "Ambulo et canto.", answer: "I walk and I sing.",
          choices: ["I walk and I sing.", "I run and I laugh.", "I sit and I watch."] },
        { text: "Video stellas.", answer: "I see the stars.",
          choices: ["I see the stars.", "I hear the birds.", "I carry the water."] },
        { text: "In silva habito.", answer: "I live in the forest.",
          choices: ["I live in the forest.", "I work in the garden.", "I sleep in the house."] },
        { text: "Casam aedifico.", answer: "I build a house.",
          choices: ["I build a house.", "I find a road.", "I hold a flower."] }
      ]
    },
    {
      name: "Describing Words",
      focus: "adjectives, sizes, colors, and numbers one to five",
      pairs: [
        ["magnus", "big / great"], ["parvus", "small"], ["bonus", "good"],
        ["malus", "bad"], ["novus", "new"], ["longus", "long"],
        ["altus", "tall / deep"], ["laetus", "happy"], ["pulcher", "beautiful"],
        ["fortis", "brave / strong"], ["celer", "fast"], ["albus", "white"],
        ["niger", "black"], ["ruber", "red"], ["caeruleus", "blue"],
        ["unus", "one"], ["duo", "two"], ["tres", "three"],
        ["quattuor", "four"], ["quinque", "five"]
      ],
      sentences: [
        { text: "Mons est altus.", answer: "The mountain is tall.",
          choices: ["The mountain is tall.", "The road is long.", "The house is new."] },
        { text: "Tres stellae sunt pulchrae.", answer: "Three stars are beautiful.",
          choices: ["Three stars are beautiful.", "Two moons are white.", "Five flowers are red."] },
        { text: "Canis parvus est laetus.", answer: "The small dog is happy.",
          choices: ["The small dog is happy.", "The big cat is fast.", "The brave horse is good."] }
      ]
    }
  ]
});
