# Shared family website: integration boundary

The parent website will own families, students, grades, lesson libraries, assignments, and reward policies once it exists. Lumen Isles owns worlds, structures, inventory, and game progression. Keep the existing parent screens functional until an authenticated shared website replaces them.

## Implemented now

`FamilyServices` is the learning engine's read boundary for lesson lookup, assignments, question timing, and promotion snoozes. It delegates to the existing standalone Store by default. Trusted application bootstrap code can install a hydrated provider with the same methods, or restore the local provider. `studentId()` uses a mapped shared student ID when present, otherwise the original local profile ID. Keep that mapping stable so linking a student never starts a new world accidentally.

The adapter does not import profiles, expose a URL-based sign-in, receive window messages, grant credits, or transmit children's records. The parent editor and reporting storage still use the local Store. This release does not claim to implement cross-game accounts or synchronization.

## Next integration phase

1. Inspect the supplemental game repositories and agree on one family/student identity scheme. Authenticate parents centrally; issue child sessions scoped to one student and game. Never match students just by their display name.
2. Implement a website-owned family service. Hydrate its provider before entering a game, including stable lesson IDs/revisions. Replace the parent screens with a link to the family dashboard only once that flow is usable. Keep grades and assignments editable once for all games.
3. Link existing local profiles explicitly to shared student IDs, with an export backup and merge/conflict review. Preserve learning records and worlds; keep device-specific speech settings local.
4. Put earned credits and playtime in a server-authoritative ledger. Each award carries a unique event ID, student ID, source game, amount, policy version and server-verified outcome. Retries return the original result. Debit by a unique spend/session ID, prevent double spending, and enforce family access on every request.
5. Keep `sparks`, `earnedCredits`, and `playSeconds` separate. Define conversions through parent policy, not UI code. Reserve/reconcile playtime on the server, pause consumption when the game is inactive, and define offline behavior explicitly. Never accept a local save, browser timer, query string or arbitrary postMessage as proof of a supplemental game's reward.
6. Move lesson results and family reporting to the platform through a queued, versioned interface. World persistence can remain local initially with existing backups, then gain independent cloud sync.

The local `Economy.exchange` history is gameplay bookkeeping, not an authentication or anti-cheat mechanism. Production rewards require the server in step 4 before cross-game balances are enabled.
