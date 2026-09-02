"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — READING, GRADE 3 (original content)
   Bigger words: compounds, prefixes, suffixes, and story
   vocabulary. Every word carries a kid-friendly meaning; the
   picturable ones also carry an emoji. Sentences move from
   picture matching to fill-in-the-blank as the tiers climb.
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "reading-3", name: "Reading · Grade 3", subject: "reading", grade: "3",
  icon: "📖",
  desc: "Compound words, prefixes and suffixes, and story vocabulary with meanings.",
  tiers: [
    {
      name: "Trailhead Words",
      focus: "two-syllable and compound words (rainbow, backpack, butterfly)",
      words: [
        { word: "rainbow",   emoji: "🌈", meaning: "an arc of colors in the sky after rain" },
        { word: "sunset",    emoji: "🌇", meaning: "the time when the sun goes down" },
        { word: "backpack",  emoji: "🎒", meaning: "a bag you carry on your back" },
        { word: "popcorn",   emoji: "🍿", meaning: "corn kernels that puff up when heated" },
        { word: "pancake",   emoji: "🥞", meaning: "a flat, round cake cooked in a pan" },
        { word: "cupcake",   emoji: "🧁", meaning: "a little cake baked in a cup" },
        { word: "snowman",   emoji: "⛄", meaning: "a figure built out of snow" },
        { word: "football",  emoji: "🏈", meaning: "a game played with a pointed ball" },
        { word: "butterfly", emoji: "🦋", meaning: "an insect with big colorful wings" },
        { word: "ladybug",   emoji: "🐞", meaning: "a small round red beetle with spots" },
        { word: "volcano",   emoji: "🌋", meaning: "a mountain that can erupt with lava" },
        { word: "tractor",   emoji: "🚜", meaning: "a strong farm machine that pulls things" },
        { word: "penguin",   emoji: "🐧", meaning: "a black-and-white bird that swims but cannot fly" },
        { word: "dolphin",   emoji: "🐬", meaning: "a smart, friendly sea animal" },
        { word: "lighthouse", emoji: "🗼", meaning: "a tall tower with a light to guide ships" },
        { word: "campfire",  emoji: "🔥", meaning: "a fire you build outdoors" }
      ],
      sentences: [
        { text: "After the storm we saw a rainbow.",       answer: "🌈", choices: ["🌈", "🌇", "🍿"] },
        { text: "The tractor pulled the wagon up the hill.", answer: "🚜", choices: ["🎒", "🚜", "🐧"] },
        { text: "A butterfly landed on the flower.",       answer: "🦋", choices: ["🐞", "🦋", "🥞"] },
        { text: "We roasted marshmallows at the campfire.", answer: "🔥", choices: ["🔥", "⛄", "🏈"] },
        { text: "The dolphin jumped beside our boat.",     answer: "🐬", choices: ["🧁", "🌋", "🐬"] },
        { text: "The lighthouse blinked all night long.",  answer: "🗼", choices: ["🗼", "🌇", "🐞"] }
      ]
    },
    {
      name: "Prefix Path",
      focus: "prefixes un-, re-, pre-, dis-, mis- change what a word means",
      words: [
        { word: "unhappy",    meaning: "not happy; sad" },
        { word: "unlock",     emoji: "🔓", meaning: "to open something that was locked" },
        { word: "untie",      meaning: "to loosen a knot" },
        { word: "unfair",     meaning: "not fair; not treating everyone the same" },
        { word: "reread",     say: "ree-reed", meaning: "to read something again" },
        { word: "rewrite",    meaning: "to write something again, better" },
        { word: "replay",     meaning: "to play something again" },
        { word: "refill",     meaning: "to fill something up again" },
        { word: "preview",    meaning: "a look at something before it happens" },
        { word: "preheat",    meaning: "to warm the oven up before cooking" },
        { word: "disagree",   meaning: "to have a different opinion" },
        { word: "dislike",    meaning: "to not like something" },
        { word: "disappear",  meaning: "to go out of sight" },
        { word: "mistake",    meaning: "something done wrong by accident" },
        { word: "misplace",   meaning: "to put something where you cannot find it" },
        { word: "nonstop",    meaning: "without stopping" }
      ],
      sentences: [
        { text: "I had to ___ the book to understand the ending.", answer: "reread", choices: ["reread", "unlock", "preheat"] },
        { text: "Please ___ your water bottle before the hike.",   answer: "refill", choices: ["dislike", "refill", "untie"] },
        { text: "The magician made the coin ___.",                 answer: "disappear", choices: ["disappear", "rewrite", "misplace"] },
        { text: "It is ___ if only one team gets a turn.",         answer: "unfair", choices: ["nonstop", "unfair", "replay"] },
        { text: "Use the key to ___ the gate.",                    answer: "unlock", choices: ["unlock", "preview", "disagree"] },
        { text: "Spilling the paint was a ___, not on purpose.",   answer: "mistake", choices: ["mistake", "unhappy", "refill"] }
      ]
    },
    {
      name: "Suffix Summit",
      focus: "suffixes -ful, -less, -ly, -ness, -er, -est",
      words: [
        { word: "helpful",   meaning: "giving help" },
        { word: "careless",  meaning: "not paying attention" },
        { word: "quickly",   meaning: "in a fast way" },
        { word: "kindness",  meaning: "being kind" },
        { word: "brighter",  meaning: "more bright" },
        { word: "tallest",   meaning: "the most tall of all" },
        { word: "fearless",  meaning: "not afraid of anything" },
        { word: "playful",   meaning: "full of play; liking fun" },
        { word: "softly",    meaning: "in a quiet, gentle way" },
        { word: "darkness",  meaning: "when there is no light" },
        { word: "colorful",  meaning: "full of bright colors" },
        { word: "cheerful",  meaning: "happy and in a good mood" },
        { word: "loudest",   meaning: "the most loud of all" },
        { word: "gently",    meaning: "in a careful, soft way" },
        { word: "thankful",  meaning: "feeling grateful" },
        { word: "sleepy",    meaning: "ready to fall asleep" }
      ],
      sentences: [
        { text: "The giraffe is the ___ animal at the zoo.",     answer: "tallest", choices: ["tallest", "careless", "sleepy"] },
        { text: "Hold the baby bird ___ so you don't hurt it.",  answer: "gently", choices: ["quickly", "gently", "loudest"] },
        { text: "Sharing your lunch was very ___.",              answer: "helpful", choices: ["fearless", "darkness", "helpful"] },
        { text: "The ___ puppy chased its own tail.",            answer: "playful", choices: ["playful", "thankful", "brighter"] },
        { text: "We could not see in the ___.",                  answer: "darkness", choices: ["kindness", "darkness", "softly"] },
        { text: "The parrot was the ___ bird in the shop.",      answer: "loudest", choices: ["cheerful", "colorful", "loudest"] }
      ]
    },
    {
      name: "Story Words",
      focus: "vocabulary that shows up in chapter books",
      words: [
        { word: "brave",     meaning: "ready to face something scary" },
        { word: "gentle",    meaning: "soft and kind; not rough" },
        { word: "clever",    meaning: "quick to understand; smart" },
        { word: "enormous",  meaning: "very, very big" },
        { word: "fragile",   meaning: "easy to break" },
        { word: "gather",    meaning: "to bring things together" },
        { word: "invent",    meaning: "to make something brand new" },
        { word: "journey",   meaning: "a long trip" },
        { word: "marvel",    meaning: "to be amazed by something" },
        { word: "ordinary",  meaning: "normal; nothing special" },
        { word: "patient",   meaning: "able to wait calmly" },
        { word: "rescue",    meaning: "to save someone from danger" },
        { word: "shelter",   meaning: "a safe place out of the weather" },
        { word: "whisper",   meaning: "to speak very softly" },
        { word: "wander",    meaning: "to walk around without a plan" },
        { word: "sturdy",    meaning: "strong and well built" }
      ],
      sentences: [
        { text: "The firefighter was ___ enough to run into the smoke.", answer: "brave", choices: ["brave", "ordinary", "fragile"] },
        { text: "Be ___ with the eggs — they break easily.",             answer: "gentle", choices: ["clever", "gentle", "enormous"] },
        { text: "We built a ___ from branches when the rain came.",      answer: "shelter", choices: ["journey", "shelter", "whisper"] },
        { text: "The elephant was ___ next to the mouse.",               answer: "enormous", choices: ["enormous", "patient", "sturdy"] },
        { text: "Let's ___ the acorns before winter.",                   answer: "gather", choices: ["wander", "invent", "gather"] },
        { text: "The lifeguard swam out to ___ the boy.",                answer: "rescue", choices: ["rescue", "marvel", "gentle"] }
      ]
    }
  ]
});
