---
name: context-slice
description: Issue a context slice tailored to one work package for Developer intake — applicable decisions, contracts, budgets, must-read paths, and explicit out-of-slice boundaries (WBS 4.14).
---

# Context Slice

Give Developer **only** what this package needs: applicable decisions, contracts, NFR budgets, must-read paths — not the whole architecture corpus. Boundaries are named explicitly (WBS `4.14.1`).

## When to use

- After `design-package`, `decompose-features`, and `initial-estimate` (features have `readyForDev` intent).
- Immediately before emitting `architect.developer.handoff`.
- Re-issue when ADR set or contracts change mid-flight.

Do **not** use as a substitute for the design package; the slice **points into** it.

## Inputs

| Input | Path / source |
|-------|----------------|
| Design package | `design/<workPackageId>/` |
| Feature list | From `decompose-features` |
| Standing decisions | `architecture/decisions/` |
| Contracts / budgets | Linked from design package |
| Code roots | Repo paths known from context map (optional) |

## Output path

Default:

`design/<workPackageId>/context-slice.md`

This path becomes `contextSlicePath` on `architect.developer.handoff`.

## Steps

1. **Collect applicable set**  
   From design package + feature scope, select:
   - ADR ids whose rules bind implementers for this WP.
   - Contract paths that will be coded against.
   - NFR budgets that must be measured or respected in this WP.
   Exclude ADRs/contracts that do not constrain this WP — list them under out-of-slice, do not silently omit a binding one.

2. **Must-read paths**  
   Bullet list of repo-relative files/dirs Developer should open first (modules, existing patterns). Prefer ≤15 entries. Mark each `required` or `background`.

3. **Write `context-slice.md`** with required sections:

   ```markdown
   ---
   workPackageId: <id>
   designPackagePath: design/<id>/
   decisionIds: [ADR-...]
   generated: YYYY-MM-DD
   ---

   # Context slice — <workPackageId>

   ## In slice
   ### Decisions
   | id | path | rule (one line) |
   ### Contracts
   | name | path |
   ### NFR budgets
   | metric | limit | verify when | path |
   ### Must-read
   - `path` — required|background — why

   ## Out of slice
   Explicit list: what Developer must **not** reinterpret or expand without Architect
   (other platforms, deferred ADRs, future epics).

   ## Non-negotiables
   Bullets copied/shortened from ADR rules that would otherwise be missed.

   ## Open items
   Only human-acknowledged residual opens; else empty.
   ```

4. **Boundary check**  
   Every `accepted` ADR that `decisions.md` marks as applying to this WP appears under **In slice**. If an ADR would be omitted, either add it or AskUserQuestion to confirm omission.

5. **Emit handoff fields** (do not invent features here — use decompose output):

   Prepare / update JSON conforming to `ArchitectToDeveloperHandoffSchema`:
   - `contract: "architect.developer.handoff"`
   - `version` (semver of contract)
   - `workPackageId`
   - `designPackagePath: "design/<workPackageId>/"`
   - `contextSlicePath: "design/<workPackageId>/context-slice.md"`
   - `decisionIds` — same as slice
   - `features[]` with `readyForDev` from decompose/estimate

   Persist handoff beside the package if the project keeps artifacts on disk, e.g. `design/<workPackageId>/handoff.json`.

6. **Announce**  
   Slice path + decision count + any residual opens for Developer `accept-work-package`.

## Human gates

| Situation | Gate |
|-----------|------|
| Omitting a binding ADR | Required confirm |
| Non-empty high-severity opens | Confirm handoff anyway vs return to design |
| Clean slice | No extra gate; Developer still accepts separately |

## Done when

- `design/<workPackageId>/context-slice.md` exists with in-slice / out-of-slice / non-negotiables.
- `decisionIds` on the handoff match the slice.
- Out-of-slice boundaries are explicit (not “see architecture/”).
- Package is ready for Developer `accept-work-package`.

## Failure modes

| Mode | Response |
|------|----------|
| Dumping entire `architecture/decisions/` | Trim to applicable; move rest to out-of-slice |
| Slice without out-of-slice section | Incomplete — rewrite |
| Omitting binding ADR silently | **Forbidden** — add or human-confirm |
| Handoff `decisionIds` ≠ slice | Align before publish |
| Pointing at missing design package | Fix `design-package` first |
| Empty must-read when code exists | Add at least the primary module paths |
