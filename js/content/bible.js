"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — BIBLE (first-class, accuracy-first)

   Standards for this file:
   - Memory verses are quoted verbatim from the King James
     Version (public domain). The translation is labeled in
     the parent dashboard and on each card.
   - Knowledge questions state only what the cited passage
     says. Every item carries its Scripture reference so
     parents can audit it.
   - No invented events, dialogue, motives, or chronology.
   - No denominationally disputed interpretations.
   Parents control how much Bible material appears (weighting)
   and can add their own verses, catechism, or church
   curriculum in the Parents area.

   Activities:
   - verse-blank: the verse with one word missing -> choose it
   - verse-build: tap the words of the verse in order
   - fact:        multiple choice with the reference shown
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "bible1", name: "Bible · Verses & Stories", subject: "bible", grade: "all",
  icon: "📜",
  desc: "Memory verses (KJV) and Bible knowledge questions, each with its Scripture reference.",
  translation: "KJV",
  tiers: [
    {
      name: "Beginnings",
      focus: "creation, the flood, and the patriarchs (Genesis)",
      verses: [
        { ref: "Genesis 1:1", text: "In the beginning God created the heaven and the earth." },
        { ref: "Psalm 118:24", text: "This is the day which the LORD hath made; we will rejoice and be glad in it." },
        { ref: "Psalm 56:3", text: "What time I am afraid, I will trust in thee." },
        { ref: "1 Thessalonians 5:17", text: "Pray without ceasing." }
      ],
      facts: [
        { q: "What did God create on the first day?", a: "Light",
          choices: ["Light", "Animals", "The sea", "Trees"], ref: "Genesis 1:3–5" },
        { q: "After making everything in six days, what did God do on the seventh day?", a: "He rested",
          choices: ["He rested", "He made the stars", "He planted a garden", "He sent rain"], ref: "Genesis 2:2–3" },
        { q: "What was the name of the garden God planted for the man?", a: "Eden",
          choices: ["Eden", "Canaan", "Ararat", "Goshen"], ref: "Genesis 2:8" },
        { q: "Who built the ark before the flood?", a: "Noah",
          choices: ["Noah", "Moses", "Abraham", "Adam"], ref: "Genesis 6:13–14" },
        { q: "What sign did God set in the cloud as a promise after the flood?", a: "The rainbow",
          choices: ["The rainbow", "A star", "A dove", "Lightning"], ref: "Genesis 9:13" },
        { q: "At Babel, what did God confuse so the people scattered?", a: "Their language",
          choices: ["Their language", "Their maps", "Their tools", "Their flocks"], ref: "Genesis 11:7–9" },
        { q: "Which son was born to Abraham and Sarah in their old age, just as God promised?", a: "Isaac",
          choices: ["Isaac", "Ishmael", "Esau", "Joseph"], ref: "Genesis 21:1–3" },
        { q: "What were the names of Isaac and Rebekah's twin sons?", a: "Esau and Jacob",
          choices: ["Esau and Jacob", "Cain and Abel", "Moses and Aaron", "James and John"], ref: "Genesis 25:24–26" },
        { q: "Jacob was given a new name by God. What was it?", a: "Israel",
          choices: ["Israel", "Abraham", "Judah", "Benjamin"], ref: "Genesis 32:28" },
        { q: "What special gift did Jacob give his son Joseph?", a: "A coat of many colours",
          choices: ["A coat of many colours", "A gold ring", "A flock of sheep", "A silver cup"], ref: "Genesis 37:3" },
        { q: "How did Joseph come to be in Egypt?", a: "His brothers sold him",
          choices: ["His brothers sold him", "He sailed there", "Pharaoh invited him", "He was lost"], ref: "Genesis 37:28" },
        { q: "What did Joseph store up in Egypt before the famine?", a: "Grain (corn)",
          choices: ["Grain (corn)", "Gold", "Olive oil", "Horses"], ref: "Genesis 41:48–49" }
      ]
    },
    {
      name: "Out of Egypt",
      focus: "Moses, the Exodus, and the journey to the promised land",
      verses: [
        { ref: "Exodus 20:12", text: "Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee." },
        { ref: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path." },
        { ref: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble." },
        { ref: "Proverbs 3:5", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." }
      ],
      facts: [
        { q: "Where did Moses' mother place him to keep him safe as a baby?", a: "In a basket by the river",
          choices: ["In a basket by the river", "In a cave", "On a mountain", "In a stable"], ref: "Exodus 2:3" },
        { q: "How did God speak to Moses in the desert?", a: "From a burning bush",
          choices: ["From a burning bush", "In a whirlwind", "Through a dove", "From a cloud of birds"], ref: "Exodus 3:2–4" },
        { q: "What happened to the Red Sea when Moses stretched out his hand?", a: "It was divided",
          choices: ["It was divided", "It froze", "It dried up slowly", "It turned to blood"], ref: "Exodus 14:21" },
        { q: "What bread did God send from heaven in the wilderness?", a: "Manna",
          choices: ["Manna", "Barley loaves", "Unleavened cakes", "Honey bread"], ref: "Exodus 16:14–15" },
        { q: "On which mountain did God give Moses the Ten Commandments?", a: "Mount Sinai",
          choices: ["Mount Sinai", "Mount Ararat", "Mount Carmel", "Mount of Olives"], ref: "Exodus 19:20; 20:1–17" },
        { q: "What happened to the walls of Jericho after Israel marched and shouted?", a: "They fell down flat",
          choices: ["They fell down flat", "They caught fire", "The gates opened", "They grew taller"], ref: "Joshua 6:20" },
        { q: "Who said to Naomi, 'thy people shall be my people, and thy God my God'?", a: "Ruth",
          choices: ["Ruth", "Esther", "Miriam", "Hannah"], ref: "Ruth 1:16" },
        { q: "What did young David use to defeat Goliath?", a: "A sling and a stone",
          choices: ["A sling and a stone", "A sword and shield", "A spear", "A bow and arrow"], ref: "1 Samuel 17:49–50" },
        { q: "What did King Solomon ask God for?", a: "An understanding heart (wisdom)",
          choices: ["An understanding heart (wisdom)", "Long life", "Riches", "Victory in battle"], ref: "1 Kings 3:9–12" },
        { q: "Which birds brought Elijah bread and flesh by the brook?", a: "Ravens",
          choices: ["Ravens", "Doves", "Eagles", "Sparrows"], ref: "1 Kings 17:6" }
      ]
    },
    {
      name: "Brave and Faithful",
      focus: "Daniel, Jonah, Esther, and the Psalms",
      verses: [
        { ref: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want." },
        { ref: "Psalm 19:1", text: "The heavens declare the glory of God; and the firmament sheweth his handywork." },
        { ref: "Proverbs 15:1", text: "A soft answer turneth away wrath: but grievous words stir up anger." },
        { ref: "Proverbs 17:17", text: "A friend loveth at all times, and a brother is born for adversity." }
      ],
      facts: [
        { q: "How was Daniel kept safe in the den of lions?", a: "God's angel shut the lions' mouths",
          choices: ["God's angel shut the lions' mouths", "He hid in a corner", "The lions were asleep", "He climbed out"], ref: "Daniel 6:22" },
        { q: "Who walked with Shadrach, Meshach, and Abed-nego so the fire did not hurt them?", a: "A fourth man, sent by God",
          choices: ["A fourth man, sent by God", "The king", "A soldier", "No one"], ref: "Daniel 3:24–25, 28" },
        { q: "How long was Jonah inside the great fish?", a: "Three days and three nights",
          choices: ["Three days and three nights", "One night", "Seven days", "Forty days"], ref: "Jonah 1:17" },
        { q: "Where did God tell Jonah to go and preach?", a: "Nineveh",
          choices: ["Nineveh", "Tarshish", "Jerusalem", "Babylon"], ref: "Jonah 1:1–2" },
        { q: "Which brave queen asked the king to save her people?", a: "Esther",
          choices: ["Esther", "Ruth", "Deborah", "Abigail"], ref: "Esther 7:3" },
        { q: "Which book of the Bible begins, 'The LORD is my shepherd'?", a: "Psalms (Psalm 23)",
          choices: ["Psalms (Psalm 23)", "Proverbs", "Genesis", "Isaiah"], ref: "Psalm 23:1" },
        { q: "What is the first book of the Bible?", a: "Genesis",
          choices: ["Genesis", "Exodus", "Matthew", "Psalms"], ref: "Genesis 1:1" },
        { q: "Which four books tell the story of Jesus' life on earth?", a: "Matthew, Mark, Luke, John",
          choices: ["Matthew, Mark, Luke, John", "Genesis, Exodus, Leviticus, Numbers", "Acts, Romans, Hebrews, James", "Psalms, Proverbs, Ecclesiastes, Job"], ref: "the four Gospels" }
      ]
    },
    {
      name: "Good News",
      focus: "the life of Jesus and the early church",
      verses: [
        { ref: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
        { ref: "John 1:1", text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
        { ref: "Matthew 5:16", text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven." },
        { ref: "1 John 4:19", text: "We love him, because he first loved us." },
        { ref: "Ephesians 6:1", text: "Children, obey your parents in the Lord: for this is right." },
        { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." }
      ],
      facts: [
        { q: "In what town was Jesus born?", a: "Bethlehem",
          choices: ["Bethlehem", "Nazareth", "Jerusalem", "Capernaum"], ref: "Luke 2:4–7" },
        { q: "Where did Mary lay baby Jesus?", a: "In a manger",
          choices: ["In a manger", "In a palace bed", "In a boat", "On a rooftop"], ref: "Luke 2:7" },
        { q: "Who heard the angels' good tidings in the fields at night?", a: "Shepherds",
          choices: ["Shepherds", "Kings", "Fishermen", "Soldiers"], ref: "Luke 2:8–11" },
        { q: "What led the wise men to the young child Jesus?", a: "A star",
          choices: ["A star", "A map", "An angel choir", "A messenger"], ref: "Matthew 2:9–10" },
        { q: "Who baptized Jesus in the river Jordan?", a: "John the Baptist",
          choices: ["John the Baptist", "Peter", "Elijah", "Andrew"], ref: "Matthew 3:13–17" },
        { q: "How many disciples did Jesus choose?", a: "Twelve",
          choices: ["Twelve", "Seven", "Ten", "Seventy"], ref: "Matthew 10:1–4" },
        { q: "What food did Jesus use to feed five thousand people?", a: "Five loaves and two fishes",
          choices: ["Five loaves and two fishes", "Seven loaves only", "A basket of figs", "Bread and honey"], ref: "John 6:9–13" },
        { q: "What did Jesus say to the storm on the sea?", a: "Peace, be still",
          choices: ["Peace, be still", "Go away", "Rise up", "Be strong"], ref: "Mark 4:39" },
        { q: "In Jesus' parable, who stopped to help the wounded traveler?", a: "A Samaritan",
          choices: ["A Samaritan", "A priest", "A Levite", "A soldier"], ref: "Luke 10:33–34" },
        { q: "In the parable of the lost son, what did the father do when his son returned?", a: "He ran and embraced him",
          choices: ["He ran and embraced him", "He closed the door", "He sent him to the fields", "He said nothing"], ref: "Luke 15:20" },
        { q: "Who climbed a sycomore tree to see Jesus?", a: "Zacchaeus",
          choices: ["Zacchaeus", "Nicodemus", "Bartimaeus", "Matthew"], ref: "Luke 19:2–4" },
        { q: "On what day was Jesus raised from the dead?", a: "The third day",
          choices: ["The third day", "The seventh day", "The next morning", "After forty days"], ref: "Luke 24:6–7" },
        { q: "Who came to Jesus' tomb early and found the stone rolled away?", a: "The women who followed him",
          choices: ["The women who followed him", "Pilate", "The chief priests", "The twelve together"], ref: "Luke 24:1–3, 10" },
        { q: "What sound was heard from heaven on the day of Pentecost?", a: "A rushing mighty wind",
          choices: ["A rushing mighty wind", "Thunder", "Trumpets", "Singing"], ref: "Acts 2:1–2" },
        { q: "What did Saul see on the road to Damascus?", a: "A light from heaven",
          choices: ["A light from heaven", "A burning bush", "An open scroll", "A ladder"], ref: "Acts 9:3" },
        { q: "What were Paul and Silas doing in prison at midnight?", a: "Praying and singing praises",
          choices: ["Praying and singing praises", "Sleeping", "Digging a tunnel", "Arguing"], ref: "Acts 16:25" }
      ]
    }
  ]
});
