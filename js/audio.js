"use strict";
/* ============================================================
   AUDIO — text-to-speech (the "teacher voice") and small
   oscillator sound effects. No audio files needed.

   iPad Safari (this game's real device) silently drops
   speechSynthesis.speak() when it is not inside the same tap.
   A previous recovery path deferred speak() 60ms after cancel()
   so desktop Safari would hear it — and that is exactly when
   iPad goes mute, which is why the 🔊 button "sometimes" worked
   (engine idle → speak in the tap) and sometimes didn't (card
   already talking → cancel + delayed speak, dropped).

   Rules:
   - iPad: speak() always stays in the tap. After cancel(), a
     silent dummy utterance takes the "eaten" slot so the real
     word survives the same tick.
   - Chrome: cancel()+speak() in one tick is often silent, so a
     watchdog may retry from a timer (Chrome allows that).
   - Never cancel a slow-starting iPad voice from a background
     timer — onstart can take well over 600ms there.
   Every 🔊 button routes through GameAudio.say().
   ============================================================ */
var GameAudio = (function () {
  var ctx = null;
  var lastSaid = "";
  var listenHandle = null;
  var speechUnlocked = false;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // iPhone / iPad / iPadOS-desktop-UA (Macintosh + touch).
  function isIOSTouch() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPod|iPad/i.test(ua)) return true;
    if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  // iPad Safari reports as Macintosh + touch.
  function isSafariLike() {
    var ua = navigator.userAgent || "";
    if (isIOSTouch()) return true;
    return /Safari/i.test(ua) && !/Chrome|CriOS|Chromium|Android/i.test(ua);
  }

  function makeSilentUtterance() {
    var u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    u.rate = 10;
    u.lang = "en-US";
    return u;
  }

  // iOS only allows later programmatic speak() after one utterance has
  // been requested inside a user gesture (even a silent one).
  function primeUnlock() {
    if (!window.speechSynthesis || speechUnlocked) return;
    try {
      speechSynthesis.speak(makeSilentUtterance());
      speechUnlocked = true;
    } catch (e) {}
  }

  function warm() {
    ac();
    if (!window.speechSynthesis) return;
    try { speechSynthesis.resume(); } catch (e) {}
  }

  // Call from a real tap (joystick, 🔊, profile). A dummy utterance
  // inside the gesture is what lets later speak() calls work on iPad.
  function unlock() {
    ac();
    warm();
    primeUnlock();
  }

  // After the app is backgrounded iOS forgets the unlock. Next tap
  // must prime again. Safe to call from visibilitychange.
  function invalidateUnlock() {
    speechUnlocked = false;
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

  /* The speech engine on iPad can wedge: after the app is backgrounded, a
     word is interrupted, or the child taps twice quickly, speechSynthesis
     reports speaking:true forever and every later request queues behind it
     in silence — so the 🔊 buttons appear to stop working for the rest of
     the session. We track our own state and unwedge it on the next tap. */
  var pendingAt = 0;        // when we last asked for speech
  var pendingStarted = false;
  var lastAskText = "";

  function kick(utter, prime) {
    try { speechSynthesis.resume(); } catch (e) {}
    // After cancel(), WebKit often eats the next speak() in the same
    // tick. A silent dummy takes that bullet so the real word plays.
    // Must stay synchronous — a timer is not a user gesture on iPad.
    if (prime) {
      try { speechSynthesis.speak(makeSilentUtterance()); } catch (e) {}
    }
    try { speechSynthesis.speak(utter); } catch (e) {}
  }

  function engineWedged() {
    if (!window.speechSynthesis) return false;
    if (!pendingAt) return false;
    var waited = Date.now() - pendingAt;
    // iPad voices are slow to report onstart; 600ms was cancelling
    // real speech that was about to begin.
    if (!pendingStarted && waited > 2000) return true;
    if (speechSynthesis.speaking && waited > 15000) return true;
    return false;
  }

  function clearQueue() {
    try { speechSynthesis.cancel(); } catch (e) {}
    pendingAt = 0;
    pendingStarted = false;
  }

  // Chrome goes mute if speechSynthesis sits idle; a pause/resume keeps
  // the engine awake. Skip on Safari — pause() there can drop the next
  // real utterance. On iPad, never cancel a voice that is merely slow.
  if (window.speechSynthesis) {
    setInterval(function () {
      if (isIOSTouch()) {
        if (pendingAt && Date.now() - pendingAt > 15000) clearQueue();
        return;
      }
      if (engineWedged()) clearQueue();
      if (isSafariLike()) return;
      if (speechSynthesis.speaking || speechSynthesis.pending) return;
      try { speechSynthesis.pause(); speechSynthesis.resume(); } catch (e) {}
    }, 4000);
  }

  // Each say() owns a turn. A newer request supersedes an older one, so a
  // stale watchdog can never talk over the word the child just asked for.
  var seq = 0;

  function say(text, rate, opts) {
    opts = opts || {};
    warm();
    if (text == null || text === "") return;
    lastSaid = String(text);
    if (!window.speechSynthesis) return;
    pickVoice();

    // click fires after pointerdown on the same tap. If pointerdown
    // already got this phrase talking, don't cut it off and restart.
    // If pointerdown's speak was dropped (iOS did not treat it as a
    // gesture), pendingStarted is still false and we retry here.
    if (opts.fallback) {
      if (pendingStarted && lastAskText === lastSaid) return;
      var talking = false;
      try { talking = speechSynthesis.speaking; } catch (e) {}
      if (talking && lastAskText === lastSaid) return;
    }

    var myTurn = ++seq;
    var started = false, finished = false, retried = false;

    function make() {
      var u = makeUtterance(text, rate);
      u.onstart = function () {
        started = true;
        if (myTurn === seq) pendingStarted = true;
      };
      u.onend = u.onerror = function () {
        finished = true;
        if (myTurn === seq) { pendingAt = 0; pendingStarted = false; }
      };
      return u;
    }

    /* Watchdog for Chrome / desktop. Never used on iPad: speak() from a
       timer is dropped there, and cancel() would kill the original word. */
    function watchdog(stage) {
      if (isIOSTouch()) return;
      if (started || finished || retried) return;
      if (myTurn !== seq || !window.speechSynthesis) return;
      var busyNow = false;
      try { busyNow = speechSynthesis.speaking; } catch (e) {}
      if (busyNow && stage === 1) { setTimeout(function () { watchdog(2); }, 700); return; }
      retried = true;
      clearQueue();
      pendingAt = Date.now();
      pendingStarted = false;
      lastAskText = lastSaid;
      kick(make(), false);
    }

    function fire(prime) {
      if (myTurn !== seq) return;
      pendingAt = Date.now();
      pendingStarted = false;
      lastAskText = lastSaid;
      kick(make(), prime);
      if (!isIOSTouch()) setTimeout(function () { watchdog(1); }, 380);
    }

    var busy = false;
    try { busy = speechSynthesis.speaking || speechSynthesis.pending; } catch (e) {}
    if (!busy && engineWedged()) busy = true;

    if (busy) {
      // Something is already talking (usually the card reading itself out
      // when it opened). Cut it off so the child's tap is answered NOW
      // rather than queueing behind it — a two-second wait reads to a kid
      // as "the button is broken".
      clearQueue();
      if (isIOSTouch()) {
        fire(true);
        return;
      }
      // Desktop Safari drops an utterance spoken in the same tick as
      // cancel(); one tick later is fine. iPad cannot use this path.
      if (isSafariLike()) { setTimeout(function () { fire(false); }, 60); return; }
    }

    fire(false);
  }

  // called when a challenge card closes so a stale word can't block the next one
  function stop() {
    if (!window.speechSynthesis) return;
    seq++;                     // abandon any watchdog still waiting
    clearQueue();
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
    say: say, sayLetter: sayLetter, stop: stop, sfx: sfx, unlock: unlock, warm: warm,
    invalidateUnlock: invalidateUnlock,
    canListen: canListen, listenFor: listenFor, stopListen: stopListen,
    matchesWord: matchesWord,
    get lastSaid() { return lastSaid; }
  };
})();
