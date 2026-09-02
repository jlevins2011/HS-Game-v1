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
        { front: "salve", back: "hello", say: "sal-way" }, { front: "vale", back: "goodbye", say: "wah-lay" }, { front: "ita", back: "yes", say: "ee-tah" }, { front: "non", back: "not / no", say: "nohn" },
        ["et", "and"], ["sed", "but"], { front: "aqua", back: "water", say: "ah-kwah" }, { front: "terra", back: "land / earth", say: "teh-rah" },
        { front: "silva", back: "forest", say: "sil-wah" }, { front: "stella", back: "star", say: "stel-lah" }, { front: "luna", back: "moon", say: "loo-nah" }, ["sol", "sun"],
        { front: "insula", back: "island", say: "in-soo-lah" }, { front: "via", back: "road / way", say: "wee-ah" }, { front: "casa", back: "cottage / house", say: "kah-sah" },
        { front: "hortus", back: "garden", say: "hor-toos" }, { front: "flos", back: "flower", say: "flohs" }, ["arbor", "tree"],
        { front: "caelum", back: "sky / heaven", say: "kye-loom" }, { front: "mons", back: "mountain", say: "mohns" }
      ],
      sentences: [
        { text: "Stella et luna.", say: "stel-lah et loo-nah", answer: "A star and the moon.",
          choices: ["A star and the moon.", "The sun and the sky.", "A road and a house."] },
        { text: "Aqua non est terra.", say: "ah-kwah nohn est teh-rah", answer: "Water is not land.",
          choices: ["Water is not land.", "The forest is big.", "The island is far."] },
        { text: "Salve! Hortus est pulcher.", say: "sal-way! hor-toos est pool-kair", answer: "Hello! The garden is beautiful.",
          choices: ["Hello! The garden is beautiful.", "Goodbye! The road is long.", "Yes! The tree is tall."] }
      ]
    },
    {
      name: "People & Creatures",
      focus: "people, family, and animals",
      pairs: [
        { front: "puella", back: "girl", say: "poo-el-lah" }, { front: "puer", back: "boy", say: "poo-air" }, { front: "mater", back: "mother", say: "mah-tair" }, { front: "pater", back: "father", say: "pah-tair" },
        { front: "frater", back: "brother", say: "frah-tair" }, { front: "soror", back: "sister", say: "so-ror" }, { front: "amicus", back: "friend", say: "ah-mee-koos" },
        { front: "regina", back: "queen", say: "ray-ghee-nah" }, ["rex", "king"], { front: "agricola", back: "farmer", say: "ah-gri-ko-lah" },
        { front: "nauta", back: "sailor", say: "now-tah" }, { front: "magister", back: "teacher", say: "mah-ghis-tair" }, { front: "equus", back: "horse", say: "ek-woos" },
        { front: "canis", back: "dog", say: "kah-nis" }, { front: "feles", back: "cat", say: "fay-lace" }, { front: "avis", back: "bird", say: "ah-wis" },
        { front: "piscis", back: "fish", say: "pis-kis" }, { front: "ursa", back: "bear", say: "oor-sah" }, { front: "ovis", back: "sheep", say: "oh-wis" }, { front: "vulpes", back: "fox", say: "wool-pace" }
      ],
      sentences: [
        { text: "Puella et puer ambulant.", say: "poo-el-lah et poo-air ahm-boo-lahnt", answer: "The girl and the boy walk.",
          choices: ["The girl and the boy walk.", "The queen and king sing.", "Mother and father sleep."] },
        { text: "Canis est amicus.", say: "kah-nis est ah-mee-koos", answer: "The dog is a friend.",
          choices: ["The dog is a friend.", "The cat is small.", "The horse is fast."] },
        { text: "Nauta aquam amat.", say: "now-tah ah-kwahm ah-maht", answer: "The sailor loves the water.",
          choices: ["The sailor loves the water.", "The farmer loves the land.", "The teacher loves books."] }
      ]
    },
    {
      name: "First Verbs",
      focus: "simple present-tense verbs (I walk, I love, I see...)",
      pairs: [
        { front: "amo", back: "I love", say: "ah-moh" }, { front: "ambulo", back: "I walk", say: "ahm-boo-loh" }, { front: "canto", back: "I sing", say: "kahn-toh" },
        { front: "video", back: "I see", say: "wi-day-oh" }, { front: "audio", back: "I hear", say: "ow-dee-oh" }, { front: "voco", back: "I call", say: "wo-koh" },
        { front: "porto", back: "I carry", say: "por-toh" }, { front: "laboro", back: "I work", say: "lah-bo-roh" }, { front: "habito", back: "I live (dwell)", say: "hah-bi-toh" },
        { front: "specto", back: "I watch", say: "spek-toh" }, { front: "do", back: "I give", say: "doh" }, { front: "sum", back: "I am", say: "soom" },
        { front: "curro", back: "I run", say: "koor-roh" }, { front: "sedeo", back: "I sit", say: "seh-day-oh" }, { front: "dormio", back: "I sleep", say: "dor-mee-oh" },
        { front: "aedifico", back: "I build", say: "eye-di-fi-koh" }, { front: "navigo", back: "I sail", say: "nah-wi-goh" }, { front: "invenio", back: "I find", say: "in-way-nee-oh" },
        { front: "teneo", back: "I hold", say: "teh-nay-oh" }, { front: "rideo", back: "I laugh / smile", say: "ri-day-oh" }
      ],
      sentences: [
        { text: "Ambulo et canto.", say: "ahm-boo-loh et kahn-toh", answer: "I walk and I sing.",
          choices: ["I walk and I sing.", "I run and I laugh.", "I sit and I watch."] },
        { text: "Video stellas.", say: "wi-day-oh stel-lahs", answer: "I see the stars.",
          choices: ["I see the stars.", "I hear the birds.", "I carry the water."] },
        { text: "In silva habito.", say: "in sil-wah hah-bi-toh", answer: "I live in the forest.",
          choices: ["I live in the forest.", "I work in the garden.", "I sleep in the house."] },
        { text: "Casam aedifico.", say: "kah-sahm eye-di-fi-koh", answer: "I build a house.",
          choices: ["I build a house.", "I find a road.", "I hold a flower."] }
      ]
    },
    {
      name: "Describing Words",
      focus: "adjectives, sizes, colors, and numbers one to five",
      pairs: [
        { front: "magnus", back: "big / great", say: "mahg-noos" }, { front: "parvus", back: "small", say: "par-woos" }, { front: "bonus", back: "good", say: "bo-noos" },
        { front: "malus", back: "bad", say: "mah-loos" }, { front: "novus", back: "new", say: "no-woos" }, { front: "longus", back: "long", say: "long-goos" },
        { front: "altus", back: "tall / deep", say: "ahl-toos" }, { front: "laetus", back: "happy", say: "lye-toos" }, { front: "pulcher", back: "beautiful", say: "pool-kair" },
        { front: "fortis", back: "brave / strong", say: "for-tis" }, { front: "celer", back: "fast", say: "keh-lair" }, { front: "albus", back: "white", say: "ahl-boos" },
        { front: "niger", back: "black", say: "nee-gair" }, { front: "ruber", back: "red", say: "roo-bair" }, { front: "caeruleus", back: "blue", say: "kye-roo-lay-oos" },
        { front: "unus", back: "one", say: "oo-noos" }, { front: "duo", back: "two", say: "doo-oh" }, { front: "tres", back: "three", say: "trace" },
        { front: "quattuor", back: "four", say: "kwat-too-or" }, { front: "quinque", back: "five", say: "kwin-kweh" }
      ],
      sentences: [
        { text: "Mons est altus.", say: "mohns est ahl-toos", answer: "The mountain is tall.",
          choices: ["The mountain is tall.", "The road is long.", "The house is new."] },
        { text: "Tres stellae sunt pulchrae.", say: "trace stel-lye soont pool-kry", answer: "Three stars are beautiful.",
          choices: ["Three stars are beautiful.", "Two moons are white.", "Five flowers are red."] },
        { text: "Canis parvus est laetus.", say: "kah-nis par-woos est lye-toos", answer: "The small dog is happy.",
          choices: ["The small dog is happy.", "The big cat is fast.", "The brave horse is good."] }
      ]
    }
  ]
});
