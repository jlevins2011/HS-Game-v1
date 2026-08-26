"use strict";
/* ============================================================
   AUDIO — text-to-speech (the "teacher voice") and small
   oscillator sound effects. No audio files needed.

   The TTS handling is battle-tested on iPad Safari (speak()
   must stay inside the tap) and Chrome (cancel()+speak() in
   the same tick is often silent). Every 🔊 button routes
   through GameAudio.say().
   ============================================================ */
var GameAudio = (function () {
  var ctx = null;
  var lastSaid = "";
  var listenHandle = null;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function warm() {
    ac();
    if (!window.speechSynthesis) return;
    try { speechSynthesis.resume(); } catch (e) {}
  }

  /* ---------- speech ---------- */
  var voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    var vs = speechSynthesis.getVoices();
    if (!vs || !vs.length) return;
    var prefs = ["Samantha", "Google US English", "Karen", "Daniel"];
    for (var i = 0; i < prefs.length; i++) {
      for (var j = 0; j < vs.length; j++) {
        if (vs[j].name.indexOf(prefs[i]) >= 0) { voice = vs[j]; return; }
      }
    }
    for (var k = 0; k < vs.length; k++) {
      if (vs[k].lang && vs[k].lang.indexOf("en") === 0) { voice = vs[k]; return; }
    }
    voice = vs[0] || voice;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  function makeUtterance(text, rate) {
    var u = new SpeechSynthesisUtterance(String(text));
    if (voice) u.voice = voice;
    u.lang = (voice && voice.lang) || "en-US";
    u.rate = rate || 0.85;
    u.pitch = 1.05;
    u.volume = 1;
    return u;
  }

  // Chrome goes mute if speechSynthesis sits idle; a pause/resume keeps
  // the engine awake. Skip on Safari — pause() there can drop the next
  // real utterance.
  if (window.speechSynthesis) {
    setInterval(function () {
      if (isSafariLike()) return;
      if (speechSynthesis.speaking || speechSynthesis.pending) return;
      try { speechSynthesis.pause(); speechSynthesis.resume(); } catch (e) {}
    }, 10000);
  }

  // iPad Safari reports as Macintosh + touch.
  function isSafariLike() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPod|iPad/i.test(ua)) return true;
    if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
    return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Android/i.test(ua);
  }

  function say(text, rate) {
    warm();
    if (text == null || text === "") return;
    lastSaid = String(text);
    if (!window.speechSynthesis) return;
    pickVoice();

    var started = false;
    var u = makeUtterance(text, rate);
    u.onstart = function () { started = true; };

    function kick(utter) {
      try { speechSynthesis.resume(); } catch (e) {}
      try { speechSynthesis.speak(utter); } catch (e) {}
    }

    // Safari: cancel() often kills the follow-up speak() even inside the
    // same tap, so just queue. Chrome: cancel()+speak() in one tick is
    // frequently silent, so cancel then retry once a moment later.
    if (isSafariLike()) {
      kick(u);
      return;
    }

    try {
      if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    } catch (e) {}

    kick(u);
    setTimeout(function () {
      if (started || speechSynthesis.speaking) return;
      u = makeUtterance(text, rate);
      u.onstart = function () { started = true; };
      kick(u);
    }, 70);
  }

  function sayLetter(ch) { say(ch === "a" ? "ay" : ch, 0.9); }

  /* ---------- optional: hear the child say a word ---------- */
  function RecCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function canListen() { return !!RecCtor(); }

  function normalizeHeard(s) {
    return String(s || "").toLowerCase().replace(/[^a-z]+/g, " ").trim();
  }

  function matchesWord(heard, expected) {
    var w = normalizeHeard(expected);
    var t = normalizeHeard(heard);
    if (!w || !t) return false;
    if (t === w) return true;
    var parts = t.split(" ").filter(Boolean);
    if (parts.indexOf(w) >= 0) return true;
    if (w.length >= 3 && parts.indexOf(w + "s") >= 0) return true;
    return false;
  }

  function stopListen() {
    if (!listenHandle) return;
    var h = listenHandle;
    listenHandle = null;
    try { if (h.abort) h.abort(); } catch (e) {}
    try { if (h.stop) h.stop(); } catch (e) {}
  }

  // onDone({ matched, heard, error })
  function listenFor(expected, onDone) {
    stopListen();
    var Ctor = RecCtor();
    if (!Ctor) { onDone({ matched: false, heard: "", error: "unavailable" }); return; }
    var rec;
    try { rec = new Ctor(); } catch (e) {
      onDone({ matched: false, heard: "", error: "unavailable" });
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 4;
    rec.continuous = false;
    var finished = false;
    function finish(payload) {
      if (finished) return;
      finished = true;
      if (listenHandle === rec) listenHandle = null;
      try { rec.stop(); } catch (e) {}
      onDone(payload);
    }
    rec.onresult = function (ev) {
      var texts = [];
      try {
        for (var i = 0; i < ev.results.length; i++) {
          for (var j = 0; j < ev.results[i].length; j++) {
            texts.push(ev.results[i][j].transcript);
          }
        }
      } catch (e) {}
      var heard = texts.join(" ");
      finish({ matched: matchesWord(heard, expected), heard: heard });
    };
    rec.onerror = function (ev) {
      finish({ matched: false, heard: "", error: (ev && ev.error) || "error" });
    };
    rec.onend = function () {
      if (!finished) finish({ matched: false, heard: "", error: "ended" });
    };
    listenHandle = rec;
    try { rec.start(); } catch (e) {
      listenHandle = null;
      onDone({ matched: false, heard: "", error: "start-failed" });
    }
  }

  /* ---------- sfx ---------- */
  function tone(freq, dur, type, vol, when) {
    var a = ac(); if (!a) return;
    var t = a.currentTime + (when || 0);
    var o = a.createOscillator();
    var g = a.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur);
  }

  var sfx = {
    gather:  function () { tone(180, 0.08, "square", 0.10); tone(120, 0.10, "square", 0.08, 0.05); },
    place:   function () { tone(260, 0.07, "square", 0.10); tone(330, 0.07, "square", 0.08, 0.05); },
    pop:     function () { tone(520, 0.06, "triangle", 0.12); },
    correct: function () { tone(523, 0.1, "triangle", 0.14); tone(659, 0.1, "triangle", 0.14, 0.09); tone(784, 0.16, "triangle", 0.14, 0.18); },
    wrong:   function () { tone(220, 0.18, "sawtooth", 0.06); },
    levelup: function () { [523, 587, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.14, "triangle", 0.14, i * 0.1); }); },
    spark:   function () { tone(880, 0.08, "triangle", 0.12); tone(1320, 0.12, "triangle", 0.10, 0.06); },
    quest:   function () { tone(392, 0.12, "triangle", 0.12); tone(523, 0.18, "triangle", 0.12, 0.1); },
    kiln:    function () { tone(180, 0.12, "sawtooth", 0.10); tone(240, 0.18, "triangle", 0.12, 0.1); tone(320, 0.16, "triangle", 0.10, 0.22); },
    fox:     function () { tone(420, 0.06, "sawtooth", 0.14); tone(560, 0.08, "sawtooth", 0.11, 0.08); },
    chirp:   function () { tone(620, 0.07, "square", 0.12); tone(840, 0.09, "square", 0.10, 0.06); },
    starfall: function () { [1200, 950, 760, 600].forEach(function (f, i) { tone(f, 0.16, "triangle", 0.10, i * 0.09); }); },
    grow:    function () { tone(330, 0.1, "triangle", 0.1); tone(440, 0.12, "triangle", 0.1, 0.09); },
    step:    function () { tone(90 + Math.random() * 30, 0.04, "square", 0.03); }
  };

  return {
    say: say, sayLetter: sayLetter, sfx: sfx, unlock: ac, warm: warm,
    canListen: canListen, listenFor: listenFor, stopListen: stopListen,
    matchesWord: matchesWord,
    get lastSaid() { return lastSaid; }
  };
})();
