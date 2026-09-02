"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — READING, GRADE 2
   Words with an emoji can be used for picture activities:
   - meaning:  big picture -> tap the written word
   - read:     written word (NO audio) -> tap the picture
   Every word can be used for:
   - hear:     hear the word -> tap the written word
   Sentences are used for read-and-match comprehension.
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "reading-2", name: "Reading · Grade 2", subject: "reading", grade: "2",
  icon: "📖",
  desc: "Sight words and phonics patterns for young readers: short vowels, blends, silent-e, and vowel teams.",
  tiers: [
    { // ---- TIER 0: sight words + short vowels ----
      name: "Sunrise Words",
      focus: "everyday sight words and short-vowel words like fox and cup",
      words: [
        { word: "a" }, { word: "I" }, { word: "the" }, { word: "and" },
        { word: "is" }, { word: "we", }, { word: "my" }, { word: "to" },
        { word: "go" }, { word: "on" }, { word: "at" }, { word: "you" },
        { word: "see", emoji: "👀" }, { word: "up", emoji: "⬆️" },
        { word: "fox", emoji: "🦊" }, { word: "cup", emoji: "🥤" },
        { word: "hen", emoji: "🐔" }, { word: "web", emoji: "🕸️" },
        { word: "log", emoji: "🪵" }, { word: "bag", emoji: "👜" },
        { word: "ant", emoji: "🐜" }, { word: "egg", emoji: "🥚" },
        { word: "pan", emoji: "🍳" }, { word: "bus", emoji: "🚌" },
        { word: "leg", emoji: "🦵" }, { word: "ten", emoji: "🔟" },
        { word: "mud", emoji: "🟤" }, { word: "cap", emoji: "🧢" }
      ],
      sentences: [
        { text: "I see a fox.",        answer: "🦊", choices: ["🦊", "🐔", "🚌"] },
        { text: "The hen is on the log.", answer: "🐔", choices: ["🐜", "🐔", "🥚"] },
        { text: "My cup is up.",       answer: "🥤", choices: ["🥤", "👜", "🕸️"] },
        { text: "The ant is in the bag.", answer: "🐜", choices: ["🐜", "🦊", "🍳"] },
        { text: "We go on the bus.",   answer: "🚌", choices: ["🪵", "🚌", "🧢"] },
        { text: "The egg is in the pan.", answer: "🥚", choices: ["🥚", "🔟", "🦵"] }
      ]
    },
    { // ---- TIER 1: more sight words + blends ----
      name: "Trail Words",
      focus: "tricky sight words plus beginning blends like st, gr, and fl",
      words: [
        { word: "was" }, { word: "are" }, { word: "said" }, { word: "they" },
        { word: "want" }, { word: "some" }, { word: "come" }, { word: "your" },
        { word: "from" }, { word: "have" }, { word: "little" }, { word: "out" },
        { word: "star", emoji: "⭐" }, { word: "grass", emoji: "🌱" },
        { word: "flag", emoji: "🚩" }, { word: "crab", emoji: "🦀" },
        { word: "sled", emoji: "🛷" }, { word: "drum", emoji: "🥁" },
        { word: "frog", emoji: "🐸" }, { word: "clock", emoji: "🕐" },
        { word: "plum", emoji: "🍑" }, { word: "swim", emoji: "🏊" },
        { word: "nest", emoji: "🪺" }, { word: "lamp", emoji: "💡" },
        { word: "hand", emoji: "✋" }, { word: "tent", emoji: "⛺" },
        { word: "milk", emoji: "🥛" }, { word: "gift", emoji: "🎁" }
      ],
      sentences: [
        { text: "The frog can swim.",        answer: "🐸", choices: ["🐸", "🦀", "⭐"] },
        { text: "They want some milk.",      answer: "🥛", choices: ["🥁", "🥛", "🍑"] },
        { text: "A star is out.",            answer: "⭐", choices: ["💡", "⭐", "🚩"] },
        { text: "The crab is in the grass.", answer: "🦀", choices: ["🦀", "🐸", "🛷"] },
        { text: "Your gift is little.",      answer: "🎁", choices: ["⛺", "🪺", "🎁"] },
        { text: "I have a drum.",            answer: "🥁", choices: ["🥁", "🕐", "✋"] }
      ]
    },
    { // ---- TIER 2: digraphs + silent-e ----
      name: "River Words",
      focus: "sh, ch, th words and silent-e words like cave and smile",
      words: [
        { word: "where" }, { word: "there" }, { word: "would" }, { word: "because" },
        { word: "very" }, { word: "again" }, { word: "who" }, { word: "does" },
        { word: "shell", emoji: "🐚" }, { word: "chick", emoji: "🐤" },
        { word: "sheep", emoji: "🐑" }, { word: "brush", emoji: "🪥" },
        { word: "cheese", emoji: "🧀" }, { word: "throne", emoji: "🪑" },
        { word: "cave", emoji: "🕳️" }, { word: "kite", emoji: "🪁" },
        { word: "rose", emoji: "🌹" }, { word: "cube", emoji: "🧊" },
        { word: "smile", emoji: "😀" }, { word: "whale", emoji: "🐋" },
        { word: "snake", emoji: "🐍" }, { word: "grapes", emoji: "🍇" },
        { word: "stone", emoji: "🪨" }, { word: "plane", emoji: "✈️" },
        { word: "flame", emoji: "🔥" }, { word: "bone", emoji: "🦴" }
      ],
      sentences: [
        { text: "The chick is with the sheep.",   answer: "🐤", choices: ["🐤", "🐋", "🐍"] },
        { text: "Who found a shell?",             answer: "🐚", choices: ["🌹", "🐚", "🧀"] },
        { text: "The kite flies over the cave.",  answer: "🪁", choices: ["🪁", "🦴", "🪨"] },
        { text: "A whale is very big.",           answer: "🐋", choices: ["🐤", "🍇", "🐋"] },
        { text: "The snake naps on a warm stone.", answer: "🐍", choices: ["🐍", "😀", "✈️"] },
        { text: "She smiles because of the rose.", answer: "🌹", choices: ["🔥", "🌹", "🧊"] }
      ]
    },
    { // ---- TIER 3: vowel teams + two syllables ----
      name: "Summit Words",
      focus: "vowel teams like rain and moon, plus longer two-syllable words",
      words: [
        { word: "rainbow", emoji: "🌈" }, { word: "seashore", emoji: "🏖️" },
        { word: "moonlight", emoji: "🌙" }, { word: "campfire", emoji: "🏕️" },
        { word: "train", emoji: "🚂" }, { word: "boat", emoji: "⛵" },
        { word: "cloud", emoji: "☁️" }, { word: "mountain", emoji: "⛰️" },
        { word: "garden", emoji: "🌷" }, { word: "spider", emoji: "🕷️" },
        { word: "turtle", emoji: "🐢" }, { word: "basket", emoji: "🧺" },
        { word: "window", emoji: "🪟" }, { word: "pillow", emoji: "🛏️" },
        { word: "peanut", emoji: "🥜" }, { word: "rocket", emoji: "🚀" },
        { word: "lantern", emoji: "🏮" }, { word: "acorn", emoji: "🌰" },
        { word: "eagle", emoji: "🦅" }, { word: "beaver", emoji: "🦫" },
        { word: "meadow", emoji: "🌼" }, { word: "thunder", emoji: "⛈️" },
        { word: "sunlight", emoji: "🌞" }, { word: "harbor", emoji: "⚓" }
      ],
      sentences: [
        { text: "A rainbow came after the thunder.",  answer: "🌈", choices: ["🌈", "🚂", "🌰"] },
        { text: "The turtle sleeps in the garden.",   answer: "🐢", choices: ["🕷️", "🐢", "🦅"] },
        { text: "The boat sails to the harbor.",      answer: "⛵", choices: ["⛵", "🚀", "🧺"] },
        { text: "An eagle flies over the mountain.",  answer: "🦅", choices: ["🦫", "☁️", "🦅"] },
        { text: "The lantern glows in the moonlight.", answer: "🏮", choices: ["🏮", "🌞", "🪟"] },
        { text: "A beaver hid an acorn in the meadow.", answer: "🦫", choices: ["🐢", "🦫", "🛏️"] }
      ]
    }
  ]
});
