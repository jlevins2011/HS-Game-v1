"use strict";
/* ============================================================
   PARENTS AREA — a protected dashboard where parents:
   - manage explorer profiles
   - create their own lesson sets by pasting a list (no code)
   - assign lesson sets to children with relative weights
     (Bible weighting is just the weight on Bible sets)
   - read progress: needs-review patterns, accuracy by skill
   - manage weekly report emails, backups, and a parent PIN
   Opened by press-and-hold; a PIN can be required on top.
   ============================================================ */
var Parent = (function () {
  var $ = function (id) { return document.getElementById(id); };
  var tab = "explorers";
  var chosenChild = null;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------------- entry + PIN gate ---------------- */
  function show() {
    var pin = Store.family.settings.pin;
    if (pin) showPinGate(pin, render);
    else render();
  }

  function showPinGate(pin, onOk) {
    UI.openOverlay(
      "<div class='ch-title'>🗝️ Parents</div>" +
      "<div class='ch-sub'>Enter the parent PIN</div>" +
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
      b.addEventListener("pointerdown", function () {
        if (d === "⌫") entered = entered.slice(0, -1);
        else if (entered.length < 4) entered += d;
        $("pin-dots").textContent = (entered + "····").slice(0, 4).replace(/\d/g, "●");
        if (entered.length === 4) {
          if (entered === pin) { onOk(); }
          else {
            entered = "";
            GameAudio.sfx.wrong();
            $("pin-dots").textContent = "····";
          }
        }
      });
      pad.appendChild(b);
    });
    $("pin-cancel").addEventListener("pointerdown", UI.closeOverlay);
  }

  /* ---------------- shell ---------------- */
  var TABS = [
    { id: "explorers", label: "👧 Explorers" },
    { id: "lessons", label: "📚 Lessons" },
    { id: "assign", label: "🎯 Assignments" },
    { id: "reports", label: "📬 Reports & Settings" }
  ];

  function render(goTab) {
    if (goTab) tab = goTab;
    var nav = "<div class='pr-tabs'>" + TABS.map(function (t) {
      return "<button class='pr-tab" + (t.id === tab ? " active" : "") + "' data-tab='" + t.id + "'>" + t.label + "</button>";
    }).join("") + "</div>";
    var body = tab === "explorers" ? renderExplorers() :
               tab === "lessons" ? renderLessons() :
               tab === "assign" ? renderAssign() : renderReports();
    UI.openOverlay(
      "<div class='ch-title'>🗝️ Parents Area</div>" + nav +
      "<div class='parent-scroll' id='pr-body'>" + body + "</div>" +
      "<button class='big-btn' id='pr-close'>CLOSE</button>"
    );
    document.querySelectorAll(".pr-tab").forEach(function (b) {
      b.addEventListener("pointerdown", function () { render(b.getAttribute("data-tab")); });
    });
    $("pr-close").addEventListener("pointerdown", UI.closeOverlay);
    wireTab();
  }

  function wireTab() {
    if (tab === "explorers") wireExplorers();
    else if (tab === "lessons") wireLessons();
    else if (tab === "assign") wireAssign();
    else wireReports();
  }

  /* ---------------- explorers tab ---------------- */
  function renderExplorers() {
    var profiles = Store.family.profiles;
    if (!profiles.length) return "<div class='pr-section'>No explorers yet. Kids can add themselves from the home screen, or add one here.</div>" +
      "<button class='big-btn small-btn' id='px-add'>➕ Add explorer</button>";
    var html = profiles.map(function (p) {
      var save = (Store.profile && Store.profile.id === p.id) ? Store.data : Store.peekSave(p);
      var line = save
        ? "Level " + save.player.level + " (" + UI.rankFor(save.player.level) + ") · " +
          Reports.fmtMinutes(save.stats.playMs) + " this week · " +
          save.stats.lifetime.challenges + " lifetime challenges"
        : "Hasn't played yet";
      return "<div class='pr-section'>" +
        "<b>" + p.emoji + " " + esc(p.name) + "</b><br>" + line + "<br>" +
        "<div class='pr-row'>" +
        "<button class='big-btn small-btn' data-view='" + p.id + "'>📈 Progress</button>" +
        "<button class='ghost-btn danger inline-btn' data-reset='" + p.id + "'>Reset progress</button>" +
        "<button class='ghost-btn danger inline-btn' data-remove='" + p.id + "'>Remove</button>" +
        "</div></div>";
    }).join("");
    html += "<button class='big-btn small-btn' id='px-add'>➕ Add explorer</button>";
    return html;
  }

  function wireExplorers() {
    var addBtn = $("px-add");
    if (addBtn) addBtn.addEventListener("pointerdown", function () {
      UI.closeOverlay();
      if (Game.running) Game.stop();
      UI.showHome();
      UI.toast("Tap ➕ NEW EXPLORER to add one!");
    });
    document.querySelectorAll("[data-view]").forEach(function (b) {
      b.addEventListener("pointerdown", function () { showProgress(b.getAttribute("data-view")); });
    });
    document.querySelectorAll("[data-reset]").forEach(function (b) {
      armDouble(b, "Tap again to RESET", function () {
        Store.reset(b.getAttribute("data-reset"));
        render();
      });
    });
    document.querySelectorAll("[data-remove]").forEach(function (b) {
      armDouble(b, "Tap again to REMOVE", function () {
        Store.removeProfile(b.getAttribute("data-remove"));
        render();
      });
    });
  }

  function armDouble(btn, confirmText, fn) {
    var armed = false;
    btn.addEventListener("pointerdown", function () {
      if (!armed) { armed = true; btn.textContent = confirmText; return; }
      fn();
    });
  }

  function profileById(pid) {
    return Store.family.profiles.find(function (p) { return p.id === pid; });
  }
  function saveFor(pid) {
    if (Store.profile && Store.profile.id === pid) return Store.data;
    return Store.peekSave(profileById(pid));
  }

  function showProgress(pid) {
    var p = profileById(pid);
    var save = saveFor(pid);
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
      "<button class='big-btn' id='pg-back'>⬅️ BACK</button>"
    );
    $("pg-back").addEventListener("pointerdown", function () { render(); });
  }

  /* ---------------- lessons tab ---------------- */
  function renderLessons() {
    var all = Store.allCurricula();
    var rows = all.map(function (c) {
      var count = countItems(c);
      return "<div class='pr-section'>" +
        "<b>" + (c.icon || "📚") + " " + esc(c.name) + "</b> " +
        (c.custom ? "<span class='tag'>custom</span>" : "<span class='tag builtin'>built-in</span>") +
        "<br><i>" + esc(c.desc || subjectLabel(c.subject)) + "</i><br>" +
        count + " items · subject: " + subjectLabel(c.subject) +
        (c.translation ? " · " + c.translation : "") +
        (c.custom ? "<br><button class='ghost-btn danger inline-btn' data-delcur='" + c.id + "'>Delete</button>" : "") +
        "</div>";
    }).join("");
    return rows +
      "<div class='pr-section'><b>➕ Create a lesson set</b> — paste a list, assign it, done.<br>" +
      "<input type='text' id='nc-name' class='pr-input' placeholder='Name (e.g. Week 7 Spelling)'>" +
      "<select id='nc-type' class='pr-input'>" +
      "<option value='spelling'>Spelling words (one word per line)</option>" +
      "<option value='reading'>Reading words (word, optional emoji: dog 🐶)</option>" +
      "<option value='vocab'>Vocabulary pairs (latin = english)</option>" +
      "<option value='bibleverse'>Bible verses (Reference | verse text)</option>" +
      "<option value='quiz'>Questions (Question | answer | wrong | wrong)</option>" +
      "</select>" +
      "<textarea id='nc-text' class='pr-input pr-textarea' rows='6' placeholder='beautiful\ndifferent\nenough\nFebruary\nprobably\nseparate'></textarea>" +
      "<div id='nc-error' class='pr-error'></div>" +
      "<button class='big-btn small-btn' id='nc-save'>SAVE LESSON SET</button></div>";
  }

  function subjectLabel(s) {
    return { reading: "Reading", spelling: "Spelling", vocab: "Vocabulary", bible: "Bible", quiz: "Quiz", math: "Math" }[s] || s;
  }

  function countItems(c) {
    var n = 0;
    (c.tiers || []).forEach(function (t) {
      n += (t.words || []).length + (t.pairs || []).length + (t.verses || []).length + (t.facts || []).length;
      if (t.gen) n = "endless";
    });
    return n;
  }

  function parseLessonSet(name, type, text) {
    var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) throw new Error("Paste at least one line.");
    var tier = { name: name, focus: "parent-created set" };
    var cur = { name: name, tiers: [tier] };

    function splitPair(line) {
      var m = line.split(/\s*(?:=|\||—|–| - )\s*/);
      if (m.length < 2) throw new Error("Each line needs two parts, e.g. “aqua = water”: " + line);
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
        var m = splitPair(l);
        return [m[0], m.slice(1).join(" ")];
      });
    } else if (type === "bibleverse") {
      cur.subject = "bible";
      tier.verses = lines.map(function (l) {
        var m = splitPair(l);
        if (m.length < 2) throw new Error("Format: Reference | verse text — " + l);
        return { ref: m[0], text: m.slice(1).join(" ") };
      });
    } else if (type === "quiz") {
      cur.subject = "quiz";
      tier.facts = lines.map(function (l) {
        var m = l.split(/\s*\|\s*/);
        if (m.length < 3) throw new Error("Format: Question | answer | wrong | wrong — " + l);
        return { q: m[0], a: m[1], choices: m.slice(1), ref: "" };
      });
    } else {
      throw new Error("Unknown type");
    }
    return cur;
  }

  function wireLessons() {
    document.querySelectorAll("[data-delcur]").forEach(function (b) {
      armDouble(b, "Tap again to DELETE", function () {
        Store.removeCustomCurriculum(b.getAttribute("data-delcur"));
        render();
      });
    });
    var saveBtn = $("nc-save");
    if (saveBtn) saveBtn.addEventListener("pointerdown", function () {
      var name = ($("nc-name").value || "").trim();
      var type = $("nc-type").value;
      var text = $("nc-text").value || "";
      var err = $("nc-error");
      if (!name) { err.textContent = "Give the lesson set a name."; return; }
      try {
        var cur = parseLessonSet(name, type, text);
        cur.icon = { spelling: "✏️", reading: "📖", vocab: "🏛️", bibleverse: "📜", quiz: "❓" }[type] || "📚";
        cur.desc = "Created by a parent on " + new Date().toLocaleDateString();
        Store.addCustomCurriculum(cur);
        UI.toast("📚 Saved “" + name + "”! Now assign it to a child.");
        render("assign");
      } catch (e) {
        err.textContent = e.message;
      }
    });
  }

  /* ---------------- assignments tab ---------------- */
  function renderAssign() {
    var profiles = Store.family.profiles;
    if (!profiles.length) return "<div class='pr-section'>Add an explorer first!</div>";
    if (!chosenChild || !profileById(chosenChild)) chosenChild = profiles[0].id;
    var chips = "<div class='pr-chips'>" + profiles.map(function (p) {
      return "<button class='pr-chip" + (p.id === chosenChild ? " active" : "") + "' data-child='" + p.id + "'>" +
        p.emoji + " " + esc(p.name) + "</button>";
    }).join("") + "</div>";

    var assigns = Store.assignmentsFor(chosenChild);
    function weightOf(cid) {
      var a = assigns.find(function (x) { return x.cid === cid; });
      return a ? a.weight : 0;
    }
    var rows = Store.allCurricula().map(function (c) {
      var w = weightOf(c.id);
      return "<div class='pr-section assign-row" + (w > 0 ? " on" : "") + "'>" +
        "<span class='assign-name'>" + (c.icon || "📚") + " " + esc(c.name) + "</span>" +
        "<span class='assign-ctl'>" +
        "<button class='wt-btn' data-dec='" + c.id + "'>−</button>" +
        "<span class='wt-val'>" + (w > 0 ? "weight " + w : "off") + "</span>" +
        "<button class='wt-btn' data-inc='" + c.id + "'>+</button>" +
        "</span></div>";
    }).join("");
    return chips +
      "<div class='pr-section'><i>Weight controls how often each subject appears in play. " +
      "Higher weight = more often. “Off” removes it. Bible weighting is simply the weight on Bible sets.</i></div>" +
      rows;
  }

  function wireAssign() {
    document.querySelectorAll("[data-child]").forEach(function (b) {
      b.addEventListener("pointerdown", function () {
        chosenChild = b.getAttribute("data-child");
        render();
      });
    });
    function bump(cid, delta) {
      var assigns = Store.assignmentsFor(chosenChild);
      var a = assigns.find(function (x) { return x.cid === cid; });
      if (!a && delta > 0) { assigns.push({ cid: cid, weight: 1 }); }
      else if (a) {
        a.weight = Math.max(0, Math.min(5, a.weight + delta));
        if (a.weight === 0) assigns.splice(assigns.indexOf(a), 1);
      }
      Store.saveFamily();
      render();
    }
    document.querySelectorAll("[data-inc]").forEach(function (b) {
      b.addEventListener("pointerdown", function () { bump(b.getAttribute("data-inc"), 1); });
    });
    document.querySelectorAll("[data-dec]").forEach(function (b) {
      b.addEventListener("pointerdown", function () { bump(b.getAttribute("data-dec"), -1); });
    });
  }

  /* ---------------- reports & settings tab ---------------- */
  function renderReports() {
    var emails = Reports.getEmails();
    return "" +
      "<div class='pr-section'><b>📬 Weekly email reports</b> (every " + (Store.family.settings.reportDays || 7) + " days, whole family)<br>" +
      (emails.length
        ? "<div class='pr-emails'>" + emails.map(function (e) {
            return "<div class='pr-email-row'><span>" + esc(e) + "</span>" +
              "<button class='pr-email-del' data-email='" + esc(e) + "'>✕</button></div>";
          }).join("") + "</div>"
        : "<i>No emails linked yet — add one below.</i>") +
      "<div class='pr-email-add'>" +
      "<input type='email' id='pr-email-input' class='pr-input' placeholder='parent@email.com'>" +
      "<button class='big-btn small-btn' id='pr-email-addbtn'>ADD</button></div>" +
      (emails.length
        ? "<button class='big-btn small-btn' id='pr-send'>📧 SEND FAMILY REPORT NOW</button>" +
          "<div id='pr-send-status'></div>" +
          "<i>First time? Each address gets a one-time “activate” email from formsubmit.co — click its link once, then reports flow automatically.</i>"
        : "") +
      "</div>" +

      "<div class='pr-section'><b>📄 Report preview</b><br>" +
      "<button class='big-btn small-btn' id='pr-preview'>SHOW THIS WEEK'S REPORT</button></div>" +

      "<div class='pr-section'><b>💾 Backup</b> — saves live in this browser. Export a backup file so " +
      "clearing browser data can never erase progress (and to move to a new device).<br>" +
      "<div class='pr-row'>" +
      "<button class='big-btn small-btn' id='pr-export'>⬇️ EXPORT BACKUP</button>" +
      "<button class='big-btn small-btn' id='pr-import'>⬆️ RESTORE BACKUP</button>" +
      "<input type='file' id='pr-import-file' accept='.json,application/json' style='display:none'>" +
      "</div></div>" +

      "<div class='pr-section'><b>🔒 Parent PIN</b> — " +
      (Store.family.settings.pin ? "a PIN is set." : "no PIN set (the Parents button only needs a long press).") + "<br>" +
      "<div class='pr-email-add'>" +
      "<input type='tel' id='pr-pin-input' class='pr-input' maxlength='4' placeholder='4 digits (blank = off)'>" +
      "<button class='big-btn small-btn' id='pr-pin-set'>SET</button></div></div>" +

      "<div class='pr-section'><b>ℹ️ About the built-in content</b><br>" +
      "Bible memory verses are quoted from the King James Version (public domain) and every Bible item " +
      "shows its Scripture reference so you can audit it. The Latin set is original introductory material " +
      "written for this game. You control how much of each subject appears in the Assignments tab.</div>";
  }

  function wireReports() {
    document.querySelectorAll(".pr-email-del").forEach(function (btn) {
      btn.addEventListener("pointerdown", function () {
        Reports.removeEmail(btn.getAttribute("data-email"));
        render();
      });
    });
    var addBtn = $("pr-email-addbtn");
    if (addBtn) addBtn.addEventListener("pointerdown", function () {
      var input = $("pr-email-input");
      if (Reports.addEmail(input.value)) render();
      else input.style.borderColor = "#c0392b";
    });
    var sendBtn = $("pr-send");
    if (sendBtn) sendBtn.addEventListener("pointerdown", function () {
      sendBtn.textContent = "SENDING…";
      Reports.send(function (anyOk, results) {
        sendBtn.textContent = anyOk ? "✅ SENT!" : "❌ COULD NOT SEND";
        var status = $("pr-send-status");
        if (status) status.innerHTML = results.map(function (r) {
          return (r.ok ? "✅ " : "❌ ") + esc(r.label);
        }).join("<br>");
      });
    });
    var prevBtn = $("pr-preview");
    if (prevBtn) prevBtn.addEventListener("pointerdown", function () {
      UI.openOverlay(
        "<div class='ch-title'>📄 This Week</div>" +
        "<div class='parent-scroll'><pre class='pr-pre'>" + esc(Reports.buildTextReport()) + "</pre></div>" +
        "<button class='big-btn' id='rp-back'>⬅️ BACK</button>"
      );
      $("rp-back").addEventListener("pointerdown", function () { render(); });
    });
    var expBtn = $("pr-export");
    if (expBtn) expBtn.addEventListener("pointerdown", function () {
      var blob = new Blob([Store.exportAll()], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lumen-isles-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      UI.toast("💾 Backup file created!");
    });
    var impBtn = $("pr-import");
    if (impBtn) impBtn.addEventListener("pointerdown", function () { $("pr-import-file").click(); });
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
    var pinBtn = $("pr-pin-set");
    if (pinBtn) pinBtn.addEventListener("pointerdown", function () {
      var v = ($("pr-pin-input").value || "").trim();
      if (v && !/^\d{4}$/.test(v)) { $("pr-pin-input").style.borderColor = "#c0392b"; return; }
      Store.family.settings.pin = v || null;
      Store.saveFamily();
      UI.toast(v ? "🔒 PIN set!" : "🔓 PIN removed.");
      render();
    });
  }

  return { show: show };
})();
