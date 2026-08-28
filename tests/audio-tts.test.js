"use strict";
/* Headless checks for the iPad speaker-button TTS rules in js/audio.js.
   speechSynthesis is mocked so we can assert WHEN speak() is called
   (same tap vs deferred) without a real voice engine. */

var fs = require("fs");
var vm = require("vm");
var path = require("path");
var assert = require("assert");

var AUDIO_JS = fs.readFileSync(path.join(__dirname, "..", "js", "audio.js"), "utf8");

function loadAudio(opts) {
  opts = opts || {};
  var log = [];
  var synth = {
    speaking: !!opts.speaking,
    pending: !!opts.pending,
    getVoices: function () {
      return [{ name: "Samantha", lang: "en-US" }];
    },
    speak: function (u) {
      log.push({ op: "speak", text: u && u.text, volume: u && u.volume, t: Date.now() });
      this.speaking = true;
      this.pending = false;
    },
    cancel: function () {
      log.push({ op: "cancel", t: Date.now() });
      this.speaking = false;
      this.pending = false;
    },
    pause: function () { log.push({ op: "pause" }); },
    resume: function () { log.push({ op: "resume" }); }
  };
  var sandbox = {
    window: {},
    navigator: {
      userAgent: opts.ua || "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: opts.platform || "iPad",
      maxTouchPoints: opts.maxTouchPoints != null ? opts.maxTouchPoints : 5
    },
    speechSynthesis: synth,
    SpeechSynthesisUtterance: function (text) {
      this.text = text;
      this.volume = 1;
      this.rate = 1;
      this.pitch = 1;
      this.lang = "";
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    },
    AudioContext: function () {
      this.state = "running";
      this.resume = function () {};
      this.currentTime = 0;
      this.createOscillator = function () {
        return { type: "sine", frequency: { value: 0 }, connect: function () {}, start: function () {}, stop: function () {} };
      };
      this.createGain = function () {
        return { gain: { setValueAtTime: function () {}, exponentialRampToValueAtTime: function () {} }, connect: function () {} };
      };
      this.destination = {};
    },
    setInterval: setInterval,
    setTimeout: setTimeout,
    Date: Date,
    console: console
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window.AudioContext = sandbox.AudioContext;
  sandbox.window.speechSynthesis = synth;
  sandbox.window.SpeechSynthesisUtterance = sandbox.SpeechSynthesisUtterance;
  vm.createContext(sandbox);
  vm.runInContext(AUDIO_JS, sandbox);
  return { GameAudio: sandbox.GameAudio, synth: synth, log: log, sandbox: sandbox };
}

function spokenTexts(log) {
  return log.filter(function (e) { return e.op === "speak"; }).map(function (e) { return e.text; });
}

function delayedSpeaks(log, startedAt) {
  return log.filter(function (e) { return e.op === "speak" && e.t > startedAt + 20; });
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

test("iPad idle: speak() happens in the same tick as say()", function () {
  var env = loadAudio();
  var t0 = Date.now();
  env.GameAudio.say("apple");
  var sync = env.log.filter(function (e) { return e.op === "speak" && e.text === "apple"; });
  assert.equal(sync.length, 1, "expected one apple utterance, got " + JSON.stringify(env.log));
  assert.ok(sync[0].t - t0 < 20, "apple was deferred");
  assert.equal(env.GameAudio.lastSaid, "apple");
});

test("iPad busy: cancel + dummy + word all happen synchronously (no 60ms timer)", function () {
  var env = loadAudio({ speaking: true });
  var t0 = Date.now();
  env.GameAudio.say("banana");
  var ops = env.log.map(function (e) { return e.op + ":" + (e.text == null ? "" : JSON.stringify(e.text)); });
  assert.ok(ops.indexOf("cancel:") >= 0, "expected cancel, got " + ops);
  var speaks = env.log.filter(function (e) { return e.op === "speak"; });
  assert.ok(speaks.length >= 2, "expected dummy + word, got " + JSON.stringify(speaks));
  assert.equal(speaks[0].text, " ");
  assert.equal(speaks[0].volume, 0);
  assert.equal(speaks[speaks.length - 1].text, "banana");
  speaks.forEach(function (s) {
    assert.ok(s.t - t0 < 20, "a speak() was deferred: " + JSON.stringify(s));
  });
});

test("iPad busy: no extra speak() arrives from a watchdog timer", function (done) {
  var env = loadAudio({ speaking: true });
  env.GameAudio.say("cherry");
  var afterSay = env.log.filter(function (e) { return e.op === "speak"; }).length;
  setTimeout(function () {
    var later = env.log.filter(function (e) { return e.op === "speak"; }).length;
    assert.equal(later, afterSay, "watchdog spoke extra times on iPad");
    done();
  }, 500);
});

test("iPadOS desktop UA (Macintosh + touch) uses the sync cancel path", function () {
  var env = loadAudio({
    speaking: true,
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    platform: "MacIntel",
    maxTouchPoints: 5
  });
  var t0 = Date.now();
  env.GameAudio.say("date");
  var word = env.log.filter(function (e) { return e.op === "speak" && e.text === "date"; });
  assert.equal(word.length, 1);
  assert.ok(word[0].t - t0 < 20, "iPadOS desktop-UA deferred speak()");
});

test("Chrome busy: may defer, but still speaks the word", function (done) {
  var env = loadAudio({
    speaking: true,
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    platform: "Win32",
    maxTouchPoints: 0
  });
  env.GameAudio.say("elderberry");
  setTimeout(function () {
    var texts = spokenTexts(env.log);
    assert.ok(texts.indexOf("elderberry") >= 0, "Chrome never spoke elderberry: " + JSON.stringify(texts));
    done();
  }, 120);
});

test("fallback click is skipped when the word already started", function () {
  var env = loadAudio();
  env.GameAudio.say("fig");
  var start = env.log.filter(function (e) { return e.op === "speak" && e.text === "fig"; })[0];
  assert.ok(start);
  // simulate onstart
  env.synth.speaking = true;
  // pendingStarted is set via utterance.onstart — fire it if we can
  // The utterance is not stored. Trigger a fallback anyway: without
  // onstart, fallback may retry. Mark speaking + lastAsk via a real onstart
  // by monkey-calling say then invoking the last utterance's onstart.
  env.GameAudio.stop();
  env.synth.speaking = false;
  env.GameAudio.say("fig");
  var figUtter = null;
  env.synth.speak = (function (orig) {
    return function (u) {
      figUtter = u;
      return orig.call(env.synth, u);
    };
  })(env.synth.speak.bind(env.synth));
  env.GameAudio.say("grape");
  if (figUtter && figUtter.onstart) figUtter.onstart();
  var before = env.log.filter(function (e) { return e.op === "speak" && e.text === "grape"; }).length;
  env.GameAudio.say("grape", 0.85, { fallback: true });
  var after = env.log.filter(function (e) { return e.op === "speak" && e.text === "grape"; }).length;
  assert.equal(after, before, "fallback restarted a word that had started");
});

test("fallback click retries when pointerdown never started", function () {
  var env = loadAudio();
  env.GameAudio.say("honeydew");
  // iOS dropped it: not speaking, onstart never fired
  env.synth.speaking = false;
  var before = env.log.filter(function (e) { return e.op === "speak" && e.text === "honeydew"; }).length;
  env.GameAudio.say("honeydew", 0.85, { fallback: true });
  var after = env.log.filter(function (e) { return e.op === "speak" && e.text === "honeydew"; }).length;
  assert.ok(after > before, "fallback did not retry a dropped speak");
});

test("unlock primes once with a silent utterance", function () {
  var env = loadAudio();
  env.GameAudio.unlock();
  var silent = env.log.filter(function (e) { return e.op === "speak" && e.text === " " && e.volume === 0; });
  assert.equal(silent.length, 1);
  env.GameAudio.unlock();
  silent = env.log.filter(function (e) { return e.op === "speak" && e.text === " " && e.volume === 0; });
  assert.equal(silent.length, 1, "unlock primed more than once");
});

test("invalidateUnlock allows a later tap to prime again", function () {
  var env = loadAudio();
  env.GameAudio.unlock();
  env.GameAudio.invalidateUnlock();
  env.GameAudio.unlock();
  var silent = env.log.filter(function (e) { return e.op === "speak" && e.text === " " && e.volume === 0; });
  assert.equal(silent.length, 2);
});

test("sayLetter maps a to ay", function () {
  var env = loadAudio();
  env.GameAudio.sayLetter("a");
  assert.ok(spokenTexts(env.log).indexOf("ay") >= 0);
});

function run(i, failed) {
  if (i >= tests.length) {
    if (failed) {
      console.error("\n" + failed + " failed");
      process.exit(1);
    }
    console.log("\n" + tests.length + " passed");
    process.exit(0);
    return;
  }
  var t = tests[i];
  var finished = false;
  function next(err) {
    if (finished) return;
    finished = true;
    if (err) {
      console.error("FAIL  " + t.name);
      console.error("      " + (err.stack || err));
      failed = (failed || 0) + 1;
    } else {
      console.log("ok    " + t.name);
    }
    run(i + 1, failed);
  }
  try {
    if (t.fn.length) t.fn(function (err) { next(err); });
    else { t.fn(); next(); }
  } catch (e) { next(e); }
}

run(0, 0);
