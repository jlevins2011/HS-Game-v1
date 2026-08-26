"use strict";
/* ============================================================
   BUILT-IN CURRICULUM — MATH FACTS
   Problems are generated from the tier's `gen` recipes, so
   there is endless variety. The adaptive engine still tracks
   each fact (e.g. "7×8") individually, so missed facts come
   back around more often.
   ============================================================ */
window.BUILTIN_CURRICULA = window.BUILTIN_CURRICULA || [];

BUILTIN_CURRICULA.push({
  id: "math1", name: "Math · Facts & Fluency", subject: "math", grade: "1-5",
  icon: "🔢",
  desc: "Addition and subtraction through multiplication and division facts, generated endlessly and tracked fact-by-fact.",
  tiers: [
    {
      name: "Counting Camp",
      focus: "addition and subtraction within 10",
      gen: [
        { op: "+", aMin: 1, aMax: 9, bMin: 1, bMax: 9, sumMax: 10 },
        { op: "-", aMin: 2, aMax: 10, bMin: 1, bMax: 9 }
      ]
    },
    {
      name: "Number Trail",
      focus: "addition and subtraction within 20",
      gen: [
        { op: "+", aMin: 3, aMax: 17, bMin: 3, bMax: 17, sumMax: 20 },
        { op: "-", aMin: 8, aMax: 20, bMin: 2, bMax: 12 }
      ]
    },
    {
      name: "Times Grove",
      focus: "multiplication facts through 9 × 9",
      gen: [
        { op: "×", aMin: 2, aMax: 9, bMin: 2, bMax: 9 },
        { op: "+", aMin: 12, aMax: 60, bMin: 12, bMax: 39 }
      ]
    },
    {
      name: "Division Falls",
      focus: "division facts and mixed practice",
      gen: [
        { op: "÷", aMin: 2, aMax: 9, bMin: 2, bMax: 9 },   // built as (a×b) ÷ b = a
        { op: "×", aMin: 3, aMax: 12, bMin: 3, bMax: 12 },
        { op: "-", aMin: 25, aMax: 99, bMin: 8, bMax: 60 }
      ]
    }
  ]
});
