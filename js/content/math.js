"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — MATH FACTS & FLUENCY, K–5
   One set per grade. Problems are generated from each tier's
   `gen` recipes, so there is endless variety; the adaptive
   engine still tracks each fact (e.g. "7×8") individually, so
   missed facts come back around more often.

   Honest labeling: the activity is multiple-choice fact
   fluency. These sets are a supplement to a math curriculum,
   not a replacement — fractions, decimals and word problems
   would need different activity types.

   Recipe fields: op (+ − × ÷), aMin/aMax, bMin/bMax, sumMax.
   ÷ is built as (a×b) ÷ b = a so every answer is whole.
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "math-k", name: "Math Facts & Fluency · Kindergarten", subject: "math", grade: "K",
  icon: "🔢",
  desc: "Adding and taking away with tiny numbers — first within 5, then within 10.",
  tiers: [
    { name: "Counting Camp", focus: "adding within 5",
      gen: [ { op: "+", aMin: 1, aMax: 4, bMin: 1, bMax: 4, sumMax: 5 } ] },
    { name: "Take-Away Trail", focus: "adding and taking away within 5",
      gen: [ { op: "+", aMin: 1, aMax: 4, bMin: 1, bMax: 4, sumMax: 5 },
             { op: "-", aMin: 2, aMax: 5, bMin: 1, bMax: 4 } ] },
    { name: "Ten Tent", focus: "adding and taking away within 10",
      gen: [ { op: "+", aMin: 1, aMax: 9, bMin: 1, bMax: 9, sumMax: 10 },
             { op: "-", aMin: 2, aMax: 10, bMin: 1, bMax: 9 } ] }
  ]
});

BUILTIN_CURRICULA.push({
  id: "math-1", name: "Math Facts & Fluency · Grade 1", subject: "math", grade: "1",
  icon: "🔢",
  desc: "Addition and subtraction facts within 10, then within 20.",
  tiers: [
    { name: "Sunny Sums", focus: "addition within 10",
      gen: [ { op: "+", aMin: 1, aMax: 9, bMin: 1, bMax: 9, sumMax: 10 } ] },
    { name: "Ten Frame Trail", focus: "addition and subtraction within 10",
      gen: [ { op: "+", aMin: 1, aMax: 9, bMin: 1, bMax: 9, sumMax: 10 },
             { op: "-", aMin: 2, aMax: 10, bMin: 1, bMax: 9 } ] },
    { name: "Number Trail", focus: "addition within 20",
      gen: [ { op: "+", aMin: 3, aMax: 17, bMin: 3, bMax: 17, sumMax: 20 },
             { op: "-", aMin: 5, aMax: 12, bMin: 1, bMax: 6 } ] },
    { name: "Twenty Peak", focus: "addition and subtraction within 20",
      gen: [ { op: "+", aMin: 5, aMax: 17, bMin: 3, bMax: 15, sumMax: 20 },
             { op: "-", aMin: 8, aMax: 20, bMin: 2, bMax: 12 } ] }
  ]
});

BUILTIN_CURRICULA.push({
  id: "math-2", name: "Math Facts & Fluency · Grade 2", subject: "math", grade: "2",
  icon: "🔢",
  desc: "Fast facts within 20, two-digit adding and subtracting, and a first look at times tables (2s, 5s, 10s).",
  tiers: [
    { name: "Fact Falls", focus: "quick addition and subtraction facts within 20",
      gen: [ { op: "+", aMin: 4, aMax: 16, bMin: 4, bMax: 16, sumMax: 20 },
             { op: "-", aMin: 9, aMax: 20, bMin: 3, bMax: 12 } ] },
    { name: "Tens Meadow", focus: "adding tens and two-digit numbers without regrouping",
      gen: [ { op: "+", aMin: 10, aMax: 60, bMin: 10, bMax: 30, sumMax: 99 },
             { op: "-", aMin: 30, aMax: 99, bMin: 10, bMax: 25 } ] },
    { name: "Hundred Hill", focus: "adding and subtracting within 100",
      gen: [ { op: "+", aMin: 12, aMax: 78, bMin: 5, bMax: 49, sumMax: 100 },
             { op: "-", aMin: 25, aMax: 100, bMin: 6, bMax: 48 } ] },
    { name: "Skip-Count Grove", focus: "first times tables — twos, fives and tens",
      gen: [ { op: "×", aMin: 1, aMax: 10, bMin: 2, bMax: 2 },
             { op: "×", aMin: 1, aMax: 10, bMin: 5, bMax: 5 },
             { op: "×", aMin: 1, aMax: 10, bMin: 10, bMax: 10 },
             { op: "+", aMin: 20, aMax: 70, bMin: 10, bMax: 29, sumMax: 100 } ] }
  ]
});

