"use strict";
/* ============================================================
   REPORTS — turns each child's stats + mastery into a
   parent-readable report: useful patterns (needs review,
   recently mastered, first-try accuracy by skill), not a dump
   of every answer.

   Email delivery uses formsubmit.co (free relay — the first
   send asks each address to click a one-time activation link).
   Additional Formspree-style endpoints can be listed in
   CONFIG.REPORT.endpoints. If no email is configured, the same
   report is always available in the Parents dashboard.
   ============================================================ */
var Reports = (function () {

  var SKILL_LABELS = {
    "reading/hear": "Hearing a word → tapping it (auditory recognition)",
    "reading/read": "Reading a word independently (no audio)",
    "reading/meaning": "Matching meaning (picture/definition → word)",
    "reading/sentences": "Sentence reading & comprehension",
    "reading/speak": "Reading a word aloud (mic, experimental)",
    "spelling/spot": "Spotting correct spellings",
    "spelling/spell": "Spelling words out",
    "vocab/recognize": "Vocabulary: English → new language",
    "vocab/recall": "Vocabulary: new language → English",
    "vocab/spell": "Spelling vocabulary words",
    "vocab/sentences": "Reading sentences in the new language",
    "bible/verse": "Completing memory verses",
    "bible/versebuild": "Building memory verses word-by-word",
    "bible/fact": "Bible knowledge questions",
    "math/solve": "Math facts"
  };

  function skillLabel(key) { return SKILL_LABELS[key] || key; }

  function fmtMinutes(ms) {
    var m = Math.round(ms / 60000);
    if (m < 60) return m + " min";
    return Math.floor(m / 60) + " hr " + (m % 60) + " min";
  }

  function accuracy(c) {
    if (!c || !c.tries) return null;
    return Math.round((c.clean / c.tries) * 100);
  }

  /* ---------- per-child report over a save ---------- */
  function childReportLines(profile, save) {
    var s = save.stats;
    var p = save.player;
    var lines = [];
    lines.push(profile.emoji + " " + profile.name.toUpperCase());
    lines.push("- Time played this week: " + fmtMinutes(s.playMs) + " over " + s.daysPlayed.length + " day(s)");
    lines.push("- Game level: " + p.level + " (" + UI.rankFor(p.level) + "), " + p.sparks + " sparks");
    var nudge = Store.nudgeMinutes(profile.id);
    lines.push("- Question timer: " + (nudge ? "a wishing star brings a question after " + nudge + " min without one" : "off"));
    lines.push("- Grade: " + (CONFIG.GRADE_LABELS[profile.grade] || profile.grade || "not set"));
    lines.push("");
    lines.push("WHERE THEY ARE");
    Learning.focusList(save, profile.id).forEach(function (f) {
      if (!f.enabled) return;
      lines.push("- " + f.name + ": " + (f.tierName || "level " + (f.tier + 1)) +
        " (" + (f.tier + 1) + " of " + f.tierCount + ")" + (f.focus ? " — " + f.focus : ""));
    });
    var promos = Learning.promotions(save, profile.id);
    if (promos.length) {
      lines.push("");
      lines.push("READY TO MOVE UP");
      promos.forEach(function (pr) {
        lines.push("- " + profile.name + " is cruising through " + pr.name + " (" + pr.tierWins +
          " clean wins at the top level)." + (pr.nextGrade
            ? " Consider moving up to " + (CONFIG.GRADE_LABELS[pr.nextGrade] || "grade " + pr.nextGrade) + " in the Parents area."
            : " That's the top of the built-in ladder — keep practicing, or add your own lists."));
      });
    }
    lines.push("");
    lines.push("PRACTICE THIS WEEK");
    var keys = Object.keys(s.challenges);
    if (!keys.length) lines.push("- (no challenges this week)");
    keys.forEach(function (k) {
      var c = s.challenges[k];
      var acc = accuracy(c);
      lines.push("- " + skillLabel(k) + ": " + c.tries + " tries, " +
        (acc === null ? "n/a" : acc + "% right on the first try"));
    });
    lines.push("");
    var review = Learning.needsReview(save);
    if (review.length) {
      lines.push("NEEDS REVIEW");
      review.forEach(function (r) {
        lines.push("- " + r.name + ": " + r.items.map(function (it) {
          return Learning.prettyKey(it.key);
        }).join(", "));
      });
      lines.push("  TIP: sneak these into car rides or bedtime — no pressure.");
      lines.push("  The game is already repeating them more often.");
    } else {
      lines.push("NEEDS REVIEW: nothing right now 🎉");
    }
    var mastered = Learning.masteredRecently(save, 10);
    if (mastered.length) {
      lines.push("");
      lines.push("GOING STRONG: " + mastered.join(", "));
    }
    lines.push("");
    lines.push("Lifetime: " + s.lifetime.challenges + " challenges (" + s.lifetime.clean + " first-try), " +
      s.lifetime.gathered + " blocks gathered, " + s.lifetime.built + " built, " +
      s.lifetime.quests + " quests, " + s.lifetime.harvested + " crops harvested.");
    return lines;
  }

  // full family report (all profiles)
  function buildTextReport() {
    var lines = [];
    lines.push(CONFIG.BRAND.name.toUpperCase() + " — WEEKLY FAMILY REPORT");
    lines.push("Week of " + new Date().toLocaleDateString());
    lines.push("");
    Store.family.profiles.forEach(function (p) {
      var save = (Store.profile && Store.profile.id === p.id) ? Store.data : Store.peekSave(p);
      if (!save) return;
      lines = lines.concat(childReportLines(p, save));
      lines.push("");
      lines.push("----------------------------------------");
      lines.push("");
    });
    return lines.join("\n");
  }

  /* ---------- emails ---------- */
  function getEmails() { return Store.family.settings.emails || []; }
  function addEmail(email) {
    email = (email || "").trim();
    if (!email || email.indexOf("@") < 1 || /\s/.test(email)) return false;
    var list = getEmails();
    if (list.indexOf(email) < 0) {
      list.push(email);
      Store.family.settings.emails = list;
      Store.saveFamily();
    }
    return true;
  }
  function removeEmail(email) {
    Store.family.settings.emails = getEmails().filter(function (e) { return e !== email; });
    Store.saveFamily();
  }

  function targets() {
    var t = getEmails().map(function (e) {
      return { label: e, url: "https://formsubmit.co/ajax/" + e };
    });
    (CONFIG.REPORT.endpoints || []).forEach(function (u) {
      t.push({ label: u.replace(/^https?:\/\//, "").slice(0, 30) + "…", url: u });
    });
    return t;
  }

  function enabled() { return targets().length > 0; }

  // callback(anyOk, results[])
  function send(callback) {
    var list = targets();
    if (!list.length) { if (callback) callback(false, []); return; }
    var subject = CONFIG.BRAND.name + " weekly family report";
    var report = buildTextReport();
    var results = [], pending = list.length;

    function finish() {
      var anyOk = results.some(function (r) { return r.ok; });
      if (anyOk && Store.profile) {
        Store.data.stats.lastReportAt = Date.now();
        Stats.rollWeek();
      }
      if (callback) callback(anyOk, results);
    }

    list.forEach(function (t) {
      fetch(t.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: subject,
          subject: subject,
          name: CONFIG.BRAND.name + " Reports",
          message: report
        })
      }).then(function (r) { return r.ok; })
        .catch(function () { return false; })
        .then(function (ok) {
          results.push({ label: t.label, ok: ok });
          pending -= 1;
          if (pending === 0) finish();
        });
    });
  }

  // called on game start: auto-send when a week has passed
  function maybeAutoSend() {
    if (!enabled()) return;
    var last = Store.data.stats.lastReportAt || Store.data.stats.weekStart;
    if (Date.now() - last > (Store.family.settings.reportDays || 7) * 24 * 3600 * 1000) {
      send(function (ok) { if (ok) console.log("Weekly report sent."); });
    }
  }

  return {
    buildTextReport: buildTextReport, childReportLines: childReportLines,
    send: send, maybeAutoSend: maybeAutoSend,
    getEmails: getEmails, addEmail: addEmail, removeEmail: removeEmail,
    enabled: enabled, skillLabel: skillLabel, fmtMinutes: fmtMinutes, accuracy: accuracy
  };
})();
