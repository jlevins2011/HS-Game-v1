"use strict";
/* ============================================================
   STORE — persistence (localStorage) with a clean seam for
   future cloud sync: everything lives under a small set of
   keys, and exportAll()/importAll() move the whole family's
   data as one JSON bundle (used today for file backups).

   Keys:
   - lumen_family_v1          family: profiles, custom curricula,
                              overrides of built-in sets,
                              assignments, parent settings
   - lumen_save_v1_<profile>  one save per child
   - *_bak                    the pre-migration copy of either,
                              written once before a version bump
                              so a bad migration is recoverable

   Versions: family blob 2, save blob 3. Every earlier version
   has a migration branch below — an unknown version is never
   silently replaced with a fresh object.
   ============================================================ */
var Store = (function () {
  var FAMILY_KEY = "lumen_family_v1";
  var SAVE_PREFIX = "lumen_save_v1_";
  var FAMILY_VERSION = 2;
  var SAVE_VERSION = 3;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} }

  // The pre-migration copy. Written once per key; a second migration on the
  // same device (there shouldn't be one) must not overwrite the original.
  function stashBackup(key, raw) {
    if (!raw) return;
    var bk = key + "_bak";
    if (lsGet(bk) === null) lsSet(bk, raw);
  }

  /* ---------------- grade-leveled set ids ----------------
     Every graded subject's set is "<subject>-<grade>" (reading-3, math-k).
     These helpers are the only place that string is built or parsed. */
  function gradeSetId(subject, grade) {
    return subject + "-" + String(grade).toLowerCase();
  }
  function parseGradeSet(cid) {
    var m = /^(reading|spelling|math)-(k|[1-5])$/.exec(String(cid || ""));
    if (!m) return null;
    return { subject: m[1], grade: m[2] === "k" ? "K" : m[2] };
  }
  function nextGrade(grade) {
    var g = CONFIG.GRADES;
    var i = g.indexOf(String(grade));
    return (i >= 0 && i < g.length - 1) ? g[i + 1] : null;
  }

  // ids from before grade-leveling. math1 was one all-grades set; its item
  // keys ("7×8") are grade-agnostic, so it lands on the child's own grade.
  var LEGACY_IDS = { reading2: "reading-2", reading5: "reading-5",
                     spelling2: "spelling-2", spelling5: "spelling-5" };
  function remapCid(cid, grade) {
    if (LEGACY_IDS[cid]) return LEGACY_IDS[cid];
    if (cid === "math1") return gradeSetId("math", grade || CONFIG.DEFAULT_GRADE);
    return cid;
  }

  /* ---------------- family data ---------------- */
  function freshFamily() {
    return {
      version: FAMILY_VERSION,
      profiles: [],            // { id, name, emoji, color, grade, setupConfirmed, createdAt }
      custom: [],              // parent-created curricula (same shape as built-ins, single tier)
      overrides: {},           // cid -> household copy of a built-in set (shadow-copy-on-edit)
      assignments: {},         // profileId -> [ { cid, weight, enabled, autoGrade } ]
      promoSnooze: {},         // profileId -> cid -> tierWins when "not yet" was tapped
      settings: {
        pin: null,             // optional 4-digit parent PIN
        emails: [],            // weekly report recipients
        reportDays: CONFIG.REPORT.everyDays,
        // The question timer: how long a child may play without a question
        // before a wishing star brings one. Parent-only: it lives in family
        // settings (behind the long-press + PIN), never in a child's save,
        // so a child cannot change it or reset it away.
        nudgeMinutes: CONFIG.LEARN.starfallMinutes,   // family default
        nudgeByChild: {}                              // profileId -> minutes (overrides the default)
      }
    };
  }

  // Earlier builds stored "paceMinutes", a MINIMUM gap between questions —
  // the opposite of what was wanted. A parent who set it meant "a question
  // at least every N minutes", so the value carries over as the timer.
  function normalizeSettings(raw) {
    raw = raw || {};
    var st = Object.assign(freshFamily().settings, raw);
    // look at what was actually stored, not at the defaults just merged in
    if (raw.nudgeMinutes === undefined || raw.nudgeMinutes === null) {
      st.nudgeMinutes = (raw.paceMinutes > 0) ? raw.paceMinutes : CONFIG.LEARN.starfallMinutes;
    }
    if (!raw.nudgeByChild || typeof raw.nudgeByChild !== "object") {
      st.nudgeByChild = {};
      Object.keys(raw.paceByChild || {}).forEach(function (pid) {
        if (raw.paceByChild[pid] > 0) st.nudgeByChild[pid] = raw.paceByChild[pid];
      });
    }
    delete st.paceMinutes;
    delete st.paceByChild;
    return st;
  }

  function gradeOfProfileIn(fam, pid) {
    var p = (fam.profiles || []).filter(function (x) { return x.id === pid; })[0];
    return (p && p.grade) || CONFIG.DEFAULT_GRADE;
  }

  // v1 → v2: two age bands become a grade; assignment rows gain
  // enabled/autoGrade; legacy set ids are remapped.
  function migrateFamilyV1(old) {
    var fam = Object.assign(freshFamily(), old);
    fam.version = FAMILY_VERSION;
    fam.profiles = (old.profiles || []).map(function (p) {
      var q = Object.assign({}, p);
      if (!q.grade) q.grade = (p.band === "older") ? "5" : "2";
      delete q.band;
      // these children already had assignments a parent could see, so
      // don't nag for a setup that effectively happened
      if (q.setupConfirmed === undefined) q.setupConfirmed = true;
      return q;
    });
    fam.assignments = {};
    Object.keys(old.assignments || {}).forEach(function (pid) {
      var grade = gradeOfProfileIn(fam, pid);
      fam.assignments[pid] = (old.assignments[pid] || []).map(function (r) {
        return { cid: remapCid(r.cid, grade), weight: r.weight, enabled: true, autoGrade: true };
      });
    });
    fam.overrides = old.overrides || {};
    fam.promoSnooze = old.promoSnooze || {};
    fam.settings = normalizeSettings(old.settings);
    return fam;
  }

  function loadFamilyFromRaw(raw, key) {
    if (!raw) return freshFamily();
    var pf = null;
    try { pf = JSON.parse(raw); } catch (e) { return freshFamily(); }
    if (!pf || typeof pf !== "object") return freshFamily();
    if (pf.version === 1) {
      stashBackup(key, raw);
      return migrateFamilyV1(pf);
    }
    if (pf.version === FAMILY_VERSION) {
      var fam = Object.assign(freshFamily(), pf);
      fam.settings = normalizeSettings(pf.settings);
      fam.overrides = pf.overrides || {};
      fam.promoSnooze = pf.promoSnooze || {};
      return fam;
    }
    // A newer blob than this build understands. Keep it exactly as it is —
    // never overwrite data we can't read — and work from a fresh copy.
    stashBackup(key, raw);
    return freshFamily();
  }

  var family = loadFamilyFromRaw(lsGet(FAMILY_KEY), FAMILY_KEY);

  var famTimer = null;
  function saveFamily() {
    if (famTimer) return;
    famTimer = setTimeout(function () {
      famTimer = null;
      lsSet(FAMILY_KEY, JSON.stringify(family));
    }, 200);
  }
  function saveFamilyNow() { lsSet(FAMILY_KEY, JSON.stringify(family)); }

  function rand4() { return Math.floor(Math.random() * 1679616).toString(36); }   // 36^4
  function uid() { return "p" + Date.now().toString(36) + rand4(); }

  /* ---------------- subjects & grade plans ---------------- */
  function subjectDef(id) {
    return CONFIG.SUBJECTS.filter(function (s) { return s.id === id; })[0] || null;
  }

  // the rows a brand-new child of this grade gets
  function defaultAssignments(grade, plan) {
    var out = [];
    CONFIG.SUBJECTS.forEach(function (s) {
      var sub = plan && plan.subjects && plan.subjects[s.id];
      var on = sub ? !!sub.enabled : !!s.defaultOn;
      if (s.graded) {
        var g = (sub && sub.grade) || grade;
        out.push({ cid: gradeSetId(s.id, g), weight: s.weight, enabled: on, autoGrade: String(g) === String(grade) });
      } else if (on || sub) {
        out.push({ cid: s.cid, weight: s.weight, enabled: on, autoGrade: false });
      }
    });
    return out;
  }

  function addProfile(opts) {
    var grade = String(opts.grade || CONFIG.DEFAULT_GRADE);
    var p = {
      id: uid(),
      name: (opts.name || "Explorer").slice(0, 16),
      emoji: opts.emoji || "🦊",
      color: opts.color || "#5fae6f",
      grade: grade,
      setupConfirmed: !!opts.setupConfirmed,
      createdAt: Date.now()
    };
    family.profiles.push(p);
    family.assignments[p.id] = defaultAssignments(grade, opts.plan);
    saveFamily();
    return p;
  }

  function removeProfile(pid) {
    family.profiles = family.profiles.filter(function (p) { return p.id !== pid; });
    delete family.assignments[pid];
    delete family.promoSnooze[pid];
    if (family.settings.nudgeByChild) delete family.settings.nudgeByChild[pid];
    saveFamily();
    lsDel(SAVE_PREFIX + pid);
    lsDel(SAVE_PREFIX + pid + "_bak");
  }

  function profile(pid) {
    return family.profiles.filter(function (p) { return p.id === pid; })[0] || null;
  }

  function assignmentsFor(pid) {
    if (!family.assignments[pid]) family.assignments[pid] = [];
    // older rows may lack the flags; treat missing as on / in sync
    family.assignments[pid].forEach(function (r) {
      if (r.enabled === undefined) r.enabled = true;
      if (r.autoGrade === undefined) r.autoGrade = !!parseGradeSet(r.cid);
    });
    return family.assignments[pid];
  }

  // { grade, subjects: { reading:{grade,enabled,weight}, ..., bible:{enabled,weight}, latin:{...} } }
  function gradePlanFor(pid) {
    var p = profile(pid);
    var rows = assignmentsFor(pid);
    var plan = { grade: (p && p.grade) || CONFIG.DEFAULT_GRADE, subjects: {} };
    CONFIG.SUBJECTS.forEach(function (s) {
      if (s.graded) {
        var mine = rows.filter(function (r) { var g = parseGradeSet(r.cid); return g && g.subject === s.id; });
        var pick = mine.filter(function (r) { return r.enabled; })[0] || mine[0];
        var g = pick ? parseGradeSet(pick.cid).grade : plan.grade;
        plan.subjects[s.id] = { grade: g, enabled: !!(pick && pick.enabled), weight: pick ? pick.weight : s.weight,
                               autoGrade: pick ? pick.autoGrade !== false : true };
      } else {
        var row = rows.filter(function (r) { return r.cid === s.cid; })[0];
        plan.subjects[s.id] = { enabled: !!(row && row.enabled), weight: row ? row.weight : s.weight };
      }
    });
    return plan;
  }

  // Rewrites the built-in subject rows to match a plan. Custom and imported
  // sets are left exactly as they are.
  function applyGradePlan(pid, plan) {
    var p = profile(pid);
    if (!p) return;
    var grade = String(plan.grade || p.grade || CONFIG.DEFAULT_GRADE);
    p.grade = grade;
    p.setupConfirmed = true;
    var rows = assignmentsFor(pid);
    var kept = [];
    CONFIG.SUBJECTS.forEach(function (s) {
      var sub = (plan.subjects && plan.subjects[s.id]) || {};
      if (s.graded) {
        var old = rows.filter(function (r) { var g = parseGradeSet(r.cid); return g && g.subject === s.id; });
        var prev = old.filter(function (r) { return r.enabled; })[0] || old[0];
        var g = String(sub.grade || grade);
        var weight = sub.weight || (prev ? prev.weight : s.weight);
        var enabled = sub.enabled === undefined ? (prev ? !!prev.enabled : !!s.defaultOn) : !!sub.enabled;
        kept.push({ cid: gradeSetId(s.id, g), weight: weight, enabled: enabled, autoGrade: g === grade });
      } else {
        var row = rows.filter(function (r) { return r.cid === s.cid; })[0];
        var on = sub.enabled === undefined ? (row ? !!row.enabled : !!s.defaultOn) : !!sub.enabled;
        kept.push({ cid: s.cid, weight: sub.weight || (row ? row.weight : s.weight), enabled: on, autoGrade: false });
      }
    });
    var others = rows.filter(function (r) {
      if (parseGradeSet(r.cid)) return false;
      return !CONFIG.SUBJECTS.some(function (s) { return s.cid === r.cid; });
    });
    family.assignments[pid] = kept.concat(others);
    saveFamily();
    return family.assignments[pid];
  }

  // Move one graded subject up a grade. Returns the new cid, or null at the top.
  function promote(pid, cid) {
    var g = parseGradeSet(cid);
    var p = profile(pid);
    if (!g || !p) return null;
    var nxt = nextGrade(g.grade);
    if (!nxt) return null;
    var rows = assignmentsFor(pid);
    var row = rows.filter(function (r) { return r.cid === cid; })[0];
    var target = gradeSetId(g.subject, nxt);
    if (row) { row.cid = target; row.autoGrade = String(nxt) === String(p.grade); }
    else rows.push({ cid: target, weight: subjectDef(g.subject).weight, enabled: true, autoGrade: false });
    if (family.promoSnooze[pid]) delete family.promoSnooze[pid][cid];
    saveFamily();
    return target;
  }

  function snoozePromotion(pid, cid, tierWins) {
    if (!family.promoSnooze[pid]) family.promoSnooze[pid] = {};
    family.promoSnooze[pid][cid] = tierWins || 0;
    saveFamily();
  }
  function promotionSnoozedAt(pid, cid) {
    var s = family.promoSnooze[pid];
    return s && s[cid] !== undefined ? s[cid] : null;
  }

  /* -------- question timer (parent-controlled) --------
     Minutes a child may play without a question before a wishing star
     falls and brings one. 0 = never. */
  var NUDGE_MAX = 120;
  function nudgeMinutes(pid) {
    var s = family.settings || {};
    var per = s.nudgeByChild || {};
    var v = (pid && per[pid] !== undefined && per[pid] !== null) ? per[pid] : s.nudgeMinutes;
    v = Number(v);
    if (!isFinite(v) || v < 0) v = 0;
    return Math.min(NUDGE_MAX, Math.round(v));
  }
  // pid null -> set the family default; applyToAll clears every override too
  function setNudgeMinutes(pid, minutes, applyToAll) {
    var v = Number(minutes);
    if (!isFinite(v) || v < 0) v = 0;
    v = Math.min(NUDGE_MAX, Math.round(v));
    if (!family.settings.nudgeByChild) family.settings.nudgeByChild = {};
    if (applyToAll || !pid) {
      family.settings.nudgeMinutes = v;
      if (applyToAll) family.settings.nudgeByChild = {};
    } else {
      family.settings.nudgeByChild[pid] = v;
    }
    saveFamily();
    return v;
  }

  /* -------- curricula lookup: built-in (through any household override) + custom -------- */
  function builtins() { return window.BUILTIN_CURRICULA || []; }
  function baseCurriculum(cid) {
    var b = builtins();
    for (var i = 0; i < b.length; i++) if (b[i].id === cid) return b[i];
    return null;
  }
  function isOverridden(cid) { return !!(family.overrides && family.overrides[cid]); }
  function allCurricula() {
    var out = builtins().map(function (c) { return family.overrides[c.id] || c; });
    return out.concat(family.custom);
  }
  function curriculum(cid) {
    if (family.overrides[cid]) return family.overrides[cid];
    for (var i = 0; i < family.custom.length; i++) if (family.custom[i].id === cid) return family.custom[i];
    return baseCurriculum(cid);
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // The object an editor may mutate: a custom set itself, or a household
  // copy of a built-in under the SAME id (so mastery keyed by cid survives).
  function editableCopy(cid) {
    for (var i = 0; i < family.custom.length; i++) if (family.custom[i].id === cid) return family.custom[i];
    if (!family.overrides[cid]) {
      var base = baseCurriculum(cid);
      if (!base) return null;
      var copy = clone(base);
      copy.customized = true;
      family.overrides[cid] = copy;
    }
    return family.overrides[cid];
  }
  function commitEdit(cid) { saveFamily(); return curriculum(cid); }
  function clearOverride(cid) { delete family.overrides[cid]; saveFamily(); }

  function addCustomCurriculum(cur) {
    cur.id = "c" + Date.now().toString(36) + rand4();
    cur.custom = true;
    family.custom.push(cur);
    saveFamily();
    return cur;
  }
  function removeCustomCurriculum(cid) {
    family.custom = family.custom.filter(function (c) { return c.id !== cid; });
    Object.keys(family.assignments).forEach(function (pid) {
      family.assignments[pid] = family.assignments[pid].filter(function (a) { return a.cid !== cid; });
    });
    saveFamily();
  }

  /* ---------------- per-child save ---------------- */
  function freshData() {
    return {
      version: SAVE_VERSION,
      player: {
        xp: 0, level: 1, sparks: 0,
        toolTier: 0,               // mallet: 0 timber, 1 stone, 2 skysteel, 3 starstone
        isle: "meadowmere",
        inventory: {},             // itemName -> count
        tools: {},                 // hatchet/brush/kiln/lanternkit/cloudcap + legendary
        seeds: {}
      },
      elder: { wins: 0 },          // Elder Alder super-challenge wins
      tinker: { wins: 0 },         // Wren super-challenge wins
      learn: {
        tiers: {},                 // cid -> { tier, tierWins, struggle }
        mastery: {}                // cid -> itemKey -> skill -> { box, win, miss, last }
      },
      // per-isle world state: gathered objects (regrowing), built pieces,
      // restored lightsprings, planted crops, connected bridges
      isles: {},                   // isleId -> { removed:{}, pieces:[], springs:[], planters:{}, bridges:{} }
      quests: { active: null, completed: 0 },
      stats: {
        weekStart: Date.now(),
        lastReportAt: 0,
        playMs: 0,
        daysPlayed: [],
        challenges: {},            // "subject/skill" -> { tries, clean, mistakes }
        lastChallengeAt: 0,        // the question timer counts from here (survives reloads)
        lifetime: { challenges: 0, clean: 0, sparks: 0, gathered: 0, built: 0, quests: 0, harvested: 0 }
      }
    };
  }

  // carry a v1 (voxel-era) save's progress into the v2 world format
  function migrateV1(old) {
    var d = freshData();
    d.version = 2;
    if (old.player) {
      ["xp", "level", "sparks", "toolTier", "isle"].forEach(function (k) {
        if (old.player[k] !== undefined) d.player[k] = old.player[k];
      });
      Object.keys(old.player.inventory || {}).forEach(function (k) {
        if (window.ITEM_ICON && ITEM_ICON[k]) d.player.inventory[k] = old.player.inventory[k];
      });
      Object.keys(old.player.tools || {}).forEach(function (k) {
        if (k !== "spade") d.player.tools[k] = old.player.tools[k];
      });
    }
    if (old.elder) d.elder = deepMergeDefaults(freshData().elder, old.elder);
    if (old.tinker) d.tinker = deepMergeDefaults(freshData().tinker, old.tinker);
    if (old.learn) d.learn = deepMergeDefaults(freshData().learn, old.learn);
    if (old.stats) d.stats = deepMergeDefaults(freshData().stats, old.stats);
    if (old.quests) d.quests = { active: null, completed: old.quests.completed || 0 };
    return d;
  }

  // v2 → v3: learning records move to the grade-leveled set ids. Existing
  // records under the new id (if any) win; the old ones fill in the gaps.
  function migrateSaveV2(d, grade) {
    var learn = d.learn || (d.learn = { tiers: {}, mastery: {} });
    var tiers = {}, mastery = {};
    Object.keys(learn.tiers || {}).forEach(function (cid) {
      var to = remapCid(cid, grade);
      if (!tiers[to] || to === cid) tiers[to] = learn.tiers[cid];
    });
    Object.keys(learn.mastery || {}).forEach(function (cid) {
      var to = remapCid(cid, grade);
      var src = learn.mastery[cid];
      if (!mastery[to]) { mastery[to] = src; return; }
      Object.keys(src).forEach(function (itemKey) {
        if (!mastery[to][itemKey]) mastery[to][itemKey] = src[itemKey];
        else Object.keys(src[itemKey]).forEach(function (sk) {
          if (!mastery[to][itemKey][sk]) mastery[to][itemKey][sk] = src[itemKey][sk];
        });
      });
    });
    learn.tiers = tiers;
    learn.mastery = mastery;
    d.version = SAVE_VERSION;
    return d;
  }

  // raw JSON -> a save at the current version (or null if unreadable).
  // `key` enables the pre-migration backup; omit it for a read-only peek.
  function normalizeSave(raw, prof, key) {
    if (!raw) return null;
    var parsed = null;
    try { parsed = JSON.parse(raw); } catch (e) { return null; }
    if (!parsed || typeof parsed !== "object") return null;
    var grade = (prof && prof.grade) || CONFIG.DEFAULT_GRADE;
    if (parsed.version === SAVE_VERSION) return deepMergeDefaults(freshData(), parsed);
    if (parsed.version === 2) {
      if (key) stashBackup(key, raw);
      return deepMergeDefaults(freshData(), migrateSaveV2(parsed, grade));
    }
    if (parsed.version === 1) {
      if (key) stashBackup(key, raw);
      return deepMergeDefaults(freshData(), migrateSaveV2(migrateV1(parsed), grade));
    }
    // newer than this build: keep it untouched, play on a fresh save
    if (key) stashBackup(key, raw);
    return null;
  }

  var data = freshData();
  var prof = null;
  var activeKey = null;

  function deepMergeDefaults(fresh, saved) {
    Object.keys(fresh).forEach(function (k) {
      if (saved[k] === undefined) saved[k] = fresh[k];
      else if (fresh[k] && typeof fresh[k] === "object" && !Array.isArray(fresh[k]) &&
               saved[k] && typeof saved[k] === "object" && !Array.isArray(saved[k])) {
        deepMergeDefaults(fresh[k], saved[k]);
      }
    });
    return saved;
  }

  function load(p) {
    prof = p;
    activeKey = SAVE_PREFIX + p.id;
    data = normalizeSave(lsGet(activeKey), p, activeKey) || freshData();
    Store.data = data;
    Store.profile = prof;
  }

  var saveTimer = null;
  function save() {
    if (saveTimer || !activeKey) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      lsSet(activeKey, JSON.stringify(data));
    }, 250);
  }

  function saveNow() {
    if (!activeKey) return;
    lsSet(activeKey, JSON.stringify(data));
  }

  function reset(pid) {
    var key = SAVE_PREFIX + pid;
    lsDel(key);
    if (activeKey === key) { data = freshData(); Store.data = data; }
  }

  function peek(p) {
    var d = peekSave(p);
    return d ? { level: d.player.level, sparks: d.player.sparks } : null;
  }

  function peekSave(p) {
    if (!p) return null;
    return normalizeSave(lsGet(SAVE_PREFIX + p.id), p, null);
  }

  function isleState(isleId) {
    if (!data.isles[isleId]) {
      data.isles[isleId] = { removed: {}, pieces: [], springs: [], planters: {}, bridges: {} };
    }
    return data.isles[isleId];
  }

  /* ---------------- backup / restore ---------------- */
  function exportAll() {
    var bundle = { app: "lumen-isles", exportedAt: new Date().toISOString(), family: family, saves: {} };
    family.profiles.forEach(function (p) {
      var s = peekSave(p);
      if (s) bundle.saves[p.id] = s;
    });
    return JSON.stringify(bundle, null, 1);
  }

  function importAll(json) {
    var bundle = JSON.parse(json);
    if (!bundle || bundle.app !== "lumen-isles" || !bundle.family) throw new Error("Not a Lumen Isles backup file");
    // an older backup goes through the same migrations as an older device
    family = loadFamilyFromRaw(JSON.stringify(bundle.family), FAMILY_KEY + "_import");
    saveFamilyNow();
    Object.keys(bundle.saves || {}).forEach(function (pid) {
      lsSet(SAVE_PREFIX + pid, JSON.stringify(bundle.saves[pid]));
    });
    Store.family = family;
    return family.profiles.length;
  }

  return {
    family: family, saveFamily: saveFamily,
    addProfile: addProfile, removeProfile: removeProfile, profileById: profile,
    assignmentsFor: assignmentsFor, defaultAssignments: defaultAssignments,
    gradeSetId: gradeSetId, parseGradeSet: parseGradeSet, nextGrade: nextGrade, subjectDef: subjectDef,
    gradePlanFor: gradePlanFor, applyGradePlan: applyGradePlan,
    promote: promote, snoozePromotion: snoozePromotion, promotionSnoozedAt: promotionSnoozedAt,
    nudgeMinutes: nudgeMinutes, setNudgeMinutes: setNudgeMinutes,
    allCurricula: allCurricula, curriculum: curriculum, baseCurriculum: baseCurriculum,
    isOverridden: isOverridden, editableCopy: editableCopy, commitEdit: commitEdit, clearOverride: clearOverride,
    addCustomCurriculum: addCustomCurriculum, removeCustomCurriculum: removeCustomCurriculum,
    load: load, save: save, saveNow: saveNow, reset: reset, peek: peek, peekSave: peekSave,
    isleState: isleState,
    exportAll: exportAll, importAll: importAll,
    data: data, profile: prof
  };
})();


