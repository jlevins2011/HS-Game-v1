"use strict";
/* ============================================================
   LEARNING ENGINE
   The scheduler that decides WHAT each challenge practices.

   Flow: the game asks for a challenge at a gameplay moment
   (wonderstone, curio chest, crafting, Starfall, super
   challenge). The engine:
     1. picks one of the child's assigned curricula, using the
        parent-set weights (Bible weighting lives here too);
     2. picks a SKILL within that curriculum, favoring skills
        the child is weaker at or hasn't tried;
     3. picks an ITEM, favoring struggling/unseen material and
        resting mastered material (Leitner-style boxes 0..5);
     4. returns a challenge descriptor that activities.js
        knows how to render.

   Results update: per-item-per-skill mastery, weekly stats,
   and the curriculum's difficulty tier (clean wins ramp up,
   rough patches step back — same proven ramp as v1).
   ============================================================ */
var Learning = (function () {

  /* ---------------- helpers ---------------- */
  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(arr, n, excludeFn) {
    var pool = arr.filter(function (x) { return !excludeFn || !excludeFn(x); });
    var out = [];
    while (out.length < n && pool.length) {
      out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
  }
  function pickWeighted(options) {
    options = options.filter(function (o) { return o.weight > 0; });
    if (!options.length) return null;
    var total = 0;
    options.forEach(function (o) { total += o.weight; });
    var r = Math.random() * total;
    for (var i = 0; i < options.length; i++) {
      r -= options[i].weight;
      if (r <= 0) return options[i];
    }
    return options[0];
  }

  /* ---------------- assignments ---------------- */
  function activeAssignments() {
    if (!Store.profile) return [];
    return Store.assignmentsFor(Store.profile.id).filter(function (a) {
      return !!Store.curriculum(a.cid) && a.weight > 0;
    });
  }

  function tierState(cid) {
    var t = Store.data.learn.tiers;
    if (!t[cid]) t[cid] = { tier: 0, tierWins: 0, struggle: 0 };
    return t[cid];
  }

  function tiersOf(cur) { return cur.tiers || []; }

  function pickTierIndex(cur, boost) {
    var tiers = tiersOf(cur);
    if (tiers.length <= 1) return 0;
    var st = tierState(cur.id);
    var t = Math.min(st.tier, tiers.length - 1);
    if (boost) return Math.min(t + boost, tiers.length - 1);
    if (t > 0 && Math.random() < CONFIG.LEARN.reviewChance) return t - 1;
    return t;
  }

  /* ---------------- items, normalized per subject ---------------- */
  // -> [{ key, ...subject-specific fields }]
  function itemsOf(cur, tierIdx) {
    var tier = tiersOf(cur)[tierIdx] || {};
    var out = [];
    if (cur.subject === "reading") {
      (tier.words || []).forEach(function (w) {
        out.push({ key: w.word.toLowerCase(), word: w.word, emoji: w.emoji || null, meaning: w.meaning || null });
      });
    } else if (cur.subject === "spelling") {
      (tier.words || []).forEach(function (w) {
        var word = typeof w === "string" ? w : w.word;
        out.push({ key: word.toLowerCase(), word: word });
      });
    } else if (cur.subject === "vocab") {
      (tier.pairs || []).forEach(function (p) {
        out.push({ key: p[0].toLowerCase(), front: p[0], back: p[1] });
      });
    } else if (cur.subject === "bible" || cur.subject === "quiz") {
      (tier.verses || []).forEach(function (v) {
        out.push({ key: "v:" + v.ref, kind: "verse", ref: v.ref, text: v.text });
      });
      (tier.facts || []).forEach(function (f) {
        out.push({ key: "q:" + f.q.slice(0, 60), kind: "fact", q: f.q, a: f.a, choices: f.choices, ref: f.ref });
      });
    }
    return out;
  }

  /* ---------------- mastery ---------------- */
  function masteryOf(cid, itemKey, skill) {
    var m = Store.data.learn.mastery;
    if (!m[cid]) m[cid] = {};
    if (!m[cid][itemKey]) m[cid][itemKey] = {};
    if (!m[cid][itemKey][skill]) m[cid][itemKey][skill] = { box: -1, win: 0, miss: 0, last: 0 };
    return m[cid][itemKey][skill];
  }

  function itemWeight(cid, itemKey, skill) {
    var m = Store.data.learn.mastery;
    var rec = m[cid] && m[cid][itemKey] && m[cid][itemKey][skill];
    if (!rec || rec.box < 0) return CONFIG.LEARN.unseenWeight;
    var w = CONFIG.LEARN.boxWeights[Math.min(rec.box, CONFIG.LEARN.boxWeights.length - 1)];
    // long-untouched mastered items drift back up for review
    var days = (Date.now() - rec.last) / 86400000;
    if (rec.box >= 3 && days > 5) w *= 2;
    return w;
  }

  function isStruggling(cid, itemKey, skill) {
    var m = Store.data.learn.mastery;
    var rec = m[cid] && m[cid][itemKey] && m[cid][itemKey][skill];
    return !!rec && rec.miss > rec.win;
  }

  function chooseItem(cid, items, skill) {
    if (!items.length) return null;
    var struggling = items.filter(function (it) { return isStruggling(cid, it.key, skill); });
    if (struggling.length && Math.random() < CONFIG.LEARN.strugglePickChance) {
      return struggling[Math.floor(Math.random() * struggling.length)];
    }
    var opts = items.map(function (it) {
      return { item: it, weight: itemWeight(cid, it.key, skill) };
    });
    var pick = pickWeighted(opts);
    return pick ? pick.item : items[0];
  }

  /* ---------------- skill selection ---------------- */
  // How hungry is a skill for practice? Untried skills get a nudge;
  // skills with a weak first-try rate get asked more often.
  function skillNeed(subject, skill) {
    var bag = Store.data.stats.challenges || {};
    var c = bag[subject + "/" + skill];
    if (!c || c.tries < 2) return 1.2;
    var rate = c.clean / Math.max(1, c.tries);
    return 0.35 + (1 - rate) * 1.8;
  }

  function skillMix(cur, items, canSpeak) {
    var s = cur.subject;
    var haveEmoji = items.some(function (it) { return it.emoji; });
    var haveMeaning = items.some(function (it) { return it.meaning; });
    var mix = [];
    if (s === "reading") {
      mix.push({ skill: "hear", weight: skillNeed(s, "hear") });
      if (haveEmoji) {
        mix.push({ skill: "read", weight: skillNeed(s, "read") * 1.25 });
        mix.push({ skill: "meaning", weight: skillNeed(s, "meaning") });
      }
      if (haveMeaning) mix.push({ skill: "meaning", weight: skillNeed(s, "meaning") });
      if (canSpeak) mix.push({ skill: "speak", weight: skillNeed(s, "speak") * 0.35 });
    } else if (s === "spelling") {
      mix.push({ skill: "spot", weight: skillNeed(s, "spot") });
      mix.push({ skill: "spell", weight: skillNeed(s, "spell") * 1.1 });
    } else if (s === "vocab") {
      mix.push({ skill: "recognize", weight: skillNeed(s, "recognize") });
      mix.push({ skill: "recall", weight: skillNeed(s, "recall") * 1.1 });
      mix.push({ skill: "spell", weight: skillNeed(s, "spell") * 0.6 });
    } else if (s === "bible" || s === "quiz") {
      var verses = items.some(function (it) { return it.kind === "verse"; });
      var facts = items.some(function (it) { return it.kind === "fact"; });
      if (verses) {
        mix.push({ skill: "verse", weight: skillNeed(s, "verse") });
        mix.push({ skill: "versebuild", weight: skillNeed(s, "versebuild") * 0.8 });
      }
      if (facts) mix.push({ skill: "fact", weight: skillNeed(s, "fact") });
    } else if (s === "math") {
      mix.push({ skill: "solve", weight: 1 });
    }
    return mix;
  }

  /* ---------------- sentence pool (reading / vocab) ---------------- */
  function sentencesOf(cur, tierIdx) {
    var tier = tiersOf(cur)[tierIdx] || {};
    return tier.sentences || [];
  }

  /* ---------------- challenge builders ---------------- */
  function nChoices(tierIdx, boost) {
    return (tierIdx >= 2 || boost) ? CONFIG.LEARN.choicesHard : CONFIG.LEARN.choicesEasy;
  }

  function base(cur, tierIdx, skill, itemKey) {
    return { cid: cur.id, subject: cur.subject, tier: tierIdx, skill: skill, itemKey: itemKey,
             curName: cur.name };
  }

  function buildReading(cur, tierIdx, skill, boost) {
    var items = itemsOf(cur, tierIdx);
    var n = nChoices(tierIdx, boost);

    if (skill === "read") {
      // written word -> tap the picture; decoys must be DIFFERENT pictures
      var pictured = items.filter(function (it) { return it.emoji; });
      if (!pictured.length) return buildReading(cur, tierIdx, "hear", boost);
      var target = chooseItem(cur.id, pictured, "read");
      var used = {}; used[target.emoji] = true;
      var pool = [];
      for (var t = 0; t < tiersOf(cur).length; t++) {
        itemsOf(cur, t).forEach(function (it) {
          if (it.emoji && !used[it.emoji] && it.key !== target.key) {
            used[it.emoji] = true;
            pool.push(it);
          }
        });
      }
      var decoys = sample(pool, n - 1);
      var pics = shuffled([{ word: target.word, emoji: target.emoji }].concat(
        decoys.map(function (d) { return { word: d.word, emoji: d.emoji }; })));
      return Object.assign(base(cur, tierIdx, "read", target.key), {
        kind: "read", word: target.word, answer: target.emoji, pictures: pics
      });
    }

    if (skill === "meaning") {
      var withEmoji = items.filter(function (it) { return it.emoji; });
      var withMeaning = items.filter(function (it) { return it.meaning; });
      if (withEmoji.length && (!withMeaning.length || Math.random() < 0.5)) {
        var tgt = chooseItem(cur.id, withEmoji, "meaning");
        var dec = sample(items, n - 1, function (x) { return x.key === tgt.key; });
        return Object.assign(base(cur, tierIdx, "meaning", tgt.key), {
          kind: "meaning", word: tgt.word, emoji: tgt.emoji,
          choices: shuffled([tgt.word].concat(dec.map(function (d) { return d.word; })))
        });
      }
      if (withMeaning.length) {
        var tg = chooseItem(cur.id, withMeaning, "meaning");
        var dc = sample(withMeaning, n - 1, function (x) { return x.key === tg.key; });
        return Object.assign(base(cur, tierIdx, "meaning", tg.key), {
          kind: "meaningdef", word: tg.word, meaning: tg.meaning,
          choices: shuffled([tg.word].concat(dc.map(function (d) { return d.word; })))
        });
      }
      return buildReading(cur, tierIdx, "hear", boost);
    }

    if (skill === "speak") {
      var spk = chooseItem(cur.id, items, "speak");
      return Object.assign(base(cur, tierIdx, "speak", spk.key), { kind: "speak", word: spk.word });
    }

    // default: hear
    var tw = chooseItem(cur.id, items, "hear");
    var dw = sample(items, n - 1, function (x) { return x.key === tw.key; });
    return Object.assign(base(cur, tierIdx, "hear", tw.key), {
      kind: "hear", word: tw.word, emoji: tw.emoji,
      choices: shuffled([tw.word].concat(dw.map(function (d) { return d.word; })))
    });
  }

  function buildSentence(cur, tierIdx) {
    var ss = sentencesOf(cur, tierIdx);
    if (!ss.length) return null;
    var s = ss[Math.floor(Math.random() * ss.length)];
    return Object.assign(base(cur, tierIdx, "sentences", "s:" + s.text.slice(0, 40)), {
      kind: "sentence", text: s.text, answer: s.answer, choices: shuffled(s.choices.slice())
    });
  }

  /* ---- realistic misspellings for "spot the correct spelling" ---- */
  function misspell(word) {
    var tries = shuffled([
      function (w) { return w.replace(/ie/, "ei"); },
      function (w) { return w.replace(/ei/, "ie"); },
      function (w) { var m = w.match(/(.)\1/); return m ? w.replace(m[0], m[1]) : w; },
      function (w) {
        var i = 1 + Math.floor(Math.random() * (w.length - 2));
        var c = w[i];
        return "aeiou".indexOf(c) < 0 ? w.slice(0, i) + c + w.slice(i) : w;
      },
      function (w) {
        if (w.length < 4) return w;
        var i = 1 + Math.floor(Math.random() * (w.length - 3));
        return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2);
      },
      function (w) {
        var i = w.length - 1 - Math.floor(Math.random() * Math.min(4, w.length - 2));
        var c = w[i], swap = { a: "e", e: "a", o: "u", u: "o", i: "e" };
        return swap[c] ? w.slice(0, i) + swap[c] + w.slice(i + 1) : w;
      }
    ]);
    for (var i = 0; i < tries.length; i++) {
      var out = tries[i](word);
      if (out !== word) return out;
    }
    return word.split("").reverse().join("");
  }
  function makeMisspellings(word, n) {
    var out = [], guard = 0;
    while (out.length < n && guard++ < 30) {
      var d = misspell(word);
      if (d !== word && out.indexOf(d) < 0) out.push(d);
    }
    return out;
  }

  function spellTiles(word, tierIdx) {
    var letters = word.toLowerCase().replace(/[^a-z]/g, "").split("");
    var alphabet = "abcdefghijklmnopqrstuvwxyz";
    var decoys = [];
    var nDecoys = Math.min(3 + tierIdx, 5);
    var guard = 0;
    while (decoys.length < nDecoys && guard++ < 60) {
      var ch = alphabet[Math.floor(Math.random() * 26)];
      if (letters.indexOf(ch) < 0 && decoys.indexOf(ch) < 0) decoys.push(ch);
    }
    return shuffled(letters.concat(decoys));
  }

  function buildSpelling(cur, tierIdx, skill, boost) {
    var items = itemsOf(cur, tierIdx);
    var target = chooseItem(cur.id, items, skill);
    if (!target) return null;
    if (skill === "spell") {
      return Object.assign(base(cur, tierIdx, "spell", target.key), {
        kind: "spell", word: target.word.toLowerCase(),
        speakWord: target.word, tiles: spellTiles(target.word, tierIdx)
      });
    }
    var n = nChoices(tierIdx, boost);
    return Object.assign(base(cur, tierIdx, "spot", target.key), {
      kind: "spot", word: target.word,
      choices: shuffled([target.word].concat(makeMisspellings(target.word.toLowerCase(), n - 1)))
    });
  }

  function buildVocab(cur, tierIdx, skill, boost) {
    var items = itemsOf(cur, tierIdx);
    var target = chooseItem(cur.id, items, skill);
    if (!target) return null;
    var n = nChoices(tierIdx, boost);
    var decoys = sample(items, n - 1, function (x) { return x.key === target.key; });
    var lang = cur.language || "the new language";
    if (skill === "recall") {
      return Object.assign(base(cur, tierIdx, "recall", target.key), {
        kind: "recall", front: target.front, back: target.back, language: lang,
        choices: shuffled([target.back].concat(decoys.map(function (d) { return d.back; })))
      });
    }
    if (skill === "spell") {
      return Object.assign(base(cur, tierIdx, "spell", target.key), {
        kind: "spell", word: target.front.toLowerCase(), speakWord: target.back,
        hint: target.back, language: lang, tiles: spellTiles(target.front, tierIdx)
      });
    }
    return Object.assign(base(cur, tierIdx, "recognize", target.key), {
      kind: "recognize", front: target.front, back: target.back, language: lang,
      choices: shuffled([target.front].concat(decoys.map(function (d) { return d.front; })))
    });
  }

  var STOPWORDS = ["the", "and", "a", "an", "of", "in", "is", "to", "for", "his", "her",
    "that", "with", "unto", "thy", "which", "it", "be", "not", "so", "i"];
  function buildBible(cur, tierIdx, skill, boost) {
    var items = itemsOf(cur, tierIdx);
    var verses = items.filter(function (it) { return it.kind === "verse"; });
    var facts = items.filter(function (it) { return it.kind === "fact"; });

    if (skill === "fact" && facts.length) {
      var f = chooseItem(cur.id, facts, "fact");
      return Object.assign(base(cur, tierIdx, "fact", f.key), {
        kind: "fact", q: f.q, answer: f.a, choices: shuffled(f.choices.slice()), ref: f.ref
      });
    }

    if (!verses.length) return facts.length ? buildBible(cur, tierIdx, "fact", boost) : null;
    var v = chooseItem(cur.id, verses, skill === "versebuild" ? "versebuild" : "verse");
    var words = v.text.split(/\s+/);

    if (skill === "versebuild" && words.length <= 14) {
      return Object.assign(base(cur, tierIdx, "versebuild", v.key), {
        kind: "versebuild", ref: v.ref, text: v.text, words: words, trans: cur.translation || ""
      });
    }

    // verse-blank: hide one meaningful word
    var idxs = [];
    words.forEach(function (w, i) {
      var clean = w.toLowerCase().replace(/[^a-z]/g, "");
      if (clean.length > 3 && STOPWORDS.indexOf(clean) < 0) idxs.push(i);
    });
    if (!idxs.length) idxs = [Math.floor(words.length / 2)];
    var bi = idxs[Math.floor(Math.random() * idxs.length)];
    var answerWord = words[bi].replace(/[^A-Za-z']/g, "");
    // decoys: other meaningful words from this and other verses
    var pool = [];
    verses.forEach(function (vv) {
      vv.text.split(/\s+/).forEach(function (w) {
        var c = w.replace(/[^A-Za-z']/g, "");
        if (c.length > 3 && c.toLowerCase() !== answerWord.toLowerCase() &&
            STOPWORDS.indexOf(c.toLowerCase()) < 0 && pool.indexOf(c) < 0) pool.push(c);
      });
    });
    var choices = shuffled([answerWord].concat(sample(pool, 3)));
    return Object.assign(base(cur, tierIdx, "verse", v.key), {
      kind: "verseblank", ref: v.ref, text: v.text, trans: cur.translation || "",
      pre: words.slice(0, bi).join(" "),
      post: words.slice(bi + 1).join(" "),
      answer: answerWord, choices: choices
    });
  }

  function buildMath(cur, tierIdx) {
    var tier = tiersOf(cur)[tierIdx] || {};
    var gens = tier.gen || [{ op: "+", aMin: 1, aMax: 9, bMin: 1, bMax: 9 }];
    // generate candidates, then let mastery pick which fact to ask
    var cands = [];
    for (var i = 0; i < 10; i++) {
      var g = gens[Math.floor(Math.random() * gens.length)];
      var a = g.aMin + Math.floor(Math.random() * (g.aMax - g.aMin + 1));
      var b = g.bMin + Math.floor(Math.random() * (g.bMax - g.bMin + 1));
      var q, ans;
      if (g.op === "+") {
        if (g.sumMax && a + b > g.sumMax) { b = Math.max(g.bMin, g.sumMax - a); }
        q = a + " + " + b; ans = a + b;
      } else if (g.op === "-") {
        if (b > a) { var t2 = a; a = b; b = t2; }
        q = a + " − " + b; ans = a - b;
      } else if (g.op === "×") {
        q = a + " × " + b; ans = a * b;
      } else { // ÷
        q = (a * b) + " ÷ " + b; ans = a;
      }
      cands.push({ key: q.replace(/\s/g, ""), q: q, a: ans });
    }
    var target = chooseItem(cur.id, cands, "solve");
    var choices = [target.a];
    var deltas = [1, -1, 2, -2, 10, -10, 3, -3];
    for (var d = 0; d < deltas.length && choices.length < 4; d++) {
      var c = target.a + deltas[d];
      if (c >= 0 && choices.indexOf(c) < 0) choices.push(c);
    }
    return Object.assign(base(cur, tierIdx, "solve", target.key), {
      kind: "math", q: target.q, answer: target.a, choices: shuffled(choices)
    });
  }

  /* ---------------- main entry ---------------- */
  // context: "node" | "chest" | "craft" | "starfall" | "super"
  function getChallenge(context, opts) {
    opts = opts || {};
    var boost = opts.boost || 0;
    if (context === "super") boost = Math.max(boost, 1);   // Elder/Wren challenges run a tier harder
    var assigns = activeAssignments();
    if (!assigns.length) return null;

    var pick = pickWeighted(assigns.map(function (a) {
      return { cid: a.cid, weight: a.weight };
    }));
    if (!pick) return null;
    var cur = Store.curriculum(pick.cid);
    var tierIdx = pickTierIndex(cur, boost);
    var items = itemsOf(cur, tierIdx);
    if (!items.length && cur.subject !== "math") {
      // empty tier (bad custom data) — try tier 0
      tierIdx = 0;
      items = itemsOf(cur, 0);
      if (!items.length && cur.subject !== "math") return null;
    }

    var canSpeak = context === "node" && GameAudio.canListen && GameAudio.canListen();
    var mix = skillMix(cur, items, canSpeak);
    // reading curricula sprinkle in sentence comprehension
    if (cur.subject === "reading" && sentencesOf(cur, tierIdx).length) {
      mix.push({ skill: "sentences", weight: skillNeed("reading", "sentences") * 0.7 });
    }
    if (cur.subject === "vocab" && sentencesOf(cur, tierIdx).length) {
      mix.push({ skill: "sentences", weight: skillNeed("vocab", "sentences") * 0.6 });
    }
    var chosen = pickWeighted(mix.map(function (m) { return { skill: m.skill, weight: m.weight }; }));
    var skill = chosen ? chosen.skill : null;
    if (!skill) return null;

    var ch = null;
    if (skill === "sentences") ch = buildSentence(cur, tierIdx);
    else if (cur.subject === "reading") ch = buildReading(cur, tierIdx, skill, boost);
    else if (cur.subject === "spelling") ch = buildSpelling(cur, tierIdx, skill, boost);
    else if (cur.subject === "vocab") ch = buildVocab(cur, tierIdx, skill, boost);
    else if (cur.subject === "bible" || cur.subject === "quiz") ch = buildBible(cur, tierIdx, skill, boost);
    else if (cur.subject === "math") ch = buildMath(cur, tierIdx);
    if (!ch) ch = buildFallback(cur, tierIdx, boost);
    return ch;
  }

  function buildFallback(cur, tierIdx, boost) {
    if (cur.subject === "reading") return buildReading(cur, tierIdx, "hear", boost);
    if (cur.subject === "spelling") return buildSpelling(cur, tierIdx, "spot", boost);
    if (cur.subject === "vocab") return buildVocab(cur, tierIdx, "recognize", boost);
    if (cur.subject === "bible" || cur.subject === "quiz") return buildBible(cur, tierIdx, "fact", boost);
    if (cur.subject === "math") return buildMath(cur, tierIdx);
    return null;
  }

  /* ---------------- results ---------------- */
  function report(ch, result) {
    if (!ch) return;
    // 1. mastery box for this item+skill
    if (ch.itemKey) {
      var rec = masteryOf(ch.cid, ch.itemKey, ch.skill);
      if (rec.box < 0) rec.box = 0;
      if (result.correct && result.mistakes === 0) {
        rec.box = Math.min(5, rec.box + 1);
        rec.win += 1;
      } else if (result.mistakes > 0) {
        rec.box = Math.max(0, rec.box - (result.mistakes >= 3 ? 2 : 1));
        rec.miss += 1;
      }
      rec.last = Date.now();
    }
    // 2. weekly stats
    Stats.recordChallenge(ch, result);
    // 3. difficulty tier ramp for this curriculum
    applyRamp(ch, result);
    Store.save();
    // 4. tell the game (resets the Starfall timer, may tempt Pip)
    if (window.Game) {
      Game.notifyEdu();
      if (result.mistakes >= CONFIG.PIP.stealAfterMistakes) Game.pipSteal();
    }
  }

  function applyRamp(ch, result) {
    var cur = Store.curriculum(ch.cid);
    if (!cur) return;
    var maxTier = tiersOf(cur).length - 1;
    if (maxTier < 1) return;
    var st = tierState(ch.cid);
    if (ch.tier !== st.tier) return;
    if (result.correct && result.mistakes === 0) {
      st.tierWins += 1;
      st.struggle = 0;
      if (st.tierWins >= CONFIG.LEARN.tierUpWins && st.tier < maxTier) {
        st.tier += 1;
        st.tierWins = 0;
        var name = tiersOf(cur)[st.tier].name || ("level " + (st.tier + 1));
        UI.toast("📚 New material unlocked: " + name + "!");
      }
    } else if (result.mistakes > 0) {
      st.tierWins = Math.max(0, st.tierWins - 1);
      st.struggle = (st.struggle || 0) + (result.mistakes >= 3 ? 2 : 1);
      if (st.struggle >= CONFIG.LEARN.backOffAt && st.tier > 0) {
        st.tier -= 1;
        st.tierWins = Math.floor(CONFIG.LEARN.tierUpWins / 2);
        st.struggle = 0;
        UI.toast("💪 Power-up round! Time for some things you ROCK at!", 3200);
      }
    }
  }

  /* ---------------- reporting helpers ---------------- */
  function focusList() {
    return activeAssignments().map(function (a) {
      var cur = Store.curriculum(a.cid);
      var st = tierState(a.cid);
      var tiers = tiersOf(cur);
      var t = tiers[Math.min(st.tier, Math.max(0, tiers.length - 1))] || {};
      return { name: cur.name, subject: cur.subject, weight: a.weight,
               tierName: t.name || "", focus: t.focus || "" };
    });
  }

  // items needing review: box <= 1 with at least 2 misses, grouped per curriculum
  function needsReview(saveData) {
    var d = saveData || Store.data;
    var out = [];
    var m = d.learn.mastery;
    Object.keys(m).forEach(function (cid) {
      var cur = Store.curriculum(cid);
      var items = [];
      Object.keys(m[cid]).forEach(function (itemKey) {
        var skills = m[cid][itemKey];
        var worst = null;
        Object.keys(skills).forEach(function (sk) {
          var r = skills[sk];
          if (r.miss >= 2 && r.box <= 1 && r.miss >= r.win) {
            if (!worst || r.miss > worst.miss) worst = { skill: sk, miss: r.miss };
          }
        });
        if (worst) items.push({ key: itemKey, skill: worst.skill, miss: worst.miss });
      });
      if (items.length) {
        items.sort(function (a, b) { return b.miss - a.miss; });
        out.push({ cid: cid, name: cur ? cur.name : cid, subject: cur ? cur.subject : "?",
                   items: items.slice(0, 8) });
      }
    });
    return out;
  }

  function masteredRecently(saveData, limit) {
    var d = saveData || Store.data;
    var out = [];
    var m = d.learn.mastery;
    Object.keys(m).forEach(function (cid) {
      Object.keys(m[cid]).forEach(function (itemKey) {
        Object.keys(m[cid][itemKey]).forEach(function (sk) {
          var r = m[cid][itemKey][sk];
          if (r.box >= 4 && out.indexOf(prettyKey(itemKey)) < 0) out.push(prettyKey(itemKey));
        });
      });
    });
    return out.slice(0, limit || 10);
  }

  function prettyKey(k) {
    if (k.slice(0, 2) === "v:") return k.slice(2);
    if (k.slice(0, 2) === "q:") return "“" + k.slice(2, 40) + "…”";
    if (k.slice(0, 2) === "s:") return "sentence";
    return k;
  }

  return {
    getChallenge: getChallenge, report: report,
    activeAssignments: activeAssignments, focusList: focusList,
    needsReview: needsReview, masteredRecently: masteredRecently, prettyKey: prettyKey,
    skillNeed: skillNeed
  };
})();
