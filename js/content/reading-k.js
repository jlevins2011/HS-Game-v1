"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — READING, KINDERGARTEN (original content)
   The very first words: a small core of sight words a child
   meets everywhere, plus short picturable words with one clear
   emoji each. Sight words are mostly `hear`-type (you cannot
   draw "the"); picture words unlock the read/meaning activities.
   Words are lowercase on purpose — that is how beginning
   readers meet them in books.
   `say:` overrides the voice where an engine gets a word wrong.
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "reading-k", name: "Reading · Kindergarten", subject: "reading", grade: "K",
  icon: "📖",
  desc: "First sight words and simple picture words for brand-new readers.",
  tiers: [
    {
      name: "First Steps",
      focus: "the first sight words, and three-letter picture words like cat and sun",
      words: [
        { word: "I" }, { word: "a" }, { word: "the" }, { word: "and" },
        { word: "see", emoji: "👀" }, { word: "go" }, { word: "my" }, { word: "can" },
        { word: "like" }, { word: "to" },
        { word: "cat", emoji: "🐱" }, { word: "dog", emoji: "🐶" }, { word: "sun", emoji: "☀️" },
        { word: "hat", emoji: "🎩" }, { word: "bed", emoji: "🛏️" }, { word: "pig", emoji: "🐷" },
        { word: "bus", emoji: "🚌" }, { word: "egg", emoji: "🥚" }, { word: "cup", emoji: "🥤" },
        { word: "map", emoji: "🗺️" }
      ],
      sentences: [
        { text: "I see a cat.",        answer: "🐱", choices: ["🐱", "🐶", "☀️"] },
        { text: "I like my hat.",      answer: "🎩", choices: ["🎩", "🛏️", "🐷"] },
        { text: "The pig can go.",     answer: "🐷", choices: ["🐷", "🚌", "🥚"] },
        { text: "See the sun.",        answer: "☀️", choices: ["☀️", "🐱", "🗺️"] },
        { text: "I see my cup.",       answer: "🥤", choices: ["🥤", "🎩", "🐶"] },
        { text: "The dog can see me.", answer: "🐶", choices: ["🛏️", "🐶", "🚌"] }
      ]
    },
    {
      name: "Little Words",
      focus: "short sight words (it, is, in, on) and more picture words",
      words: [
        { word: "it" }, { word: "is" }, { word: "in" }, { word: "on" },
        { word: "up", emoji: "⬆️" }, { word: "we" }, { word: "me" }, { word: "you" },
        { word: "look" }, { word: "not" }, { word: "big" }, { word: "little" },
        { word: "cow", emoji: "🐮" }, { word: "car", emoji: "🚗" }, { word: "bee", emoji: "🐝" },
        { word: "bug", emoji: "🐛" }, { word: "box", emoji: "📦" }, { word: "key", emoji: "🔑" },
        { word: "ball", emoji: "⚽" }, { word: "fish", emoji: "🐟" }, { word: "duck", emoji: "🦆" },
        { word: "pen", emoji: "🖊️" }
      ],
      sentences: [
        { text: "The cow is big.",        answer: "🐮", choices: ["🐮", "🐝", "🔑"] },
        { text: "I see a bug.",           answer: "🐛", choices: ["🐛", "🚗", "⚽"] },
        { text: "It is a duck.",          answer: "🦆", choices: ["🦆", "🐟", "📦"] },
        { text: "Look at the car.",       answer: "🚗", choices: ["🚗", "🐮", "🐝"] },
        { text: "The key is little.",     answer: "🔑", choices: ["🔑", "⚽", "🐟"] },
        { text: "We can see a bee.",      answer: "🐝", choices: ["🖊️", "🐝", "🐛"] }
      ]
    },
    {
      name: "Growing Words",
      focus: "action sight words (come, play, run, jump) and longer picture words",
      words: [
        { word: "come" }, { word: "here" }, { word: "play" }, { word: "run" },
        { word: "jump" }, { word: "help" }, { word: "said" }, { word: "down", emoji: "⬇️" },
        { word: "where" }, { word: "funny" }, { word: "yellow" }, { word: "three", emoji: "3️⃣" },
        { word: "away" }, { word: "make" }, { word: "for" }, { word: "with" },
        { word: "frog", emoji: "🐸" }, { word: "boat", emoji: "⛵" }, { word: "star", emoji: "⭐" },
        { word: "moon", emoji: "🌙" }, { word: "tree", emoji: "🌳" }, { word: "house", emoji: "🏠" },
        { word: "apple", emoji: "🍎" }, { word: "book", emoji: "📖" }, { word: "kite", emoji: "🪁" },
        { word: "cake", emoji: "🎂" }
      ],
      sentences: [
        { text: "The frog can jump.",         answer: "🐸", choices: ["🐸", "⭐", "🎂"] },
        { text: "Come play with the kite.",   answer: "🪁", choices: ["🪁", "🌳", "🍎"] },
        { text: "Here is a book.",            answer: "📖", choices: ["📖", "🌙", "⛵"] },
        { text: "Run to the house.",          answer: "🏠", choices: ["🏠", "🐸", "🎂"] },
        { text: "I see the moon and a star.", answer: "🌙", choices: ["🍎", "🌙", "🪁"] },
        { text: "Help me make a cake.",       answer: "🎂", choices: ["🎂", "🌳", "⛵"] }
      ]
    }
  ]
});
