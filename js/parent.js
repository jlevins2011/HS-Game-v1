"use strict";
/* ============================================================
   PARENTS AREA — a protected dashboard where parents:
   - manage explorer profiles
   - create their own lesson sets by pasting a list (no code)
   - assign lesson sets to children with relative weights
     (Bible weighting is just the weight on Bible sets)
   - set a minimum gap between questions, per child
   - read progress: needs-review patterns, accuracy by skill
   - manage weekly report emails, backups, and a parent PIN
   Opened by press-and-hold; a PIN can be required on top.

   INTERACTION NOTE: unlike the game (which fires on pointerdown
   for instant response), everything in here fires on `click`.
   This panel scrolls, and a pointerdown handler turns "drag to
   scroll the list" into "press whatever button you started on".
   `click` is suppressed by the browser after a drag, which is
   exactly what a settings screen wants.
   ============================================================ */
var Parent = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var tab = "explorers";
  var chosenChild = null;
  var armedBtn = null;          // the one "tap again to confirm" button

  // The Parents area opens from a press-and-hold, so the finger is still
  // down when it appears. Releasing would fire a click on whatever button
  // landed under it. Ignore clicks until the user actually touches the
  // panel themselves.
  var armed = false;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function card() { return $("overlay-card"); }
  function each(sel, fn) {
    var root = card();
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll(sel), fn);
  }

  function tap(el, fn) {
    if (!el) return;
    el.addEventListener("click", function (e) {
      if (!armed) return;
      e.preventDefault();
      fn(e);
    });
  }
  function tapEach(sel, fn) {
    each(sel, function (el) { tap(el, function () { fn(el); }); });
  }

  /* ---------------- entry + PIN gate ---------------- */
  function show() {
    armed = false;
    var wait = document.getElementById("overlay");
    if (wait) {
      var arm = function () { armed = true; };
      wait.addEventListener("pointerdown", arm, { once: true });
      wait.addEventListener("mousedown", arm, { once: true });
    }
    var pin = Store.family.settings.pin;
    if (pin) showPinGate(pin, function () { render(); });
    else render();
  }

  function showPinGate(pin, onOk) {
    UI.openOverlay(
      "<div class='ch-title'>🗝️ Parents</div>" +
      "<div class='ch-sub' id='pin-msg'>Enter the parent PIN</div>" +
      "<div class='pin-dots' id='pin-dots'>····</div>" +
      "<div class='pin-pad' id='pin-pad'></div>" +
      "<button class='ghost-btn' id='pin-cancel'>Cancel</button>"
    );
    var entered = "";
    var pad = $("pin-pad");
    "1234567890⌫".split("").forEach(function (d) {
      var b = document.createElement("button");
      b.className = "pin-key";
      b.textContent = d;
      tap(b, function () {
        if (d === "⌫") entered = entered.slice(0, -1);
        else if (entered.length < 4) entered += d;
        $("pin-dots").textContent = (entered + "····").slice(0, 4).replace(/\d/g, "●");
        if (entered.length === 4) {
          if (entered === pin) { onOk(); }
          else {
            entered = "";
            GameAudio.sfx.wrong();
            $("pin-dots").textContent = "····";
            $("pin-msg").textContent = "Not quite — try again";
          }
        }
      });
      pad.appendChild(b);
    });
    tap($("pin-cancel"), UI.closeOverlay);
  }

  /* ---------------- shell ---------------- */
  var TABS = [
    { id: "explorers", label: "👧 Explorers" },
    { id: "lessons", label: "📚 Lessons" },
    { id: "assign", label: "🎯 Assignments" },
    { id: "reports", label: "📬 Reports & Settings" }
  ];

  function render(goTab) {
    // Keep the reading position when re-rendering the same tab. Losing it on
    // every button press is what made this panel feel like it was fighting you.
    var body = $("pr-body");
    var keepScroll = (!goTab || goTab === tab) && body ? body.scrollTop : 0;
    if (goTab) tab = goTab;
    stashDraft();
    armedBtn = null;

    var nav = "<div class='pr-tabs'>" + TABS.map(function (t) {
      return "<button type='button' class='pr-tab" + (t.id === tab ? " active" : "") +
        "' data-tab='" + t.id + "'>" + t.label + "</button>";
    }).join("") + "</div>";
    var html = tab === "explorers" ? renderExplorers() :
               tab === "lessons" ? renderLessons() :
               tab === "assign" ? renderAssign() : renderReports();
    UI.openOverlay(
      "<div class='ch-title'>🗝️ Parents Area</div>" + nav +
      "<div class='parent-scroll' id='pr-body'>" + html + "</div>" +
      "<button type='button' class='big-btn' id='pr-close'>CLOSE</button>"
    );
    tapEach(".pr-tab", function (b) { render(b.getAttribute("data-tab")); });
    tap($("pr-close"), UI.closeOverlay);
    wireInputs();
    wireTab();
    var nb = $("pr-body");
    if (nb) nb.scrollTop = keepScroll;
  }

  // iPad's keyboard covers the lower half of the screen, so a field tapped
  // near the bottom can end up hidden. Nudge it into view — but only if it
  // is actually clipped, and instantly: an animated scroll slides the
  // buttons out from under the finger that is already reaching for them.
  function wireInputs() {
    each("input, textarea, select", function (el) {
      el.addEventListener("focus", function () {
        var box = $("pr-body");
        if (!box) return;
        var b = el.getBoundingClientRect(), s = box.getBoundingClientRect();
        if (b.top >= s.top && b.bottom <= s.bottom) return;   // already visible
        box.scrollTop += (b.top < s.top) ? (b.top - s.top - 8)
                                         : (b.bottom - s.bottom + 8);
      });
    });
  }

  function wireTab() {
    if (tab === "explorers") wireExplorers();
    else if (tab === "lessons") wireLessons();
    else if (tab === "assign") wireAssign();
    else wireReports();
  }

  /* A destructive button arms on the first tap and fires on the second.
     It disarms itself after a few seconds and whenever another one is armed,
     so a stray tap can never sit primed waiting to delete a child's save. */
  function armDouble(btn, confirmText, fn) {
    var original = btn.textContent;
    var timer = null;
    function disarm() {
      clearTimeout(timer);
      btn.textContent = original;
      btn.classList.remove("armed");
      if (armedBtn === btn) armedBtn = null;
    }
    btn._disarm = disarm;
    tap(btn, function () {
      if (armedBtn === btn) { disarm(); fn(); return; }
      if (armedBtn && armedBtn._disarm) armedBtn._disarm();
      armedBtn = btn;
      btn.textContent = confirmText;
      btn.classList.add("armed");
      timer = setTimeout(disarm, 5000);
    });
  }

  /* ---------------- explorers tab ---------------- */
  function renderExplorers() {
    var profiles = Store.family.profiles;
    if (!profiles.length) {
      return "<div class='pr-section'>No explorers yet. Add the first one here, " +
        "or let a child add themselves from the home screen.</div>" +
        "<button type='button' class='big-btn small-btn' id='px-add'>➕ Add explorer</button>";
    }
    var html = profiles.map(function (p) {
      var save = saveFor(p.id);
      var line = save
        ? "Level " + save.player.level + " (" + UI.rankFor(save.player.level) + ") · " +
          Reports.fmtMinutes(save.stats.playMs) + " this week · " +
          save.stats.lifetime.challenges + " lifetime challenges"
        : "Hasn't played yet";
      var pace = Store.paceMinutes(p.id);
      return "<div class='pr-section'>" +
        "<b>" + p.emoji + " " + esc(p.name) + "</b><br>" + line + "<br>" +
        "<span class='pr-quiet'>⏳ " + (pace ? "at least " + pace + " min between questions" : "no gap between questions") + "</span>" +
        "<div class='pr-row'>" +
        "<button type='button' class='big-btn small-btn' data-view='" + p.id + "'>📈 Progress</button>" +
        "<button type='button' class='ghost-btn danger inline-btn' data-reset='" + p.id + "'>Reset progress</button>" +
        "<button type='button' class='ghost-btn danger inline-btn' data-remove='" + p.id + "'>Remove</button>" +
        "</div></div>";
    }).join("");
    html += "<button type='button' class='big-btn small-btn' id='px-add'>➕ Add explorer</button>";
    return html;
  }

  function wireExplorers() {
    tap($("px-add"), function () {
      UI.closeOverlay();
      if (Game.running) Game.stop();
      UI.showHome();
      UI.showNewExplorer();
    });
    tapEach("[data-view]", function (b) { showProgress(b.getAttribute("data-view")); });
    each("[data-reset]", function (b) {
      armDouble(b, "Tap again to RESET", function () {
        Store.reset(b.getAttribute("data-reset"));
        UI.toast("Progress reset.");
        render();
      });
    });
    each("[data-remove]", function (b) {
      armDouble(b, "Tap again to REMOVE", function () {
        Store.removeProfile(b.getAttribute("data-remove"));
        UI.toast("Explorer removed.");
        render();
      });
    });
  }

  function profileById(pid) {
    return Store.family.profiles.filter(function (p) { return p.id === pid; })[0] || null;
  }
  function saveFor(pid) {
    if (Store.profile && Store.profile.id === pid) return Store.data;
    return Store.peekSave(profileById(pid));
  }

  function showProgress(pid) {
    var p = profileById(pid);
    var save = saveFor(pid);
    if (!p) { render(); return; }
    if (!save) { UI.toast("No progress yet — they haven't played."); return; }
    var s = save.stats;
    var skillRows = Object.keys(s.challenges).map(function (k) {
      var c = s.challenges[k];
      var acc = Reports.accuracy(c);
      return "<tr><td>" + Reports.skillLabel(k) + "</td><td>" + c.tries +
        "</td><td>" + (acc === null ? "–" : acc + "%") + "</td></tr>";
    }).join("");
    var review = Learning.needsReview(save);
    var reviewHtml = review.length
      ? review.map(function (r) {
          return "<b>" + esc(r.name) + ":</b> " + r.items.map(function (it) {
            return esc(Learning.prettyKey(it.key));
          }).join(", ");
        }).join("<br>")
      : "Nothing right now 🎉";
    var mastered = Learning.masteredRecently(save, 12);
    var assigns = Store.assignmentsFor(pid).map(function (a) {
      var cur = Store.curriculum(a.cid);
      return cur ? cur.name + " (weight " + a.weight + ")" : null;
    }).filter(Boolean).join(" · ") || "None assigned";

    UI.openOverlay(
      "<div class='ch-title'>📈 " + p.emoji + " " + esc(p.name) + "</div>" +
      "<div class='parent-scroll'>" +
      "<div class='pr-section'><b>This week:</b> " + Reports.fmtMinutes(s.playMs) + " over " +
        s.daysPlayed.length + " day(s) · Level " + save.player.level + " · " + CONFIG.BRAND.currencyIcon + " " + save.player.sparks + "</div>" +
      "<div class='pr-section'><b>Assigned lessons:</b><br>" + esc(assigns) + "</div>" +
      "<div class='pr-section'><b>Practice (first-try accuracy)</b>" +
      (skillRows ? "<table class='pr-table'><tr><th>Skill</th><th>Tries</th><th>First-try</th></tr>" + skillRows + "</table>"
                 : "<br>No challenges yet this week.") + "</div>" +
      "<div class='pr-section'><b>Needs review</b><br>" + reviewHtml + "</div>" +
      (mastered.length ? "<div class='pr-section'><b>Going strong:</b> " + esc(mastered.join(", ")) + "</div>" : "") +
      "<div class='pr-section'><b>Lifetime:</b> " + s.lifetime.challenges + " challenges · " +
        s.lifetime.gathered + " gathered · " + s.lifetime.built + " built · " +
        s.lifetime.quests + " quests · " + s.lifetime.harvested + " harvests</div>" +
      "</div>" +
      "<button type='button' class='big-btn' id='pg-back'>⬅️ BACK</button>"
    );
    tap($("pg-back"), function () { render(); });
  }

  /* ---------------- lessons tab ---------------- */
  // A pasted list is real work. Keep it if the parent taps another tab.
  var draft = { name: "", type: "spelling", text: "" };
  function stashDraft() {
    var n = $("nc-name"), t = $("nc-type"), x = $("nc-text");
    if (n) draft.name = n.value;
    if (t) draft.type = t.value;
    if (x) draft.text = x.value;
  }

  var TYPE_HELP = {
    spelling:   { icon: "✏️", label: "one word per line",
                  eg: "beautiful\ndifferent\nenough\nFebruary\nprobably" },
    reading:    { icon: "📖", label: "word, plus an optional picture emoji",
                  eg: "dog 🐶\nnest 🪺\nwagon\nbranch 🌿" },
    vocab:      { icon: "🏛️", label: "foreign word = English meaning",
                  eg: "aqua = water\nterra = land\nluna = moon" },
    bibleverse: { icon: "📜", label: "Reference | the verse text",
                  eg: "John 3:16 | For God so loved the world...\nPsalm 23:1 | The LORD is my shepherd..." },
    quiz:       { icon: "❓", label: "Question | right answer | wrong | wrong",
                  eg: "What is the capital of France? | Paris | Rome | Madrid" }
  };

  function renderLessons() {
    var all = Store.allCurricula();
    var rows = all.map(function (c) {
      return "<div class='pr-section'>" +
        "<b>" + (c.icon || "📚") + " " + esc(c.name) + "</b> " +
        (c.custom ? "<span class='tag'>custom</span>" : "<span class='tag builtin'>built-in</span>") +
        "<br><i>" + esc(c.desc || subjectLabel(c.subject)) + "</i><br>" +
        countLabel(c) + " · subject: " + subjectLabel(c.subject) +
        (c.translation ? " · " + c.translation : "") +
        (c.custom ? "<br><button type='button' class='ghost-btn danger inline-btn' data-delcur='" + c.id + "'>Delete</button>" : "") +
        "</div>";
    }).join("");
    var help = TYPE_HELP[draft.type] || TYPE_HELP.spelling;
    return rows +
      "<div class='pr-section'><b>➕ Create a lesson set</b> — paste a list, assign it, done.<br>" +
      "<input type='text' id='nc-name' class='pr-input' maxlength='40' autocapitalize='words' " +
        "placeholder='Name (e.g. Week 7 Spelling)' value='" + esc(draft.name) + "'>" +
      "<select id='nc-type' class='pr-input'>" +
      "<option value='spelling'>✏️ Spelling words</option>" +
      "<option value='reading'>📖 Reading words</option>" +
      "<option value='vocab'>🏛️ Vocabulary pairs</option>" +
      "<option value='bibleverse'>📜 Bible verses</option>" +
      "<option value='quiz'>❓ Questions</option>" +
      "</select>" +
      "<div class='pr-quiet' id='nc-help'>" + help.icon + " " + esc(help.label) + "</div>" +
      "<textarea id='nc-text' class='pr-input pr-textarea' rows='6' autocapitalize='none' " +
        "spellcheck='false' placeholder='" + esc(help.eg) + "'>" + esc(draft.text) + "</textarea>" +
      "<div id='nc-error' class='pr-error'></div>" +
      "<div class='pr-row'>" +
      "<button type='button' class='big-btn small-btn' id='nc-save'>SAVE LESSON SET</button>" +
      "<button type='button' class='ghost-btn inline-btn' id='nc-clear'>Clear</button>" +
      "</div></div>";
  }

  function subjectLabel(s) {
    return { reading: "Reading", spelling: "Spelling", vocab: "Vocabulary", bible: "Bible", quiz: "Quiz", math: "Math" }[s] || s;
  }

  function countLabel(c) {
    var n = 0, endless = false;
    (c.tiers || []).forEach(function (t) {
      n += (t.words || []).length + (t.pairs || []).length + (t.verses || []).length + (t.facts || []).length;
      if (t.gen) endless = true;
    });
    if (endless) return n ? n + " items + endless practice" : "endless practice";
    return n + " item" + (n === 1 ? "" : "s");
  }

  function parseLessonSet(name, type, text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) throw new Error("Paste at least one line.");
    var tier = { name: name, focus: "parent-created set" };
    var cur = { name: name, tiers: [tier] };

    function splitPair(line, sep) {
      var m = line.split(sep);
      if (m.length < 2 || !m[0].trim() || !m.slice(1).join(" ").trim()) {
        throw new Error("This line needs two parts: “" + line + "”");
      }
      return m;
    }

    if (type === "spelling") {
      cur.subject = "spelling";
      tier.words = lines.map(function (l) { return l.split(/\s+/)[0].toLowerCase(); });
    } else if (type === "reading") {
      cur.subject = "reading";
      tier.words = lines.map(function (l) {
        var parts = l.split(/\s+/);
        var last = parts[parts.length - 1];
        var hasEmoji = parts.length > 1 && /[^\x00-\x7F]/.test(last);
        return hasEmoji
          ? { word: parts.slice(0, -1).join(" "), emoji: last }
          : { word: l };
      });
    } else if (type === "vocab") {
      cur.subject = "vocab";
      cur.language = "vocabulary";
      tier.pairs = lines.map(function (l) {
        var m = splitPair(l, /\s*(?:=|\||—|–)\s*/);
        return [m[0].trim(), m.slice(1).join(" ").trim()];
      });
    } else if (type === "bibleverse") {
      cur.subject = "bible";
      // Only "|" splits a reference from its text — verses are full of dashes.
      tier.verses = lines.map(function (l) {
        var m = splitPair(l, /\s*\|\s*/);
        return { ref: m[0].trim(), text: m.slice(1).join(" | ").trim() };
      });
    } else if (type === "quiz") {
      cur.subject = "quiz";
      tier.facts = lines.map(function (l) {
        var m = l.split(/\s*\|\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
        if (m.length < 3) throw new Error("Needs a question, the right answer, and at least one wrong one: “" + l + "”");
        return { q: m[0], a: m[1], choices: m.slice(1), ref: "" };
      });
    } else {
      throw new Error("Pick a lesson type.");
    }
    return cur;
  }

  function wireLessons() {
    each("[data-delcur]", function (b) {
      armDouble(b, "Tap again to DELETE", function () {
        Store.removeCustomCurriculum(b.getAttribute("data-delcur"));
        UI.toast("Lesson set deleted.");
        render();
      });
    });
    var sel = $("nc-type");
    if (sel) {
      sel.value = draft.type;
      sel.addEventListener("change", function () {
        stashDraft();
        var help = TYPE_HELP[draft.type] || TYPE_HELP.spelling;
        $("nc-help").textContent = help.icon + " " + help.label;
        $("nc-text").setAttribute("placeholder", help.eg);
        $("nc-error").textContent = "";
      });
    }
    tap($("nc-clear"), function () {
      draft = { name: "", type: draft.type, text: "" };
      render();
    });
    tap($("nc-save"), function () {
      stashDraft();
      var err = $("nc-error");
      var name = draft.name.trim();
      if (!name) { err.textContent = "Give the lesson set a name."; $("nc-name").focus(); return; }
      try {
        var cur = parseLessonSet(name, draft.type, draft.text);
        cur.icon = (TYPE_HELP[draft.type] || {}).icon || "📚";
        cur.desc = "Created by a parent on " + new Date().toLocaleDateString();
        Store.addCustomCurriculum(cur);
        draft = { name: "", type: draft.type, text: "" };
        UI.toast("📚 Saved “" + name + "”! Now give it a weight below.");
        render("assign");
      } catch (e) {
        err.textContent = e.message;
      }
    });
  }

  /* ---------------- assignments tab ---------------- */
  function paceLabel(mins) {
    if (!mins) return "No gap — questions whenever they're found";
    if (mins === 1) return "At least 1 minute between questions";
    return "At least " + mins + " minutes between questions";
  }

  function renderAssign() {
    var profiles = Store.family.profiles;
    if (!profiles.length) return "<div class='pr-section'>Add an explorer first!</div>";
    if (!chosenChild || !profileById(chosenChild)) chosenChild = profiles[0].id;
    var chips = "<div class='pr-chips'>" + profiles.map(function (p) {
      return "<button type='button' class='pr-chip" + (p.id === chosenChild ? " active" : "") +
        "' data-child='" + p.id + "'>" + p.emoji + " " + esc(p.name) + "</button>";
    }).join("") + "</div>";

    var pace = Store.paceMinutes(chosenChild);
    var paceBtns = CONFIG.LEARN.paceChoices.map(function (m) {
      return "<button type='button' class='pace-btn" + (m === pace ? " active" : "") +
        "' data-pace='" + m + "'>" + (m === 0 ? "Off" : m + "m") + "</button>";
    }).join("");
    var paceBox =
      "<div class='pr-section'><b>⏳ Question pacing</b><br>" +
      "<i>The shortest time that may pass between one challenge and the next. " +
      "Wonderstones, chests, Starfalls and Elder Alder all wait it out. This is a " +
      "parent setting — it isn't shown anywhere a child can change it, and it survives " +
      "reloading the game or resetting progress.</i>" +
      "<div class='pace-grid'>" + paceBtns + "</div>" +
      "<div class='pace-now' id='pace-now'>" + esc(paceLabel(pace)) + "</div>" +
      (profiles.length > 1
        ? "<button type='button' class='ghost-btn inline-btn' id='pace-all'>Use this for every explorer</button>"
        : "") +
      "</div>";

    var assigns = Store.assignmentsFor(chosenChild);
    function weightOf(cid) {
      var a = assigns.filter(function (x) { return x.cid === cid; })[0];
      return a ? a.weight : 0;
    }
    var rows = Store.allCurricula().map(function (c) {
      var w = weightOf(c.id);
      return "<div class='pr-section assign-row" + (w > 0 ? " on" : "") + "' data-row='" + c.id + "'>" +
        "<span class='assign-name'>" + (c.icon || "📚") + " " + esc(c.name) + "</span>" +
        "<span class='assign-ctl'>" +
        "<button type='button' class='wt-btn' data-dec='" + c.id + "'>−</button>" +
        "<span class='wt-val' data-wt='" + c.id + "'>" + (w > 0 ? "weight " + w : "off") + "</span>" +
        "<button type='button' class='wt-btn' data-inc='" + c.id + "'>+</button>" +
        "</span></div>";
    }).join("");
    return chips + paceBox +
      "<div class='pr-section'><i>Weight controls how often each subject appears in play. " +
      "Higher weight = more often. “Off” removes it. Bible weighting is simply the weight on Bible sets.</i></div>" +
      rows;
  }

  function wireAssign() {
    tapEach("[data-child]", function (b) {
      chosenChild = b.getAttribute("data-child");
      render();
    });

    function paintPace() {
      var pace = Store.paceMinutes(chosenChild);
      each("[data-pace]", function (b) {
        b.classList.toggle("active", Number(b.getAttribute("data-pace")) === pace);
      });
      var now = $("pace-now");
      if (now) now.textContent = paceLabel(pace);
    }
    tapEach("[data-pace]", function (b) {
      Store.setPaceMinutes(chosenChild, Number(b.getAttribute("data-pace")));
      paintPace();
    });
    tap($("pace-all"), function () {
      var pace = Store.paceMinutes(chosenChild);
      Store.setPaceMinutes(null, pace, true);
      paintPace();
      UI.toast("⏳ " + paceLabel(pace) + " — for every explorer.");
    });

    // Update the row in place. A full re-render here would throw the parent
    // back to the top of the list on every single tap of + or −.
    function bump(cid, delta) {
      var assigns = Store.assignmentsFor(chosenChild);
      var a = assigns.filter(function (x) { return x.cid === cid; })[0];
      if (!a && delta > 0) { a = { cid: cid, weight: 1 }; assigns.push(a); }
      else if (a) {
        a.weight = Math.max(0, Math.min(5, a.weight + delta));
        if (a.weight === 0) { assigns.splice(assigns.indexOf(a), 1); a = null; }
      }
      Store.saveFamily();
      var w = a ? a.weight : 0;
      each("[data-wt='" + cid + "']", function (el) { el.textContent = w > 0 ? "weight " + w : "off"; });
      each("[data-row='" + cid + "']", function (el) { el.classList.toggle("on", w > 0); });
    }
    tapEach("[data-inc]", function (b) { bump(b.getAttribute("data-inc"), 1); });
    tapEach("[data-dec]", function (b) { bump(b.getAttribute("data-dec"), -1); });
  }

  /* ---------------- reports & settings tab ---------------- */
  function renderReports() {
    var emails = Reports.getEmails();
    var hasPin = !!Store.family.settings.pin;
    return "" +
      "<div class='pr-section'><b>📬 Weekly email reports</b> (every " + (Store.family.settings.reportDays || 7) + " days, whole family)<br>" +
      (emails.length
        ? "<div class='pr-emails'>" + emails.map(function (e) {
            return "<div class='pr-email-row'><span>" + esc(e) + "</span>" +
              "<button type='button' class='pr-email-del' data-email='" + esc(e) + "'>✕</button></div>";
          }).join("") + "</div>"
        : "<i>No emails linked yet — add one below.</i>") +
      "<div class='pr-email-add'>" +
      "<input type='email' id='pr-email-input' class='pr-input' inputmode='email' autocapitalize='none' " +
        "autocorrect='off' spellcheck='false' placeholder='parent@email.com'>" +
      "<button type='button' class='big-btn small-btn' id='pr-email-addbtn'>ADD</button></div>" +
      (emails.length
        ? "<button type='button' class='big-btn small-btn' id='pr-send'>📧 SEND FAMILY REPORT NOW</button>" +
          "<div id='pr-send-status'></div>" +
          "<i>First time? Each address gets a one-time “activate” email from formsubmit.co — click its link once, then reports flow automatically.</i>"
        : "") +
      "</div>" +

      "<div class='pr-section'><b>📄 Report preview</b><br>" +
      "<button type='button' class='big-btn small-btn' id='pr-preview'>SHOW THIS WEEK'S REPORT</button></div>" +

      "<div class='pr-section'><b>💾 Backup</b> — saves live in this browser. Export a backup file so " +
      "clearing browser data can never erase progress (and to move to a new device).<br>" +
      "<div class='pr-row'>" +
      "<button type='button' class='big-btn small-btn' id='pr-export'>⬇️ EXPORT BACKUP</button>" +
      "<button type='button' class='big-btn small-btn' id='pr-import'>⬆️ RESTORE BACKUP</button>" +
      "<input type='file' id='pr-import-file' accept='.json,application/json' style='display:none'>" +
      "</div></div>" +

      "<div class='pr-section'><b>🔒 Parent PIN</b> — " +
      (hasPin ? "a PIN is set; this area asks for it." : "no PIN set (the Parents button only needs a long press).") + "<br>" +
      "<div class='pr-email-add'>" +
      "<input type='password' id='pr-pin-input' class='pr-input' inputmode='numeric' pattern='[0-9]*' " +
        "maxlength='4' autocomplete='off' placeholder='" + (hasPin ? "New 4-digit PIN" : "4-digit PIN") + "'>" +
      "<button type='button' class='big-btn small-btn' id='pr-pin-set'>" + (hasPin ? "CHANGE" : "SET") + "</button></div>" +
      (hasPin ? "<button type='button' class='ghost-btn danger inline-btn' id='pr-pin-clear'>Remove PIN</button>" : "") +
      "</div>" +

      "<div class='pr-section'><b>ℹ️ About the built-in content</b><br>" +
      "Bible memory verses are quoted from the King James Version (public domain) and every Bible item " +
      "shows its Scripture reference so you can audit it. The Latin set is original introductory material " +
      "written for this game. You control how much of each subject appears in the Assignments tab, and " +
      "how often questions may interrupt play with ⏳ Question pacing.</div>";
  }

  function wireReports() {
    tapEach(".pr-email-del", function (btn) {
      Reports.removeEmail(btn.getAttribute("data-email"));
      render();
    });
    tap($("pr-email-addbtn"), function () {
      var input = $("pr-email-input");
      if (Reports.addEmail(input.value)) render();
      else { input.style.borderColor = "#c0392b"; UI.toast("That doesn't look like an email address."); }
    });
    var sendBtn = $("pr-send");
    tap(sendBtn, function () {
      if (sendBtn.disabled) return;
      sendBtn.disabled = true;
      sendBtn.textContent = "SENDING…";
      Reports.send(function (anyOk, results) {
        sendBtn.disabled = false;
        sendBtn.textContent = anyOk ? "✅ SENT!" : "❌ COULD NOT SEND";
        var status = $("pr-send-status");
        if (status) status.innerHTML = results.map(function (r) {
          return (r.ok ? "✅ " : "❌ ") + esc(r.label);
        }).join("<br>");
      });
    });
    tap($("pr-preview"), function () {
      UI.openOverlay(
        "<div class='ch-title'>📄 This Week</div>" +
        "<div class='parent-scroll'><pre class='pr-pre'>" + esc(Reports.buildTextReport()) + "</pre></div>" +
        "<button type='button' class='big-btn' id='rp-back'>⬅️ BACK</button>"
      );
      tap($("rp-back"), function () { render(); });
    });
    tap($("pr-export"), function () {
      var blob = new Blob([Store.exportAll()], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lumen-isles-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      UI.toast("💾 Backup file created!");
    });
    tap($("pr-import"), function () { $("pr-import-file").click(); });
    var impFile = $("pr-import-file");
    if (impFile) impFile.addEventListener("change", function () {
      var f = impFile.files && impFile.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var n = Store.importAll(reader.result);
          UI.toast("✅ Restored backup with " + n + " explorer(s)!");
          render();
        } catch (e) {
          UI.toast("❌ " + e.message, 3600);
        }
      };
      reader.readAsText(f);
    });
    tap($("pr-pin-set"), function () {
      var el = $("pr-pin-input");
      var v = (el.value || "").trim();
      if (!/^\d{4}$/.test(v)) {
        el.style.borderColor = "#c0392b";
        UI.toast("A PIN is exactly 4 digits. Use “Remove PIN” to turn it off.");
        return;
      }
      Store.family.settings.pin = v;
      Store.saveFamily();
      UI.toast("🔒 PIN saved.");
      render();
    });
    var clearPin = $("pr-pin-clear");
    if (clearPin) armDouble(clearPin, "Tap again to REMOVE PIN", function () {
      Store.family.settings.pin = null;
      Store.saveFamily();
      UI.toast("🔓 PIN removed.");
      render();
    });
  }

  return { show: show };
})();
