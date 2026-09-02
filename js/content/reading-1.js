"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — READING, GRADE 1 (original content)
   Sight words in the order children usually meet them, paired
   with picture words that walk the phonics ladder: short
   vowels → blends → digraphs (sh, ch, th, wh) → silent e and
   vowel teams. Lowercase, as in books.
   `say:` fixes the two words a speech engine reads wrong out
   of context: "live" (the verb) and "read" (present tense).
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "reading-1", name: "Reading · Grade 1", subject: "reading", grade: "1",
  icon: "📖",
  desc: "Sight words plus picture words that climb from short vowels to blends, digraphs and silent e.",
  tiers: [
    {
      name: "Sunny Sight Words",
      focus: "everyday sight words and short-vowel picture words",
      words: [
        { word: "all" }, { word: "am" }, { word: "are" }, { word: "at" }, { word: "be" },
        { word: "but" }, { word: "came" }, { word: "did" }, { word: "do" }, { word: "eat" },
        { word: "get" }, { word: "good" }, { word: "have" }, { word: "he" }, { word: "she" },
        { word: "they" }, { word: "was" }, { word: "saw" }, { word: "went" }, { word: "want" },
        { word: "sock", emoji: "🧦" }, { word: "jet", emoji: "✈️" }, { word: "nut", emoji: "🥜" },
        { word: "bell", emoji: "🔔" }, { word: "ship", emoji: "🚢" }, { word: "drum", emoji: "🥁" },
        { word: "ring", emoji: "💍" }, { word: "milk", emoji: "🥛" }, { word: "corn", emoji: "🌽" },
        { word: "lock", emoji: "🔒" }
      ],
      sentences: [
        { text: "She saw a ship.",          answer: "🚢", choices: ["🚢", "🥁", "🌽"] },
        { text: "They want milk.",          answer: "🥛", choices: ["🥛", "🧦", "💍"] },
        { text: "I have a drum.",           answer: "🥁", choices: ["🥁", "✈️", "🔔"] },
        { text: "The bell is good.",        answer: "🔔", choices: ["🔒", "🔔", "🥜"] },
        { text: "We went on a jet.",        answer: "✈️", choices: ["✈️", "🚢", "🧦"] },
        { text: "He did eat the corn.",     answer: "🌽", choices: ["🥜", "🌽", "💍"] }
      ]
    },
    {
      name: "Blend Bunch",
      focus: "sight words and picture words that start with blends (cr, fl, sn, tr, pl, cl)",
      words: [
        { word: "this" }, { word: "that" }, { word: "with" }, { word: "from" }, { word: "when" },
        { word: "then" }, { word: "them" }, { word: "will" }, { word: "into" }, { word: "must" },
        { word: "new" }, { word: "now" }, { word: "out" }, { word: "our" }, { word: "ride" },
        { word: "say" }, { word: "so" }, { word: "soon" }, { word: "too" }, { word: "under" },
        { word: "what" }, { word: "who" }, { word: "yes" },
        { word: "crab", emoji: "🦀" }, { word: "flag", emoji: "🏁" }, { word: "snail", emoji: "🐌" },
        { word: "truck", emoji: "🚚" }, { word: "plant", emoji: "🪴" }, { word: "clock", emoji: "⏰" },
        { word: "sled", emoji: "🛷" }, { word: "crown", emoji: "👑" }, { word: "bread", emoji: "🍞" },
        { word: "grapes", emoji: "🍇" }
      ],
      sentences: [
        { text: "The crab is under a rock.",     answer: "🦀", choices: ["🦀", "🏁", "🍞"] },
        { text: "Who has the flag?",             answer: "🏁", choices: ["🏁", "🐌", "👑"] },
        { text: "This truck is new.",            answer: "🚚", choices: ["🛷", "🚚", "⏰"] },
        { text: "The snail is so slow.",         answer: "🐌", choices: ["🐌", "🪴", "🍇"] },
        { text: "What time is on the clock?",    answer: "⏰", choices: ["⏰", "🦀", "🍞"] },
        { text: "We will ride the sled soon.",   answer: "🛷", choices: ["👑", "🛷", "🚚"] }
      ]
    },
    {
      name: "Sh, Ch, Th, Wh",
      focus: "digraph words (sh, ch, th, wh) and the next sight words",
      words: [
        { word: "after" }, { word: "again" }, { word: "any" }, { word: "as" }, { word: "ask" },
        { word: "by" }, { word: "could" }, { word: "every" }, { word: "fly" }, { word: "give" },
        { word: "going" }, { word: "had" }, { word: "has" }, { word: "her" }, { word: "him" },
        { word: "his" }, { word: "how" }, { word: "just" }, { word: "know" }, { word: "let" },
        { word: "live", say: "liv" }, { word: "may" }, { word: "of" }, { word: "old" }, { word: "once" },
        { word: "shell", emoji: "🐚" }, { word: "chick", emoji: "🐤" }, { word: "cheese", emoji: "🧀" },
        { word: "shark", emoji: "🦈" }, { word: "chair", emoji: "🪑" }, { word: "sheep", emoji: "🐑" },
        { word: "whale", emoji: "🐳" }, { word: "teeth", emoji: "🦷" }, { word: "bath", emoji: "🛁" },
        { word: "watch", emoji: "⌚" }
      ],
      sentences: [
        { text: "The chick is by her.",          answer: "🐤", choices: ["🐤", "🦈", "🪑"] },
        { text: "Give him the cheese.",          answer: "🧀", choices: ["🧀", "🐚", "⌚"] },
        { text: "How old is the whale?",         answer: "🐳", choices: ["🐑", "🐳", "🛁"] },
        { text: "Every sheep is in the field.",  answer: "🐑", choices: ["🐑", "🐤", "🦷"] },
        { text: "I know that shark.",            answer: "🦈", choices: ["🪑", "🦈", "🧀"] },
        { text: "Ask her to sit on the chair.",  answer: "🪑", choices: ["🪑", "⌚", "🐚"] }
      ]
    },
    {
      name: "Silent E & Friends",
      focus: "silent-e and vowel-team words (bike, rain, goat) with the last sight words",
      words: [
        { word: "open" }, { word: "over" }, { word: "put" }, { word: "round" }, { word: "some" },
        { word: "stop" }, { word: "take" }, { word: "thank" }, { word: "think" }, { word: "walk" },
        { word: "were" }, { word: "read", say: "reed" }, { word: "pretty" }, { word: "please" },
        { word: "because" }, { word: "before" }, { word: "around" }, { word: "always" },
        { word: "both" }, { word: "done" },
        { word: "bike", emoji: "🚲" }, { word: "rose", emoji: "🌹" }, { word: "snake", emoji: "🐍" },
        { word: "cone", emoji: "🍦" }, { word: "bone", emoji: "🦴" }, { word: "nose", emoji: "👃" },
        { word: "rain", emoji: "🌧️" }, { word: "goat", emoji: "🐐" }, { word: "seal", emoji: "🦭" },
        { word: "leaf", emoji: "🍃" }
      ],
      sentences: [
        { text: "Please stop the bike.",           answer: "🚲", choices: ["🚲", "🐍", "🦴"] },
        { text: "The goat walked around the tree.", answer: "🐐", choices: ["🍦", "🐐", "🌹"] },
        { text: "Take the bone, please.",           answer: "🦴", choices: ["🦴", "👃", "🦭"] },
        { text: "I think it will rain.",            answer: "🌧️", choices: ["🍃", "🌧️", "🚲"] },
        { text: "The seal can open the gate.",      answer: "🦭", choices: ["🦭", "🐐", "🍦"] },
        { text: "Thank you for the pretty rose.",   answer: "🌹", choices: ["🐍", "🌹", "🍃"] }
      ]
    }
  ]
});
