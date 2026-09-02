"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — READING & VOCABULARY, GRADE 5
   Each word carries a short kid-friendly meaning. Activities:
   - hear:      hear the word -> tap it
   - meaning:   see the definition -> tap the word (and reverse)
   - sentence:  complete the sentence with the right word
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "reading-5", name: "Reading · Grade 5", subject: "reading", grade: "5",
  icon: "📚",
  desc: "Rich vocabulary with meanings and fill-in sentences for stronger readers.",
  tiers: [
    {
      name: "Pathfinder Vocabulary",
      focus: "useful describing words readers meet everywhere",
      words: [
        { word: "ancient",   meaning: "very, very old" },
        { word: "brilliant", meaning: "very bright, or very smart" },
        { word: "cautious",  meaning: "careful to avoid danger" },
        { word: "delicate",  meaning: "easily broken; fragile" },
        { word: "eager",     meaning: "excited and ready to do something" },
        { word: "fierce",    meaning: "wild and forceful" },
        { word: "gigantic",  meaning: "extremely large" },
        { word: "humble",    meaning: "not proud; modest" },
        { word: "curious",   meaning: "wanting to find out about things" },
        { word: "generous",  meaning: "happy to give and share" },
        { word: "weary",     meaning: "very tired" },
        { word: "vivid",     meaning: "bright and full of life" },
        { word: "rare",      meaning: "not often found" },
        { word: "sturdy",    meaning: "strong and well built" },
        { word: "silent",    meaning: "making no sound at all" },
        { word: "distant",   meaning: "far away" }
      ],
      sentences: [
        { text: "The bridge was ___ enough to hold the whole wagon.", answer: "sturdy", choices: ["sturdy", "weary", "silent"] },
        { text: "We found an ___ coin buried under the oak tree.", answer: "ancient", choices: ["eager", "ancient", "delicate"] },
        { text: "Be ___ when you climb near the cliff edge.", answer: "cautious", choices: ["gigantic", "vivid", "cautious"] },
        { text: "The ___ hikers finally stopped to rest.", answer: "weary", choices: ["weary", "fierce", "generous"] },
        { text: "A ___ storm bent the trees sideways.", answer: "fierce", choices: ["humble", "fierce", "distant"] },
        { text: "She was ___ to open her birthday present.", answer: "eager", choices: ["rare", "silent", "eager"] }
      ]
    },
    {
      name: "Voyager Vocabulary",
      focus: "action words and precise verbs writers love",
      words: [
        { word: "observe",   meaning: "to watch carefully" },
        { word: "predict",   meaning: "to say what will happen next" },
        { word: "hesitate",  meaning: "to pause before doing something" },
        { word: "persuade",  meaning: "to talk someone into something" },
        { word: "astonish",  meaning: "to greatly surprise" },
        { word: "navigate",  meaning: "to find the way" },
        { word: "construct", meaning: "to build" },
        { word: "abandon",   meaning: "to leave behind for good" },
        { word: "conceal",   meaning: "to hide" },
        { word: "pursue",    meaning: "to chase after" },
        { word: "examine",   meaning: "to look at very closely" },
        { word: "murmur",    meaning: "to speak very softly" },
        { word: "soar",      meaning: "to fly high" },
        { word: "tremble",   meaning: "to shake with cold or fear" },
        { word: "wander",    meaning: "to walk without a set path" },
        { word: "gather",    meaning: "to collect together" }
      ],
      sentences: [
        { text: "Use the stars to ___ across the sea.", answer: "navigate", choices: ["navigate", "murmur", "tremble"] },
        { text: "The hawk began to ___ above the valley.", answer: "soar", choices: ["conceal", "soar", "hesitate"] },
        { text: "Scientists ___ the eclipse through special glasses.", answer: "observe", choices: ["abandon", "persuade", "observe"] },
        { text: "Squirrels ___ acorns before winter comes.", answer: "gather", choices: ["gather", "astonish", "predict"] },
        { text: "Don't ___ — the door closes in one minute!", answer: "hesitate", choices: ["construct", "hesitate", "examine"] },
        { text: "The kittens like to ___ around the barn.", answer: "wander", choices: ["pursue", "wander", "soar"] }
      ]
    },
    {
      name: "Trailblazer Vocabulary",
      focus: "idea words for thinking, feeling, and explaining",
      words: [
        { word: "courage",    meaning: "bravery when something is hard or scary" },
        { word: "gratitude",  meaning: "the feeling of being thankful" },
        { word: "dilemma",    meaning: "a hard choice between two options" },
        { word: "evidence",   meaning: "facts that show something is true" },
        { word: "fortunate",  meaning: "lucky; blessed with good things" },
        { word: "genuine",    meaning: "real; not fake" },
        { word: "hazardous",  meaning: "dangerous" },
        { word: "inquire",    meaning: "to ask about something" },
        { word: "logical",    meaning: "making good sense" },
        { word: "magnificent", meaning: "wonderfully grand and beautiful" },
        { word: "necessary",  meaning: "needed; required" },
        { word: "obstacle",   meaning: "something that blocks the way" },
        { word: "reluctant",  meaning: "not wanting to do something" },
        { word: "sincere",    meaning: "honest and truly meant" },
        { word: "temporary",  meaning: "lasting only a short time" },
        { word: "diligent",   meaning: "hardworking and careful" }
      ],
      sentences: [
        { text: "The detective needed ___ before naming the culprit.", answer: "evidence", choices: ["evidence", "gratitude", "courage"] },
        { text: "Crossing the icy pass was too ___ at night.", answer: "hazardous", choices: ["logical", "hazardous", "sincere"] },
        { text: "The fallen tree was an ___ on the trail.", answer: "obstacle", choices: ["obstacle", "dilemma", "inquire"] },
        { text: "Her thank-you note was warm and ___.", answer: "sincere", choices: ["temporary", "reluctant", "sincere"] },
        { text: "The ___ student checked every answer twice.", answer: "diligent", choices: ["diligent", "fortunate", "magnificent"] },
        { text: "The snow fort is only ___ — it melts in spring.", answer: "temporary", choices: ["genuine", "temporary", "necessary"] }
      ]
    },
    {
      name: "Summit Vocabulary",
      focus: "challenge words that stretch strong readers",
      words: [
        { word: "abundant",     meaning: "more than enough; plentiful" },
        { word: "benevolent",   meaning: "kind and wishing others well" },
        { word: "chronological", meaning: "in time order" },
        { word: "desolate",     meaning: "empty and lonely" },
        { word: "elaborate",    meaning: "full of careful detail" },
        { word: "formidable",   meaning: "impressively strong or difficult" },
        { word: "hospitable",   meaning: "friendly and welcoming to guests" },
        { word: "illuminate",   meaning: "to light up" },
        { word: "jubilant",     meaning: "bursting with joy" },
        { word: "meticulous",   meaning: "extremely careful about details" },
        { word: "perceive",     meaning: "to notice or become aware of" },
        { word: "persevere",    meaning: "to keep trying and not give up" },
        { word: "quench",       meaning: "to satisfy thirst, or put out a fire" },
        { word: "resemble",     meaning: "to look like" },
        { word: "vast",         meaning: "enormously wide or large" },
        { word: "voyage",       meaning: "a long journey by sea or through space" }
      ],
      sentences: [
        { text: "Lanterns ___ the path through the dark garden.", answer: "illuminate", choices: ["illuminate", "resemble", "quench"] },
        { text: "The crowd was ___ when the home team won.", answer: "jubilant", choices: ["desolate", "jubilant", "meticulous"] },
        { text: "Keep the events in ___ order when you retell the story.", answer: "chronological", choices: ["abundant", "formidable", "chronological"] },
        { text: "Cold water will ___ your thirst after the race.", answer: "quench", choices: ["quench", "persevere", "perceive"] },
        { text: "The ___ innkeeper welcomed every traveler.", answer: "hospitable", choices: ["vast", "hospitable", "elaborate"] },
        { text: "It took a long ___ to reach the far islands.", answer: "voyage", choices: ["voyage", "benevolent", "abundant"] }
      ]
    }
  ]
});
