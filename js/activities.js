"use strict";
/* ============================================================
   ACTIVITIES — renders every challenge type into the overlay
   and reports { correct, mistakes } back to the caller.
   Skill dimensions are deliberately distinct:
   - hear:       audio -> written word     (auditory recognition)
   - read:       written word -> picture   (independent decoding, NO audio)
   - meaning:    picture/definition -> word (comprehension)
   - spell/spot: producing & judging spellings
   - recognize/recall: two directions of vocabulary
   - verse/versebuild/fact: Scripture memory & knowledge
   - solve:      math fluency
   - speak:      optional read-aloud with the microphone
   ============================================================ */
var Activities = (function () {
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // What the voice says for a challenge's word: an author's `say`
  // respelling when there is one (homographs, Latin, names), else the word.
  function spoken(ch) { return ch.say || ch.word; }

  function celebrate() {
    var el = $("overlay-card");
    for (var i = 0; i < 14; i++) {
      var s = document.createElement("div");
      s.className = "spark";
      s.textContent = ["✨", "⭐", "🌟", "🎉"][i % 4];
      s.style.left = (10 + Math.random() * 80) + "%";
      s.style.animationDelay = (Math.random() * 0.3) + "s";
      el.appendChild(s);
      (function (sp) { setTimeout(function () { sp.remove(); }, 1400); })(s);
    }
  }

  // Every 🔊 goes through here so TTS is warmed inside the same tap
  // (iPad Safari requires that).
  function bindSpeak(id, getText, rate) {
    var el = $(id);
    if (!el) return;
    function textOf() { return typeof getText === "function" ? getText() : getText; }
    function pulse() {
      // Visible confirmation that the tap landed. Without it, a child who
      // hears nothing for a beat decides the button is dead and stops using
      // it — which is exactly how a slow voice engine gets reported as
      // "the speaker buttons don't work".
      el.classList.remove("speaking");
      void el.offsetWidth;
      el.classList.add("speaking");
      setTimeout(function () { el.classList.remove("speaking"); }, 650);
    }
    el.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      GameAudio.unlock();
      GameAudio.say(textOf(), rate);
      pulse();
    });
    // iOS Safari often treats click, not pointerdown, as the trusted
    // speech-synthesis gesture. If pointerdown's speak was dropped,
    // this retry is still inside the same tap.
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      GameAudio.unlock();
      GameAudio.say(textOf(), rate, { fallback: true });
    });
  }

  // shared: grid of tappable choices; one is correct
  function fillChoices(gridId, choices, correct, onDone, opts) {
    opts = opts || {};
    var mistakes = 0, done = false;
    var grid = $(gridId);
    choices.forEach(function (choice) {
      var b = document.createElement("button");
      b.className = "word-block" + (opts.emoji ? " emoji-block" : "") + (opts.small ? " small-block" : "");
      b.textContent = choice;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done) return;
        if (String(choice) === String(correct)) {
          done = true;
          GameAudio.sfx.correct();
          b.classList.add("right");
          if (opts.onRight) opts.onRight(choice);
          celebrate();
          setTimeout(function () {
            UI.closeOverlay();
            onDone({ correct: true, mistakes: mistakes });
          }, 900);
        } else {
          mistakes++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 500);
          if (opts.onWrong) opts.onWrong();
        }
      });
      grid.appendChild(b);
    });
  }

  /* ---------------- hear: audio -> tap the word ---------------- */
  function showHear(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "🔮 Wonderstone!") + "</div>" +
      "<div class='ch-sub'>Tap the word you hear!</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.word, onDone, {
      onWrong: function () { GameAudio.warm(); GameAudio.say(spoken(ch)); }
    });
    bindSpeak("ch-speak", spoken(ch));
    GameAudio.say(spoken(ch));   // same call stack as the opening tap
  }

  /* ------- read: written word (NO audio) -> tap the picture ------- */
  function showRead(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "Read this word") + "</div>" +
      // shown exactly as the content spells it: beginning readers meet
      // sight words in lowercase, and "I" stays "I"
      "<div class='read-word'>" + esc(ch.word) + "</div>" +
      "<div class='ch-sub'>Read it all by yourself, then tap the matching picture!</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 What do I do?</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    var mistakes = 0, done = false;
    var grid = $("ch-grid");
    ch.pictures.forEach(function (pic) {
      var b = document.createElement("button");
      b.className = "word-block emoji-block";
      b.textContent = pic.emoji;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done) return;
        if (pic.emoji === ch.answer) {
          done = true;
          GameAudio.sfx.correct();
          b.classList.add("right");
          GameAudio.say(spoken(ch) + "! Great reading!");
          celebrate();
          setTimeout(function () { UI.closeOverlay(); onDone({ correct: true, mistakes: mistakes }); }, 900);
        } else {
          mistakes++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 500);
        }
      });
      grid.appendChild(b);
    });
    // instruction only — never speaks the target word
    bindSpeak("ch-speak", "Read the word, then tap the picture that matches.");
  }

  /* ------- meaning: big picture -> tap the word ------- */
  function showMeaning(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "What word is this?") + "</div>" +
      "<button type='button' class='picture-hero' id='ch-picture'>" + (ch.emoji || "❓") + "</button>" +
      "<div class='ch-sub'>Tap the picture or 🔊 to hear it, then tap the word!</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    bindSpeak("ch-picture", spoken(ch));
    bindSpeak("ch-speak", spoken(ch));
    fillChoices("ch-grid", ch.choices, ch.word, onDone, {
      onRight: function () { GameAudio.say(spoken(ch)); }
    });
  }

  /* ------- meaningdef: definition -> tap the word ------- */
  function showMeaningDef(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "Which word means...") + "</div>" +
      "<div class='sentence-text'>“" + esc(ch.meaning) + "”</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Read it to me</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    bindSpeak("ch-speak", "Which word means: " + ch.meaning);
    fillChoices("ch-grid", ch.choices, ch.word, onDone, {
      small: true,
      onRight: function () { GameAudio.say(spoken(ch) + ". " + ch.meaning); }
    });
    GameAudio.say("Which word means: " + ch.meaning);
  }

  /* ------- sentence: read it -> tap the matching answer ------- */
  function showSentence(ch, onDone, intro) {
    var isEmoji = ch.choices.every(function (c) { return String(c).length <= 4; });
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "📜 Secret Message!") + "</div>" +
      "<div class='sentence-text'>" + esc(ch.text) + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Help me read it</button>" +
      "<div class='ch-sub'>" + (isEmoji ? "Tap the picture that matches!" : "Tap the best answer!") + "</div>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.answer, onDone, { emoji: isEmoji, small: !isEmoji });
    bindSpeak("ch-speak", ch.say || ch.text, 0.8);
  }

  /* ------- spell: build the word from letter tiles ------- */
  function showSpell(ch, onDone, intro) {
    var mistakes = 0, next = 0, missesHere = 0, done = false;
    var spoken = ch.speakWord || ch.word;
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "🧰 Build the word!") + "</div>" +
      "<div class='ch-sub'>" + (ch.hint ? "Spell the word for: <b>" + esc(ch.hint) + "</b>" : "Listen, then build the word!") + "</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='spell-slots' id='ch-slots'></div>" +
      "<div class='tile-grid' id='ch-tiles'></div>"
    );
    var letters = ch.word.replace(/[^a-z]/gi, "").toLowerCase();
    var slots = $("ch-slots");
    letters.split("").forEach(function () {
      var s = document.createElement("div");
      s.className = "spell-slot";
      slots.appendChild(s);
    });
    var tiles = $("ch-tiles");
    ch.tiles.forEach(function (letter) {
      var b = document.createElement("button");
      b.className = "letter-tile";
      b.textContent = letter.toUpperCase();
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done || b.classList.contains("used")) return;
        if (letter === letters[next]) {
          GameAudio.sfx.pop();
          GameAudio.sayLetter(letter);
          b.classList.add("used");
          slots.children[next].textContent = letter.toUpperCase();
          slots.children[next].classList.add("filled");
          next++;
          missesHere = 0;
          if (next >= letters.length) {
            done = true;
            GameAudio.sfx.correct();
            setTimeout(function () { GameAudio.say(spoken + "! Great job!"); }, 250);
            celebrate();
            setTimeout(function () { UI.closeOverlay(); onDone({ correct: true, mistakes: mistakes }); }, 1200);
          }
        } else {
          mistakes++; missesHere++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 450);
          if (missesHere >= 2) {
            slots.children[next].textContent = letters[next].toUpperCase();
            slots.children[next].classList.add("hint");
          }
        }
      });
      tiles.appendChild(b);
    });
    bindSpeak("ch-speak", spoken);
    GameAudio.say(spoken);
  }

  /* ------- spot: tap the correct spelling ------- */
  function showSpot(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "✏️ Spelling check!") + "</div>" +
      "<div class='ch-sub'>Tap the CORRECT spelling!</div>" +
      "<button type='button' class='speak-btn' id='ch-speak'>🔊</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.word, onDone, {});
    bindSpeak("ch-speak", spoken(ch));
    GameAudio.say(spoken(ch));
  }

  /* ------- recognize: English -> tap the foreign word ------- */
  function showRecognize(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "🏛️ " + esc(ch.language) + " time!") + "</div>" +
      "<div class='read-word small-word'>" + esc(ch.back) + "</div>" +
      "<div class='ch-sub'>Tap the " + esc(ch.language) + " word that means this!</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Say it in English</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.front, onDone, { small: true });
    bindSpeak("ch-speak", ch.back);
    GameAudio.say(ch.back);
  }

  /* ------- recall: foreign word -> tap the English ------- */
  function showRecall(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "🏛️ What does it mean?") + "</div>" +
      "<div class='read-word small-word'>" + esc(ch.front) + "</div>" +
      "<div class='ch-sub'>What does this " + esc(ch.language) + " word mean?</div>" +
      // Safe to say aloud: it reads the foreign word, not the English answer.
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Say the word</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.back, onDone, { small: true,
      onRight: function () { GameAudio.say((ch.say || ch.front) + " means " + ch.back); } });
    bindSpeak("ch-speak", ch.say || ch.front);
  }

  /* ------- verseblank: complete the verse ------- */
  function showVerseBlank(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "📜 Complete the verse") + "</div>" +
      "<div class='sentence-text verse-text'>" + esc(ch.pre) + " <span class='verse-gap' id='ch-gap'>_____</span> " + esc(ch.post) + "</div>" +
      "<div class='verse-ref'>" + esc(ch.ref) + (ch.trans ? " (" + esc(ch.trans) + ")" : "") + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Read it to me</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.answer, onDone, { small: true,
      onRight: function () {
        $("ch-gap").textContent = ch.answer;
        $("ch-gap").classList.add("filled");
        GameAudio.say((ch.say || ch.text) + ". " + ch.ref);
      }
    });
    bindSpeak("ch-speak", ch.say ? ch.say + ". " + ch.ref : ch.pre + " ... " + ch.post + ". " + ch.ref, 0.8);
  }

  /* ------- versebuild: tap the words in order ------- */
  function showVerseBuild(ch, onDone, intro) {
    var mistakes = 0, next = 0, done = false, missesHere = 0;
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "📜 Build the verse") + "</div>" +
      "<div class='ch-sub'>Tap the words in order!</div>" +
      "<div class='sentence-text verse-text' id='ch-built'>&nbsp;</div>" +
      "<div class='verse-ref'>" + esc(ch.ref) + (ch.trans ? " (" + esc(ch.trans) + ")" : "") + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Say the verse</button>" +
      "<div class='word-grid' id='ch-words'></div>"
    );
    var built = $("ch-built");
    var grid = $("ch-words");
    var order = ch.words;
    shuffledCopy(order).forEach(function (w) {
      var b = document.createElement("button");
      b.className = "word-block small-block verse-word";
      b.textContent = w;
      b.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        if (done || b.classList.contains("used")) return;
        if (w === order[next]) {
          GameAudio.sfx.pop();
          b.classList.add("used");
          built.textContent = (built.textContent.trim() ? built.textContent + " " : "") + w;
          next++;
          missesHere = 0;
          if (next >= order.length) {
            done = true;
            GameAudio.sfx.correct();
            celebrate();
            GameAudio.say((ch.say || ch.text) + ". " + ch.ref, 0.85);
            setTimeout(function () { UI.closeOverlay(); onDone({ correct: true, mistakes: mistakes }); }, 1400);
          }
        } else {
          mistakes++; missesHere++;
          GameAudio.sfx.wrong();
          b.classList.add("wrong");
          setTimeout(function () { b.classList.remove("wrong"); }, 450);
          if (missesHere >= 2) {
            // gentle hint: glow the right next word
            var kids = grid.children;
            for (var i = 0; i < kids.length; i++) {
              if (!kids[i].classList.contains("used") && kids[i].textContent === order[next]) {
                kids[i].classList.add("hint-glow");
                (function (el) { setTimeout(function () { el.classList.remove("hint-glow"); }, 1600); })(kids[i]);
                break;
              }
            }
          }
        }
      });
      grid.appendChild(b);
    });
    bindSpeak("ch-speak", (ch.say || ch.text) + ". " + ch.ref, 0.8);
    GameAudio.say(ch.say || ch.text, 0.8);
  }

  function shuffledCopy(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    // ensure it is not accidentally already in order (annoyingly easy)
    if (a.length > 2 && a.join(" ") === arr.join(" ")) { var t2 = a[0]; a[0] = a[1]; a[1] = t2; }
    return a;
  }

  /* ------- fact: Bible knowledge question ------- */
  function showFact(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "📜 Bible question") + "</div>" +
      "<div class='sentence-text'>" + esc(ch.q) + "</div>" +
      "<div class='verse-ref'>" + esc(ch.ref) + "</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Read it to me</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    fillChoices("ch-grid", ch.choices, ch.answer, onDone, { small: true,
      onRight: function () { GameAudio.say(ch.answer + ". You can read it in " + ch.ref); } });
    bindSpeak("ch-speak", ch.say || ch.q, 0.85);
    GameAudio.say(ch.say || ch.q, 0.85);
  }

  /* ------- math ------- */
  function showMath(ch, onDone, intro) {
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "🔢 Quick math!") + "</div>" +
      "<div class='read-word'>" + esc(ch.q) + " = ?</div>" +
      "<button type='button' class='speak-btn small' id='ch-speak'>🔊 Read it to me</button>" +
      "<div class='word-grid' id='ch-grid'></div>"
    );
    var spokenQ = ch.q.replace("×", "times").replace("÷", "divided by").replace("−", "minus").replace("+", "plus");
    fillChoices("ch-grid", ch.choices, ch.answer, onDone, {
      onRight: function () { GameAudio.say(spokenQ + " equals " + ch.answer + "!"); }
    });
    bindSpeak("ch-speak", spokenQ);
  }

  /* ------- speak: optional read-aloud with the mic ------- */
  function showSpeak(ch, onDone, intro) {
    var mistakes = 0, done = false, listening = false;
    UI.openOverlay(
      "<div class='ch-title'>" + (intro || "Say this word") + "</div>" +
      "<div class='read-word'>" + esc(ch.word) + "</div>" +
      "<div class='ch-sub'>Tap the mic and say the word out loud.</div>" +
      "<button type='button' class='speak-btn small' id='ch-mic'>🎤 Tap and say it</button>" +
      "<div class='ch-sub' id='ch-listen-status'></div>" +
      "<button type='button' class='ghost-btn' id='ch-skip-mic'>Skip — mic not working</button>"
    );
    var status = $("ch-listen-status");
    function finish(result) {
      if (done) return;
      done = true;
      GameAudio.stopListen();
      setTimeout(function () { UI.closeOverlay(); onDone(result); }, result.skipped ? 400 : 900);
    }
    function skip(reason) {
      status.textContent = reason || "No worries — another time!";
      GameAudio.sfx.pop();
      finish({ correct: true, mistakes: 0, skipped: true });
    }
    $("ch-skip-mic").addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      skip("Skipped. Keep playing!");
    });
    if (!GameAudio.canListen()) { skip("This device couldn't start the microphone. Skipping."); return; }
    $("ch-mic").addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      if (done || listening) return;
      listening = true;
      GameAudio.warm();
      status.textContent = "Listening… say the word!";
      $("ch-mic").textContent = "🎤 Listening…";
      GameAudio.listenFor(ch.word, function (res) {
        listening = false;
        if (done) return;
        if (res.matched) {
          GameAudio.sfx.correct();
          status.textContent = "Got it!";
          celebrate();
          finish({ correct: true, mistakes: mistakes });
          return;
        }
        if (res.error === "unavailable" || res.error === "start-failed" ||
            res.error === "not-allowed" || res.error === "service-not-allowed") {
          skip("Couldn't use the mic here. Skipping — not a miss.");
          return;
        }
        if (res.error === "ended" && !res.heard) {
          $("ch-mic").textContent = "🎤 Tap and say it";
          status.textContent = "Didn't catch that. Tap the mic and try again.";
          return;
        }
        mistakes++;
        GameAudio.sfx.wrong();
        $("ch-mic").textContent = "🎤 Try again";
        status.textContent = res.heard ? "Heard something else. Try once more!" : "Didn't catch that. Try once more!";
        if (mistakes >= 2) {
          status.textContent = "Nice try! Let's keep playing.";
          finish({ correct: false, mistakes: mistakes });
        }
      });
    });
  }

  /* ---------------- dispatcher ---------------- */
  function present(ch, onDone, intro) {
    if (!ch) { onDone({ correct: true, mistakes: 0, skipped: true }); return; }
    switch (ch.kind) {
      case "hear": return showHear(ch, onDone, intro);
      case "read": return showRead(ch, onDone, intro);
      case "meaning": return showMeaning(ch, onDone, intro);
      case "meaningdef": return showMeaningDef(ch, onDone, intro);
      case "sentence": return showSentence(ch, onDone, intro);
      case "spell": return showSpell(ch, onDone, intro);
      case "spot": return showSpot(ch, onDone, intro);
      case "recognize": return showRecognize(ch, onDone, intro);
      case "recall": return showRecall(ch, onDone, intro);
      case "verseblank": return showVerseBlank(ch, onDone, intro);
      case "versebuild": return showVerseBuild(ch, onDone, intro);
      case "fact": return showFact(ch, onDone, intro);
      case "math": return showMath(ch, onDone, intro);
      case "speak": return showSpeak(ch, onDone, intro);
      default: onDone({ correct: true, mistakes: 0, skipped: true });
    }
  }

  return { present: present, celebrate: celebrate, bindSpeak: bindSpeak };
})();