/* ================= STATS ================= */
var Stats = (function () {
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function touchDay() {
    var s = Store.data.stats;
    if (s.daysPlayed.indexOf(todayKey()) < 0) s.daysPlayed.push(todayKey());
  }

  // challenge: { subject, skill } ; result: { correct, mistakes }
  function recordChallenge(challenge, result) {
    var s = Store.data.stats;
    touchDay();
    var key = challenge.subject + "/" + challenge.skill;
    if (!s.challenges[key]) s.challenges[key] = { tries: 0, clean: 0, mistakes: 0 };
    var c = s.challenges[key];
    c.tries += 1;
    c.mistakes += result.mistakes;
    if (result.correct && result.mistakes === 0) c.clean += 1;
    s.lifetime.challenges += 1;
    if (result.correct && result.mistakes === 0) s.lifetime.clean += 1;
    Store.save();
  }

  function recordGather()  { Store.data.stats.lifetime.gathered += 1; touchDay(); }
  function recordBuild()   { Store.data.stats.lifetime.built += 1; }
  function recordQuest()   { Store.data.stats.lifetime.quests += 1; Store.save(); }
  function recordSparks(n) { Store.data.stats.lifetime.sparks += n; }
  function recordHarvest() { Store.data.stats.lifetime.harvested += 1; }

  var lastTick = Date.now();
  function tickPlaytime() {
    var now = Date.now();
    if (now - lastTick < 5 * 60 * 1000) Store.data.stats.playMs += (now - lastTick);
    lastTick = now;
  }

  // reset the weekly window after a report; mastery persists (it is
  // long-term memory), only the week counters roll.
  function rollWeek() {
    var s = Store.data.stats;
    s.weekStart = Date.now();
    s.playMs = 0;
    s.daysPlayed = [];
    s.challenges = {};
    Store.save();
  }

  return {
    recordChallenge: recordChallenge, recordGather: recordGather, recordBuild: recordBuild,
    recordQuest: recordQuest, recordSparks: recordSparks, recordHarvest: recordHarvest,
    tickPlaytime: tickPlaytime, rollWeek: rollWeek
  };
})();
