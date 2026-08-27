"use strict";
/* ============================================================
   STORE — persistence (localStorage) with a clean seam for
   future cloud sync: everything lives under a small set of
   keys, and exportAll()/importAll() move the whole family's
   data as one JSON bundle (used today for file backups).

   Keys:
   - lumen_family_v1          family: profiles, custom curricula,
                              assignments, parent settings
   - lumen_save_v1_<profile>  one save per child
   ============================================================ */
var Store = (function () {
  var FAMILY_KEY = "lumen_family_v1";
  var SAVE_PREFIX = "lumen_save_v1_";

  /* ---------------- family data ---------------- */
  function freshFamily() {
    return {
      version: 1,
      profiles: [],            // { id, name, emoji, color, band, createdAt }
      custom: [],              // parent-created curricula (same shape as built-ins, single tier)
      assignments: {},         // profileId -> [ { cid, weight } ]
      settings: {
        pin: null,             // optional 4-digit parent PIN
        emails: [],            // weekly report recipients
        reportDays: CONFIG.REPORT.everyDays,
        // Minimum minutes between learning challenges. Parent-only: it lives
        // in family settings (behind the long-press + PIN), never in a
        // child's save, so a child cannot change it or reset it away.
        paceMinutes: CONFIG.LEARN.defaultPaceMinutes,   // family default
        paceByChild: {}                                 // profileId -> minutes (overrides the default)
      }
    };
  }

  var family = freshFamily();
  try {
    var rawF = localStorage.getItem(FAMILY_KEY);
    if (rawF) {
      var pf = JSON.parse(rawF);
      if (pf && pf.version === 1) {
        family = Object.assign(freshFamily(), pf);
        family.settings = Object.assign(freshFamily().settings, pf.settings || {});
      }
    }
  } catch (e) { /* corrupted -> fresh */ }

  var famTimer = null;
  function saveFamily() {
    if (famTimer) return;
    famTimer = setTimeout(function () {
      famTimer = null;
      try { localStorage.setItem(FAMILY_KEY, JSON.stringify(family)); } catch (e) {}
    }, 200);
  }

  function uid() { return "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }

  // band: "younger" (~grades 1-3) or "older" (~grades 4-6) picks the
  // starter assignments; parents can change everything afterwards.
  function defaultAssignments(band) {
    if (band === "older") {
      return [
        { cid: "reading5", weight: 3 },
        { cid: "spelling5", weight: 3 },
        { cid: "math1", weight: 2 },
        { cid: "bible1", weight: 2 }
      ];
    }
    return [
      { cid: "reading2", weight: 3 },
      { cid: "spelling2", weight: 2 },
      { cid: "math1", weight: 2 },
      { cid: "bible1", weight: 2 }
    ];
  }

  function addProfile(opts) {
    var p = {
      id: uid(),
      name: (opts.name || "Explorer").slice(0, 16),
      emoji: opts.emoji || "🦊",
      color: opts.color || "#5fae6f",
      band: opts.band || "younger",
      createdAt: Date.now()
    };
    family.profiles.push(p);
    family.assignments[p.id] = defaultAssignments(p.band);
    saveFamily();
    return p;
  }

  function removeProfile(pid) {
    family.profiles = family.profiles.filter(function (p) { return p.id !== pid; });
    delete family.assignments[pid];
    saveFamily();
    try { localStorage.removeItem(SAVE_PREFIX + pid); } catch (e) {}
  }

  /* -------- question pacing (parent-controlled) -------- */
  var PACE_MAX = 120;
  function paceMinutes(pid) {
    var s = family.settings || {};
    var per = s.paceByChild || {};
    var v = (pid && per[pid] !== undefined && per[pid] !== null) ? per[pid] : s.paceMinutes;
    v = Number(v);
    if (!isFinite(v) || v < 0) v = 0;
    return Math.min(PACE_MAX, Math.round(v));
  }
  // pid null -> set the family default; "all" clears every override too
  function setPaceMinutes(pid, minutes, applyToAll) {
    var v = Number(minutes);
    if (!isFinite(v) || v < 0) v = 0;
    v = Math.min(PACE_MAX, Math.round(v));
    if (!family.settings.paceByChild) family.settings.paceByChild = {};
    if (applyToAll || !pid) {
      family.settings.paceMinutes = v;
      if (applyToAll) family.settings.paceByChild = {};
    } else {
      family.settings.paceByChild[pid] = v;
    }
    saveFamily();
    return v;
  }

  function assignmentsFor(pid) {
    if (!family.assignments[pid]) family.assignments[pid] = [];
    return family.assignments[pid];
  }

  /* -------- curricula lookup: built-in + custom -------- */
  function allCurricula() {
    return (window.BUILTIN_CURRICULA || []).concat(family.custom);
  }
  function curriculum(cid) {
    var all = allCurricula();
    for (var i = 0; i < all.length; i++) if (all[i].id === cid) return all[i];
    return null;
  }
  function addCustomCurriculum(cur) {
    cur.id = "c" + Date.now().toString(36);
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
      version: 2,
      player: {
        xp: 0, level: 1, sparks: 0,
        toolTier: 0,               // mallet: 0 timber, 1 stone, 2 skysteel, 3 starstone
        isle: "meadowmere",
        inventory: {},             // itemName -> count
        tools: {},                 // hatchet/brush/kiln/lanternkit + legendary
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
        lastChallengeAt: 0,        // drives the parent-set minimum gap between questions
        lifetime: { challenges: 0, clean: 0, sparks: 0, gathered: 0, built: 0, quests: 0, harvested: 0 }
      }
    };
  }

  // carry a v1 (voxel-era) save's progress into the new world format
  function migrateV1(old) {
    var d = freshData();
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

  var data = freshData();
  var profile = null;
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
    profile = p;
    activeKey = SAVE_PREFIX + p.id;
    data = freshData();
    try {
      var raw = localStorage.getItem(activeKey);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 2) data = deepMergeDefaults(freshData(), parsed);
        else if (parsed && parsed.version === 1) data = migrateV1(parsed);
      }
    } catch (e) { /* corrupted -> fresh */ }
    Store.data = data;
    Store.profile = profile;
  }

  var saveTimer = null;
  function save() {
    if (saveTimer || !activeKey) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      try { localStorage.setItem(activeKey, JSON.stringify(data)); } catch (e) {}
    }, 250);
  }

  function saveNow() {
    if (!activeKey) return;
    try { localStorage.setItem(activeKey, JSON.stringify(data)); } catch (e) {}
  }

  function reset(pid) {
    var key = SAVE_PREFIX + pid;
    try { localStorage.removeItem(key); } catch (e) {}
    if (activeKey === key) { data = freshData(); Store.data = data; }
  }

  function peek(p) {
    try {
      var raw = localStorage.getItem(SAVE_PREFIX + p.id);
      if (raw) {
        var d = JSON.parse(raw);
        return { level: d.player.level, sparks: d.player.sparks };
      }
    } catch (e) {}
    return null;
  }

  function peekSave(p) {
    try {
      var raw = localStorage.getItem(SAVE_PREFIX + p.id);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
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
    family = Object.assign(freshFamily(), bundle.family);
    try { localStorage.setItem(FAMILY_KEY, JSON.stringify(family)); } catch (e) {}
    Object.keys(bundle.saves || {}).forEach(function (pid) {
      try { localStorage.setItem(SAVE_PREFIX + pid, JSON.stringify(bundle.saves[pid])); } catch (e) {}
    });
    Store.family = family;
    return family.profiles.length;
  }

  return {
    family: family, saveFamily: saveFamily,
    addProfile: addProfile, removeProfile: removeProfile,
    assignmentsFor: assignmentsFor, defaultAssignments: defaultAssignments,
    paceMinutes: paceMinutes, setPaceMinutes: setPaceMinutes,
    allCurricula: allCurricula, curriculum: curriculum,
    addCustomCurriculum: addCustomCurriculum, removeCustomCurriculum: removeCustomCurriculum,
    load: load, save: save, saveNow: saveNow, reset: reset, peek: peek, peekSave: peekSave,
    isleState: isleState,
    exportAll: exportAll, importAll: importAll,
    data: data, profile: profile
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
