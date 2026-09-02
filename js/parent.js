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
  function armOnNextTouch() {
    armed = false;
    var wait = document.getElementById("overlay");
    if (wait) {
      var arm = function () { armed = true; };
      wait.addEventListener("pointerdown", arm, { once: true });
      wait.addEventListener("mousedown", arm, { once: true });
    }
  }

  function show() {
    armOnNextTouch();
    var pin = Store.family.settings.pin;
    if (pin) showPinGate(pin, function () { render(); });
    else render();
  }

  function gradeLabel(g) { return CONFIG.GRADE_LABELS[g] || ("Grade " + g); }
  function gradeShort(g) { return g === "K" ? "K" : "Gr " + g; }

  function showPinGate(pin, onOk, onCancel) {
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
    tap($("pin-cancel"), onCancel || UI.closeOverlay);
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
      var plan = Store.gradePlanFor(p.id);
      var planBits = CONFIG.SUBJECTS.map(function (sd) {
        var sub = plan.subjects[sd.id];
        if (!sub || !sub.enabled) return null;
        return sd.icon + " " + (sd.graded ? gradeShort(sub.grade) : sd.label);
      }).filter(Boolean).join(" · ");

      // where they are, per set — the engine always knew; now the parent does
      var focus = save ? Learning.focusList(save, p.id).filter(function (f) { return f.enabled; }) : [];
      var focusHtml = focus.length
        ? "<div class='pr-focus'>" + focus.map(function (f) {
            return "<div class='pr-focus-row'><b>" + esc(f.name) + "</b> — " +
              esc(f.tierName || ("level " + (f.tier + 1))) + " <span class='pr-quiet-inline'>(" + (f.tier + 1) + "/" + f.tierCount + ")</span>" +
              (f.focus ? "<br><span class='pr-quiet-inline'>" + esc(f.focus) + "</span>" : "") + "</div>";
          }).join("") + "</div>"
        : "";

      var promos = save ? Learning.promotions(save, p.id) : [];
      var promoHtml = promos.map(function (pr) {
        return "<div class='pr-promo'>🌟 <b>" + esc(p.name) + "</b> is cruising through <b>" + esc(pr.name) + "</b> — " +
          pr.tierWins + " clean wins at the top level." +
          (pr.nextGrade
            ? "<div class='pr-row'><button type='button' class='big-btn small-btn' data-promote='" + p.id + "|" + pr.cid + "'>⬆️ Move up to " + esc(gradeLabel(pr.nextGrade)) + "</button>" +
              "<button type='button' class='ghost-btn inline-btn' data-snooze='" + p.id + "|" + pr.cid + "|" + pr.tierWins + "'>Not yet</button></div>"
            : "<br><span class='pr-quiet-inline'>That's the top of the built-in ladder — keep practicing, or add your own lists.</span>") +
          "</div>";
      }).join("");

      return "<div class='pr-section'>" +
        "<b>" + p.emoji + " " + esc(p.name) + "</b> <span class='tag builtin'>" + esc(gradeLabel(p.grade)) + "</span>" +
        (p.setupConfirmed ? "" : " <span class='tag warn'>needs a grown-up's setup</span>") +
        "<br>" + line + "<br>" +
        "<span class='pr-quiet'>" + esc(planBits || "no subjects on") + "</span>" +
        "<span class='pr-quiet'>⏳ " + (pace ? "at least " + pace + " min between questions" : "no gap between questions") + "</span>" +
        focusHtml + promoHtml +
        "<div class='pr-row'>" +
        "<button type='button' class='big-btn small-btn' data-setup='" + p.id + "'>🎓 Edit setup</button>" +
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
    tapEach("[data-setup]", function (b) {
      showSetup(b.getAttribute("data-setup"), { onDone: function () { render(); }, onBack: function () { render(); } });
    });
    tapEach("[data-view]", function (b) { showProgress(b.getAttribute("data-view")); });
    tapEach("[data-promote]", function (b) {
      var parts = b.getAttribute("data-promote").split("|");
      var to = Store.promote(parts[0], parts[1]);
      var cur = to && Store.curriculum(to);
      UI.toast(cur ? "⬆️ Moved up to " + cur.name + "!" : "Already at the top.");
      render();
    });
    tapEach("[data-snooze]", function (b) {
      var parts = b.getAttribute("data-snooze").split("|");
      Store.snoozePromotion(parts[0], parts[1], Number(parts[2]) || 0);
      UI.toast("Okay — we'll ask again after more clean wins.");
      render();
    });
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

  /* ---------------- setup screen: grade + subjects ----------------
     Shared by the New Explorer flow ("hand this to a grown-up") and the
     Explorers tab ("Edit setup"). opts:
       fromKid  — show the hand-off step first (PIN-gated if a PIN exists)
                  and a "Skip — set up later" that keeps sensible defaults
       onDone() — after SAVE; onSkip() — after Skip; onBack() — cancel */
  function showSetup(pid, opts) {
    opts = opts || {};
    var p = profileById(pid);
    if (!p) return;
    if (opts.fromKid) { showHandoff(pid, opts); return; }
    renderSetup(pid, opts);
  }

  function showHandoff(pid, opts) {
    var p = profileById(pid);
    armOnNextTouch();
    UI.openOverlay(
      "<div class='ch-title'>🎓 Hand this to a grown-up</div>" +
      "<div class='ch-sub'>A grown-up picks " + esc(p.name) + "'s grade and subjects. " +
      "It only takes a minute, and it can be changed any time in the Parents area.</div>" +
      "<button type='button' class='big-btn' id='ho-adult'>" + (Store.family.settings.pin ? "🔒 I'm a grown-up" : "👋 I'm a grown-up") + "</button>" +
      "<button type='button' class='ghost-btn' id='ho-skip'>Skip — set up later</button>"
    );
    tap($("ho-adult"), function () {
      var pin = Store.family.settings.pin;
      if (pin) showPinGate(pin, function () { renderSetup(pid, opts); }, function () { showHandoff(pid, opts); });
      else renderSetup(pid, opts);
    });
    tap($("ho-skip"), function () {
      // defaults for the default grade, flagged so the Explorers tab shows it
      if (!Store.assignmentsFor(pid).length) Store.applyGradePlan(pid, { grade: p.grade });
      p.setupConfirmed = false;
      Store.saveFamily();
      if (opts.onSkip) opts.onSkip();
    });
  }

  function renderSetup(pid, opts) {
    var p = profileById(pid);
    var plan = Store.gradePlanFor(pid);
    if (opts.fromKid && !p.setupConfirmed) {
      // a brand-new child: every graded subject follows the top grade
      CONFIG.SUBJECTS.forEach(function (sd) { if (sd.graded) plan.subjects[sd.id].autoGrade = true; });
    }

    function gradeChips(sel, attr) {
      return CONFIG.GRADES.map(function (g) {
        return "<button type='button' class='grade-chip" + (g === sel ? " active" : "") + "' " + attr + "='" + g + "'>" + g + "</button>";
      }).join("");
    }
    function rowHtml(sd) {
      var sub = plan.subjects[sd.id];
      var ctl = sd.graded
        ? "<div class='grade-row' data-sub-grades='" + sd.id + "'>" + gradeChips(sub.grade, "data-sg='" + sd.id + "' data-g") + "</div>"
        : "<span class='pr-quiet-inline'>" + esc(sd.note || "") + "</span>";
      return "<div class='setup-row" + (sub.enabled ? " on" : "") + "' data-setup-row='" + sd.id + "'>" +
        "<div class='setup-head'><span class='setup-name'>" + sd.icon + " " + esc(sd.label) + "</span>" +
        "<button type='button' class='tog" + (sub.enabled ? " on" : "") + "' data-tog-sub='" + sd.id + "' aria-label='on/off'><span></span></button></div>" +
        ctl + "</div>";
    }

    UI.openOverlay(
      "<div class='ch-title'>🎓 " + esc(p.name) + "'s lessons</div>" +
      "<div class='parent-scroll' id='pr-body'>" +
      "<div class='pr-section'><b>Grade</b><br><i>Picking a grade sets every subject to match. " +
      "Change any subject on its own if " + esc(p.name) + " is ahead or behind in it — that subject then stays put when the grade changes.</i>" +
      "<div class='grade-row big' id='setup-grade'>" + gradeChips(plan.grade, "data-grade") + "</div>" +
      "<div class='pace-now' id='setup-grade-label'>" + esc(gradeLabel(plan.grade)) + "</div></div>" +
      CONFIG.SUBJECTS.map(rowHtml).join("") +
      "<div class='pr-section'><i>Math sets are fact fluency — a supplement to a math curriculum, not a replacement. " +
      "Bible and Latin aren't grade-leveled. Weights (how often each shows up) live in the Assignments tab.</i></div>" +
      "</div>" +
      "<div class='pr-row setup-actions'>" +
      "<button type='button' class='big-btn' id='setup-save'>" + (opts.fromKid ? "✅ SAVE & START EXPLORING" : "✅ SAVE") + "</button>" +
      (opts.fromKid ? "<button type='button' class='ghost-btn' id='setup-skip'>Skip — set up later</button>"
                    : "<button type='button' class='ghost-btn' id='setup-back'>⬅️ Back</button>") +
      "</div>"
    );

    function paint() {
      each("[data-grade]", function (b) { b.classList.toggle("active", b.getAttribute("data-grade") === plan.grade); });
      var gl = $("setup-grade-label"); if (gl) gl.textContent = gradeLabel(plan.grade);
      CONFIG.SUBJECTS.forEach(function (sd) {
        var sub = plan.subjects[sd.id];
        each("[data-setup-row='" + sd.id + "']", function (r) { r.classList.toggle("on", !!sub.enabled); });
        each("[data-tog-sub='" + sd.id + "']", function (t) { t.classList.toggle("on", !!sub.enabled); });
        if (sd.graded) each("[data-sg='" + sd.id + "']", function (b) {
          b.classList.toggle("active", b.getAttribute("data-g") === sub.grade);
          b.classList.toggle("synced", sub.autoGrade && b.getAttribute("data-g") === sub.grade);
        });
      });
    }
    tapEach("[data-grade]", function (b) {
      plan.grade = b.getAttribute("data-grade");
      CONFIG.SUBJECTS.forEach(function (sd) {
        var sub = plan.subjects[sd.id];
        if (sd.graded && sub.autoGrade) sub.grade = plan.grade;
      });
      paint();
    });
    tapEach("[data-sg]", function (b) {
      var sub = plan.subjects[b.getAttribute("data-sg")];
      sub.grade = b.getAttribute("data-g");
      sub.autoGrade = (sub.grade === plan.grade);   // back in step = follows the grade again
      paint();
    });
    tapEach("[data-tog-sub]", function (b) {
      var sub = plan.subjects[b.getAttribute("data-tog-sub")];
      sub.enabled = !sub.enabled;
      paint();
    });
    tap($("setup-save"), function () {
      Store.applyGradePlan(pid, plan);
      UI.toast("🎓 " + p.name + " is set up for " + gradeLabel(plan.grade) + ".");
      if (opts.onDone) opts.onDone(plan);
    });
    tap($("setup-skip"), function () {
      if (!Store.assignmentsFor(pid).length) Store.applyGradePlan(pid, { grade: p.grade });
      p.setupConfirmed = false;
      Store.saveFamily();
      if (opts.onSkip) opts.onSkip();
    });
    tap($("setup-back"), function () { if (opts.onBack) opts.onBack(); else render(); });
    paint();
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
      var over = Store.isOverridden(c.id);
      return "<div class='pr-section'>" +
        "<b>" + (c.icon || "📚") + " " + esc(c.name) + "</b> " +
        (c.custom ? "<span class='tag'>custom</span>" : "<span class='tag builtin'>built-in</span>") +
        (over ? " <span class='tag edited'>customized</span>" : "") +
        "<br><i>" + esc(c.desc || subjectLabel(c.subject)) + "</i><br>" +
        countLabel(c) + " · subject: " + subjectLabel(c.subject) +
        (c.translation ? " · " + c.translation : "") +
        "<div class='pr-row'>" +
        "<button type='button' class='big-btn small-btn' data-open='" + c.id + "'>" + (c.subject === "math" ? "👁️ View" : "✏️ View / edit") + "</button>" +
        (c.custom ? "<button type='button' class='ghost-btn danger inline-btn' data-delcur='" + c.id + "'>Delete</button>" : "") +
        "</div></div>";
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
    tapEach("[data-open]", function (b) { showBank(b.getAttribute("data-open")); });
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

  /* ---------------- bank viewer / editor ----------------
     Any set can be opened. Editing a built-in makes a household copy under
     the SAME id (Store.editableCopy), so a child's mastery on the untouched
     words is kept; "Restore original" just deletes the copy. */
  var FIELDS = {
    reading:  [["word", "word"], ["emoji", "picture emoji (optional)"], ["meaning", "meaning (optional)"], ["say", "say it as… (optional)"]],
    spelling: [["word", "word"], ["say", "say it as… (optional)"]],
    vocab:    [["front", "word"], ["back", "meaning"], ["say", "say it as… (optional)"]],
    verse:    [["ref", "reference"], ["text", "verse text"], ["say", "say it as… (optional)"]],
    fact:     [["q", "question"], ["a", "right answer"], ["wrong", "wrong answers, comma-separated"], ["ref", "reference (optional)"], ["say", "say it as… (optional)"]]
  };

  // a tier's items as uniform records the editor can list and write back
  function tierRecords(cur, tier) {
    var out = [];
    if (cur.subject === "reading") {
      (tier.words || []).forEach(function (w, i) {
        var o = typeof w === "string" ? { word: w } : w;
        out.push({ kind: "reading", idx: i, label: o.word + (o.emoji ? " " + o.emoji : "") + (o.say ? " 🔊" : ""), fields: o });
      });
    } else if (cur.subject === "spelling") {
      (tier.words || []).forEach(function (w, i) {
        var o = typeof w === "string" ? { word: w } : w;
        out.push({ kind: "spelling", idx: i, label: o.word + (o.say ? " 🔊" : ""), fields: o });
      });
    } else if (cur.subject === "vocab") {
      (tier.pairs || []).forEach(function (pr, i) {
        var o = Array.isArray(pr) ? { front: pr[0], back: pr[1] } : pr;
        out.push({ kind: "vocab", idx: i, label: o.front + " = " + o.back + (o.say ? " 🔊" : ""), fields: o });
      });
    } else if (cur.subject === "bible" || cur.subject === "quiz") {
      (tier.verses || []).forEach(function (v, i) {
        out.push({ kind: "verse", idx: i, label: v.ref + " — " + v.text.slice(0, 48) + (v.text.length > 48 ? "…" : ""), fields: v });
      });
      (tier.facts || []).forEach(function (f, i) {
        var wrong = (f.choices || []).filter(function (c) { return c !== f.a; }).join(", ");
        out.push({ kind: "fact", idx: i, label: f.q.slice(0, 56) + (f.q.length > 56 ? "…" : ""), fields: Object.assign({}, f, { wrong: wrong }) });
      });
    }
    return out;
  }

  function cleanFields(kind, vals) {
    var o = {};
    Object.keys(vals).forEach(function (k) { var v = String(vals[k] || "").trim(); if (v) o[k] = v; });
    if (kind === "reading" || kind === "spelling") { if (!o.word) throw new Error("The word can't be empty."); }
    if (kind === "vocab") { if (!o.front || !o.back) throw new Error("Both the word and its meaning are needed."); }
    if (kind === "verse") { if (!o.ref || !o.text) throw new Error("A reference and the verse text are needed."); }
    if (kind === "fact") {
      if (!o.q || !o.a) throw new Error("A question and its right answer are needed.");
      var wrong = (o.wrong || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
      if (!wrong.length) throw new Error("Add at least one wrong answer.");
      o.choices = [o.a].concat(wrong);
      delete o.wrong;
      if (!o.ref) o.ref = "";
    }
    return o;
  }

  function writeRecord(cur, tier, kind, idx, fields) {
    if (kind === "reading") { if (idx == null) tier.words.push(fields); else tier.words[idx] = fields; }
    else if (kind === "spelling") {
      var v = fields.say ? fields : fields.word;
      if (idx == null) tier.words.push(v); else tier.words[idx] = v;
    }
    else if (kind === "vocab") { if (idx == null) tier.pairs.push(fields); else tier.pairs[idx] = fields; }
    else if (kind === "verse") { tier.verses = tier.verses || []; if (idx == null) tier.verses.push(fields); else tier.verses[idx] = fields; }
    else if (kind === "fact") { tier.facts = tier.facts || []; if (idx == null) tier.facts.push(fields); else tier.facts[idx] = fields; }
  }
  function removeRecord(cur, tier, kind, idx) {
    var arr = kind === "vocab" ? tier.pairs : kind === "verse" ? tier.verses : kind === "fact" ? tier.facts : tier.words;
    if (arr) arr.splice(idx, 1);
  }

  var bankEdit = null;   // { tier, kind, idx } of the row currently open for editing
  function showBank(cid) {
    var cur = Store.curriculum(cid);
    if (!cur) { render("lessons"); return; }
    var editable = cur.subject !== "math";
    var over = Store.isOverridden(cid);
    var addKinds = cur.subject === "bible" || cur.subject === "quiz" ? ["verse", "fact"] : [cur.subject];

    function formHtml(kind, fields, tierIdx, idx) {
      var tag = "data-form='" + tierIdx + "|" + kind + "|" + (idx == null ? "new" : idx) + "'";
      return "<div class='bank-form' " + tag + ">" +
        FIELDS[kind].map(function (f) {
          return "<input type='text' class='pr-input' data-f='" + f[0] + "' placeholder='" + esc(f[1]) + "' " +
            "autocapitalize='none' spellcheck='false' value='" + esc(fields[f[0]] || "") + "'>";
        }).join("") +
        "<div class='pr-error' data-ferr></div>" +
        "<div class='pr-row'><button type='button' class='big-btn small-btn' data-fsave>SAVE</button>" +
        "<button type='button' class='ghost-btn inline-btn' data-fcancel>Cancel</button></div></div>";
    }

    var tiersHtml = (cur.tiers || []).map(function (t, ti) {
      var body;
      if (cur.subject === "math") {
        body = "<div class='pr-quiet'>Generated from these recipes (editing math is coming):</div>" +
          "<ul class='bank-list'>" + (t.gen || []).map(function (g) {
            return "<li>" + esc(g.op) + " · " + g.aMin + "–" + g.aMax + " " + esc(g.op) + " " + g.bMin + "–" + g.bMax +
              (g.sumMax ? " (sums to " + g.sumMax + ")" : "") + "</li>";
          }).join("") + "</ul>";
      } else {
        var recs = tierRecords(cur, t);
        body = "<ul class='bank-list'>" + recs.map(function (r) {
          var open = bankEdit && bankEdit.tier === ti && bankEdit.kind === r.kind && bankEdit.idx === r.idx;
          return "<li" + (open ? " class='editing'" : "") + "><span class='bank-item'>" + esc(r.label) + "</span>" +
            (editable ? "<span class='bank-ctl'><button type='button' class='bank-btn' data-edit='" + ti + "|" + r.kind + "|" + r.idx + "'>✏️</button>" +
              "<button type='button' class='bank-btn danger' data-del='" + ti + "|" + r.kind + "|" + r.idx + "'>✕</button></span>" : "") +
            (open ? formHtml(r.kind, r.fields, ti, r.idx) : "") + "</li>";
        }).join("") + "</ul>" +
        ((t.sentences || []).length ? "<div class='pr-quiet'>" + t.sentences.length + " practice sentence" + (t.sentences.length === 1 ? "" : "s") + " (shown as written; not editable yet)</div>" : "") +
        (editable ? (bankEdit && bankEdit.tier === ti && bankEdit.idx === "new"
            ? formHtml(bankEdit.kind, {}, ti, null)
            : "<div class='pr-row'>" + addKinds.map(function (k) {
                return "<button type='button' class='ghost-btn inline-btn' data-add='" + ti + "|" + k + "'>➕ Add " +
                  (k === "verse" ? "verse" : k === "fact" ? "question" : "word") + "</button>";
              }).join("") + "</div>") : "");
      }
      return "<div class='pr-section'><b>" + esc(t.name || ("Level " + (ti + 1))) + "</b>" +
        (t.focus ? "<br><i>" + esc(t.focus) + "</i>" : "") + body + "</div>";
    }).join("");

    UI.openOverlay(
      "<div class='ch-title'>" + (cur.icon || "📚") + " " + esc(cur.name) + "</div>" +
      "<div class='ch-sub'>" + (cur.custom ? "Your set" : over ? "Built-in set, customized by you" : "Built-in set") +
      (editable && !cur.custom && !over ? " — the first edit makes your own copy; the original stays safe" : "") + "</div>" +
      "<div class='parent-scroll' id='pr-body'>" + tiersHtml + "</div>" +
      "<div class='pr-row setup-actions'>" +
      "<button type='button' class='big-btn' id='bank-back'>⬅️ BACK</button>" +
      (over ? "<button type='button' class='ghost-btn danger inline-btn' id='bank-restore'>Restore original</button>" : "") +
      "</div>"
    );
    wireInputs();
    tap($("bank-back"), function () { bankEdit = null; render("lessons"); });
    var rst = $("bank-restore");
    if (rst) armDouble(rst, "Tap again to RESTORE", function () {
      Store.clearOverride(cid);
      bankEdit = null;
      UI.toast("Back to the original " + cur.name + ".");
      showBank(cid);
    });
    tapEach("[data-edit]", function (b) {
      var q = b.getAttribute("data-edit").split("|");
      bankEdit = { tier: Number(q[0]), kind: q[1], idx: Number(q[2]) };
      showBank(cid);
    });
    tapEach("[data-add]", function (b) {
      var q = b.getAttribute("data-add").split("|");
      bankEdit = { tier: Number(q[0]), kind: q[1], idx: "new" };
      showBank(cid);
    });
    each("[data-del]", function (b) {
      var q = b.getAttribute("data-del").split("|");
      armDouble(b, "sure?", function () {
        var copy = Store.editableCopy(cid);
        removeRecord(copy, copy.tiers[Number(q[0])], q[1], Number(q[2]));
        Store.commitEdit(cid);
        bankEdit = null;
        showBank(cid);
      });
    });
    each("[data-form]", function (form) {
      var q = form.getAttribute("data-form").split("|");
      var ti = Number(q[0]), kind = q[1], idx = q[2] === "new" ? null : Number(q[2]);
      tap(form.querySelector("[data-fsave]"), function () {
        var vals = {};
        Array.prototype.forEach.call(form.querySelectorAll("[data-f]"), function (inp) { vals[inp.getAttribute("data-f")] = inp.value; });
        try {
          var fields = cleanFields(kind, vals);
          var copy = Store.editableCopy(cid);
          writeRecord(copy, copy.tiers[ti], kind, idx, fields);
          Store.commitEdit(cid);
          bankEdit = null;
          UI.toast(idx == null ? "Added!" : "Saved.");
          showBank(cid);
        } catch (e) {
          form.querySelector("[data-ferr]").textContent = e.message;
        }
      });
      tap(form.querySelector("[data-fcancel]"), function () { bankEdit = null; showBank(cid); });
      var first = form.querySelector("[data-f]");
      if (first && idx == null) setTimeout(function () { try { first.focus(); } catch (e) {} }, 50);
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
    function rowOf(cid) { return assigns.filter(function (x) { return x.cid === cid; })[0] || null; }
    // the child's own grade sets first, then everything else they could turn on
    var mine = assigns.map(function (a) { return Store.curriculum(a.cid); }).filter(Boolean);
    var rest = Store.allCurricula().filter(function (c) { return !rowOf(c.id) && !Store.parseGradeSet(c.id); });
    function rowHtml(c) {
      var a = rowOf(c.id);
      var on = !!(a && a.enabled);
      var w = a ? a.weight : 0;
      return "<div class='pr-section assign-row" + (on ? " on" : "") + "' data-row='" + c.id + "'>" +
        "<span class='assign-name'>" + (c.icon || "📚") + " " + esc(c.name) + "</span>" +
        "<span class='assign-ctl'>" +
        "<button type='button' class='tog" + (on ? " on" : "") + "' data-tog='" + c.id + "' aria-label='on/off'><span></span></button>" +
        "<button type='button' class='wt-btn' data-dec='" + c.id + "'>−</button>" +
        "<span class='wt-val' data-wt='" + c.id + "'>" + (w > 0 ? "weight " + w : "—") + "</span>" +
        "<button type='button' class='wt-btn' data-inc='" + c.id + "'>+</button>" +
        "</span></div>";
    }
    var p = profileById(chosenChild);
    return chips + paceBox +
      "<div class='pr-section'><i>The switch turns a set on or off (off remembers its weight). " +
      "Weight is how often it shows up in play, 1–5. Bible weighting is simply the weight on the Bible set. " +
      "Grades are chosen in <b>Explorers → Edit setup</b>.</i></div>" +
      "<div class='pr-quiet'>" + esc(p ? p.name + "'s sets" : "This explorer's sets") + "</div>" +
      mine.map(rowHtml).join("") +
      (rest.length ? "<div class='pr-quiet'>Other sets you can turn on</div>" + rest.map(rowHtml).join("") : "");
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
    // back to the top of the list on every single tap.
    function paintRow(cid, a) {
      var on = !!(a && a.enabled), w = a ? a.weight : 0;
      each("[data-wt='" + cid + "']", function (el) { el.textContent = w > 0 ? "weight " + w : "—"; });
      each("[data-row='" + cid + "']", function (el) { el.classList.toggle("on", on); });
      each("[data-tog='" + cid + "']", function (el) { el.classList.toggle("on", on); });
    }
    function rowFor(cid, create) {
      var assigns = Store.assignmentsFor(chosenChild);
      var a = assigns.filter(function (x) { return x.cid === cid; })[0];
      if (!a && create) {
        var sd = Store.parseGradeSet(cid) ? Store.subjectDef(Store.parseGradeSet(cid).subject) : null;
        a = { cid: cid, weight: sd ? sd.weight : 2, enabled: true, autoGrade: false };
        assigns.push(a);
      }
      return a || null;
    }
    function bump(cid, delta) {
      var a = rowFor(cid, true);
      a.weight = Math.max(1, Math.min(5, a.weight + delta));
      if (!a.enabled && delta > 0) a.enabled = true;   // nudging a weight up means "I want this"
      Store.saveFamily();
      paintRow(cid, a);
    }
    tapEach("[data-inc]", function (b) { bump(b.getAttribute("data-inc"), 1); });
    tapEach("[data-dec]", function (b) { bump(b.getAttribute("data-dec"), -1); });
    tapEach("[data-tog]", function (b) {
      var cid = b.getAttribute("data-tog");
      var a = rowFor(cid, true);
      a.enabled = !a.enabled;      // weight is remembered either way
      Store.saveFamily();
      paintRow(cid, a);
    });
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

      renderVoiceCheck() +

      "<div class='pr-section'><b>ℹ️ About the built-in content</b><br>" +
      "Bible memory verses are quoted from the King James Version (public domain) and every Bible item " +
      "shows its Scripture reference so you can audit it. The Latin set is original introductory material " +
      "written for this game. You control how much of each subject appears in the Assignments tab, and " +
      "how often questions may interrupt play with ⏳ Question pacing.</div>";
  }

  /* ---------------- voice check ----------------
     Speech engines differ from device to device and we cannot hear what a
     given iPad does. This screen names the voice in use and lets a parent
     hear every letter, then pick a different spelling for any that come out
     wrong. The choice is saved on this device only. */
  var voiceLetter = null;      // the letter currently being auditioned
  var ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

  function renderVoiceCheck() {
    var info = GameAudio.voiceInfo();
    var who = !info.supported
      ? "This browser has no speech engine — the 🔊 buttons will be silent."
      : (info.name
          ? "Using <b>" + esc(info.name) + "</b>" + (info.lang ? " (" + esc(info.lang) + ")" : "")
          : "Using this device's default voice") +
        (info.available ? " · " + info.available + " voices available" : "");

    var tiles = ALPHABET.map(function (ch) {
      return "<button type='button' class='vc-letter' data-vcl='" + ch + "'>" + ch.toUpperCase() + "</button>";
    }).join("");

    var words = (CONFIG.SPEECH.checkWords || []).map(function (w) {
      return "<button type='button' class='vc-word' data-vcw='" + esc(w) + "'>" + esc(w) + "</button>";
    }).join("");

    return "<div class='pr-section'><b>🗣️ Voice check</b><br>" +
      "<span class='pr-quiet'>" + who + "</span>" +
      "<i>Tap a letter to hear it. If one sounds wrong, pick a different spelling — " +
      "saved on this device only, because the right spelling depends on which voice is installed here.</i>" +
      "<div class='vc-grid'>" + tiles + "</div>" +
      "<div class='vc-alts' id='vc-alts'></div>" +
      "<div class='pr-quiet' style='margin-top:10px'>These words trip up speech engines. Tap to hear how yours does:</div>" +
      "<div class='vc-words'>" + words + "</div>" +
      "<button type='button' class='ghost-btn danger inline-btn' id='vc-reset'>Reset letter pronunciations</button>" +
      "</div>";
  }

  // Rebuilt in place — a full re-render here would wipe anything typed into
  // the email or PIN fields further up this tab.
  function paintVoiceAlts() {
    var box = $("vc-alts");
    if (!box) return;
    each("[data-vcl]", function (b) {
      b.classList.toggle("active", b.getAttribute("data-vcl") === voiceLetter);
    });
    if (!voiceLetter) { box.innerHTML = ""; return; }
    var current = GameAudio.letterSpelling(voiceLetter);
    var alts = GameAudio.letterAlternates(voiceLetter);
    box.innerHTML =
      "<div class='vc-alts-title'>“" + esc(voiceLetter.toUpperCase()) + "” sounds like:</div>" +
      alts.map(function (a) {
        return "<button type='button' class='vc-alt" + (a === current ? " active" : "") +
          "' data-vca='" + esc(a) + "'>" + esc(a) + "</button>";
      }).join("");
    tapEach("[data-vca]", function (b) {
      var pick = b.getAttribute("data-vca");
      GameAudio.setLetterSpelling(voiceLetter, pick);
      GameAudio.sayLetter(voiceLetter);
      paintVoiceAlts();
    });
  }

  function wireVoiceCheck() {
    tapEach("[data-vcl]", function (b) {
      voiceLetter = b.getAttribute("data-vcl");
      GameAudio.sayLetter(voiceLetter);
      paintVoiceAlts();
    });
    tapEach("[data-vcw]", function (b) {
      GameAudio.say(b.getAttribute("data-vcw"));
    });
    var rst = $("vc-reset");
    if (rst) armDouble(rst, "Tap again to RESET", function () {
      GameAudio.resetLetterSpellings();
      paintVoiceAlts();
      UI.toast("Letter pronunciations back to default.");
    });
    paintVoiceAlts();
  }

  function wireReports() {
    wireVoiceCheck();
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

  return { show: show, showSetup: showSetup };
})();
