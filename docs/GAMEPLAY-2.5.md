# Homebuilding release · 2.5.0

Based on the **deployed** `claude/lumen-redesign-v2` branch (2.4.0), not the older repository default. Keeps the balloon, Cloudcap, lightsprings, grade-level lessons, speech settings, and parent controls.

## Construction

A cell is 2m; a floor is 0.22m thick; a wall is 2.4m tall. New stairs rise 1.31m per flight: two flights reach the next floor's walking surface. Existing stairs retain their original 1.36m rise. Aim at the top of a stair to extend it; aim there with Floor selected for a landing. Adjacent foundations keep their neighbour's elevation.

Roof modules share 2m edges and a 1.3m rise. The original Roof is a narrow gable; Roof Slope builds wider spans, with Corner and Valley for hips and inward joins. Opposite slopes meet without an extra cap. Rotate to face the rise; + Roof and − Roof shift by one slope rise for larger roof pitches. Roofs find wall headers and adjacent roof bases, rather than accumulating heights from roof surfaces. Roof triangle winding, actual sloped walking heights, and undersides are consistent. The preview only rebuilds when the pose or validity changes, and disposes its private material.

Brick walls, stone foundations, beds, workshop tables, shell paths, flower boxes, and crystal/moonpearl lamps connect exploration to home furnishing. The last bed or tent is the camp. Tables open the workshop. Pieces remember the materials actually paid and return those when removed. Existing saved pieces fall back to their original catalog costs.

## Resources and progression

`Economy` owns tool recipes, kiln recipes, seed recipes, trade values, supplies, and validation of exchanges. No learning or DOM dependency. Items describe their actual catalog uses; the satchel displays old keepsakes too. Every current gather/creature drop can be used or traded. Sparks buy limited material packs and seeds. Supply prices exceed resale value to avoid a buy/sell loop. Building itself grants no repeatable currency; the four home/garden projects are once-per-explorer claims.

Garden crops can be selected when both seed types are available. Harvested fruit can become seeds, providing a repeatable garden cycle. Existing lesson-gated tool crafting is preserved.

## Saves

All changes are additive to the existing v3 save, using the same origin and storage keys. `pieces[].v:1` selects the new stair dimensions; `pieces[].paid` records actual materials. Old records remain readable without rewriting a sibling's save. `player.projects` tracks claimed projects; `player.sparkHistory` contains the last 100 local economy entries. These fields travel with existing family backup/restore. This local history is **not** a trusted cross-game ledger.

## Verification

`tests/test-homebuilding.js` exercises actual Three.js roof meshes, joins and rotation, pose resolution, stair elevation, collision queries, door blocking, refunds, atomic trades, project claims, provider substitution, touch-sized UI, backup, and reload. The existing regression suite covers migration, parent setup/editor, learning pacing, speech, Cloudcap, and balloon. `tests/browser.js` supports `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, installed Chrome on macOS, or Playwright's browser elsewhere.