BUILTIN_CURRICULA.push({
  id: "math-3", name: "Math Facts & Fluency · Grade 3", subject: "math", grade: "3",
  icon: "🔢",
  desc: "Times tables through 10 × 10, matching division facts, and adding and subtracting within 1,000.",
  tiers: [
    { name: "Times Grove", focus: "multiplication facts through 5 × 10",
      gen: [ { op: "×", aMin: 2, aMax: 5, bMin: 2, bMax: 10 },
             { op: "+", aMin: 30, aMax: 90, bMin: 10, bMax: 60, sumMax: 150 } ] },
    { name: "Big Times Grove", focus: "multiplication facts through 10 × 10",
      gen: [ { op: "×", aMin: 2, aMax: 10, bMin: 2, bMax: 10 } ] },
    { name: "Division Falls", focus: "division facts that undo the times tables",
      gen: [ { op: "÷", aMin: 2, aMax: 10, bMin: 2, bMax: 10 },
             { op: "×", aMin: 3, aMax: 10, bMin: 3, bMax: 10 } ] },
    { name: "Thousand Ridge", focus: "adding and subtracting within 1,000, with mixed facts",
      gen: [ { op: "+", aMin: 120, aMax: 640, bMin: 45, bMax: 350, sumMax: 999 },
             { op: "-", aMin: 300, aMax: 999, bMin: 45, bMax: 280 },
             { op: "×", aMin: 4, aMax: 10, bMin: 4, bMax: 10 },
             { op: "÷", aMin: 3, aMax: 10, bMin: 3, bMax: 10 } ] }
  ]
});

BUILTIN_CURRICULA.push({
  id: "math-4", name: "Math Facts & Fluency · Grade 4", subject: "math", grade: "4",
  icon: "🔢",
  desc: "Times tables through 12 × 12, division through 144, and multiplying two-digit numbers by one digit.",
  tiers: [
    { name: "Twelve Times Trail", focus: "multiplication facts through 12 × 12",
      gen: [ { op: "×", aMin: 2, aMax: 12, bMin: 2, bMax: 12 } ] },
    { name: "Division Canyon", focus: "division facts through 144 ÷ 12",
      gen: [ { op: "÷", aMin: 2, aMax: 12, bMin: 2, bMax: 12 },
             { op: "×", aMin: 6, aMax: 12, bMin: 6, bMax: 12 } ] },
    { name: "Two-Digit Timber", focus: "two-digit × one-digit multiplication",
      gen: [ { op: "×", aMin: 11, aMax: 49, bMin: 2, bMax: 9 },
             { op: "÷", aMin: 3, aMax: 12, bMin: 3, bMax: 12 } ] },
    { name: "Ten-Thousand Peak", focus: "large addition and subtraction with mixed facts",
      gen: [ { op: "+", aMin: 1200, aMax: 6400, bMin: 350, bMax: 3500, sumMax: 9999 },
             { op: "-", aMin: 2500, aMax: 9999, bMin: 400, bMax: 2400 },
             { op: "×", aMin: 12, aMax: 99, bMin: 3, bMax: 9 } ] }
  ]
});

BUILTIN_CURRICULA.push({
  id: "math-5", name: "Math Facts & Fluency · Grade 5", subject: "math", grade: "5",
  icon: "🔢",
  desc: "Mixed fluency: fast facts under pressure, two-digit × two-digit, and long division facts.",
  tiers: [
    { name: "Fluency Falls", focus: "all four operations, quick facts",
      gen: [ { op: "×", aMin: 3, aMax: 12, bMin: 3, bMax: 12 },
             { op: "÷", aMin: 3, aMax: 12, bMin: 3, bMax: 12 },
             { op: "+", aMin: 45, aMax: 480, bMin: 25, bMax: 390, sumMax: 999 },
             { op: "-", aMin: 200, aMax: 999, bMin: 35, bMax: 380 } ] },
    { name: "Double-Digit Delta", focus: "two-digit × two-digit multiplication",
      gen: [ { op: "×", aMin: 11, aMax: 25, bMin: 11, bMax: 19 },
             { op: "×", aMin: 12, aMax: 99, bMin: 4, bMax: 9 } ] },
    { name: "Division Delta", focus: "dividing larger numbers by one and two digits",
      gen: [ { op: "÷", aMin: 12, aMax: 60, bMin: 2, bMax: 9 },
             { op: "÷", aMin: 4, aMax: 25, bMin: 11, bMax: 15 } ] },
    { name: "Summit Mix", focus: "everything at once — the full fluency workout",
      gen: [ { op: "×", aMin: 6, aMax: 12, bMin: 6, bMax: 12 },
             { op: "×", aMin: 11, aMax: 30, bMin: 11, bMax: 20 },
             { op: "÷", aMin: 6, aMax: 40, bMin: 3, bMax: 12 },
             { op: "+", aMin: 1500, aMax: 8400, bMin: 650, bMax: 4500, sumMax: 9999 },
             { op: "-", aMin: 3000, aMax: 9999, bMin: 750, bMax: 2900 } ] }
  ]
});
