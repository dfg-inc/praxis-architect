---
name: intake-audit
description: Audit BA work-package intake for completeness, contradictions, and feasibility before architecture work starts (WBS 4.1). Return the package to BA on fail; write the audit under architecture/audits/.
---

# Intake Audit

Gate that decides whether Architect may start design work on a BA work package. Three axes only: **completeness**, **contradictions**, **feasibility**. Do not invent missing requirements; do not “fix” product scope in this skill.

## When to use

- Immediately after receiving `ba.architect.handoff` (or an equivalent WP path from BA).
- Before `context-map`, `divergence-points`, or any design artifact.
- Re-run after BA returns a repaired package.

Do **not** use to shape requirements (BA owns that) or to record ADRs.

## Inputs

| Input | Path / source |
|-------|----------------|
| Handoff JSON | `ba.architect.handoff` at `wp/<workPackageId>/handoffs/ba-architect.handoff.json` (emitted by `wp approve-plan`) |
| WP folder | `workPackagePath` from handoff, typically `wp/<id>/index.md` |
| Requirements | Paths resolved from WP `## Scope` / `requirementIds` |
| Vision | Canon vision page referenced by BA readiness |
| Optional | Existing `architecture/decisions/`, NFR catalog, platform contracts |

## Steps

1. **Locate + validate handoff schema**  
   Prefer the machine file from BA approval:

   `wp/<workPackageId>/handoffs/ba-architect.handoff.json`

   Parse against `BaToArchitectHandoffSchema`. Required: `contract: "ba.architect.handoff"`, `version`, `workPackageId`, `workPackagePath`, non-empty `requirementIds`, `visionConfirmed`, `readinessChecks[]`.  
   Missing file or schema fail → severity `block`, stop; ask BA to re-run `wp approve-plan` (or `tools/emit-architect-handoff.mjs`). Do not invent fields. Markdown WP alone is **not** a substitute for the machine handoff.

2. **Resolve files**  
   Read `workPackagePath`. For each `requirementId`, open the canon page (FR/NFR/BR). If a path cannot be resolved → `block` finding `missing-artifact`.

3. **Axis A — Completeness**  
   For every scoped requirement:
   - ≥1 acceptance criterion in scenario form (Given/When/Then or project-equivalent).
   - Observable outcome (not “implement X”).
   - Scope in/out or epic boundary visible from WP `## Scope` / epic index.
   - Stakeholders / actors named or linked from project layer.  
   Missing AC or empty Delivers list → `block`. Soft gaps (stakeholder unspecified but inferable) → `warn`.

4. **Axis B — Contradictions**  
   Pairwise scan FR↔FR, FR↔NFR, FR↔BR, NFR↔NFR:
   - Incompatible observable behaviors.
   - Mutually exclusive invariants.
   - NFR numbers that make an FR impossible.  
   Every contradiction finding **must name both ids** (WBS `4.1.2`). Severity `block`.

5. **Axis C — Feasibility skim** (architecture-shaped, not a full design)  
   Flag:
   - Unknown / unnamed platforms or integrations with no owner.
   - NFR thresholds with no measurement method and no plausible system.
   - Dependencies on retired decisions or unavailable systems.  
   Mark `block` when clearly impossible given known platform facts; `warn` + `needs-human` when uncertain.

6. **Aggregate verdict**  
   - Any `block` → overall `fail`.  
   - Only `warn` → `pass-with-warnings` (Architect may proceed after human acknowledge).  
   - Clean → `pass`.

7. **Write audit artifact**  
   Create directory if needed: `architecture/audits/`.  
   Write:

   `architecture/audits/<workPackageId>-intake-audit.md`

   Required sections:
   - Frontmatter: `workPackageId`, `date`, `verdict: pass|pass-with-warnings|fail`, `handoffVersion`
   - `## Completeness` / `## Contradictions` / `## Feasibility` — findings table (`id`, `severity`, `axis`, `detail`, `refs`)
   - `## Verdict` — one paragraph + next action
   - On fail: `## Return to BA` — concrete repair list (what to add/fix; which ids conflict)

8. **On fail — return package**  
   Do **not** start `context-map`. Present the audit path and repair list to the human/BA channel. Status remains “Architect waiting on BA”. Re-entry = this skill again on the new handoff.

9. **On pass**  
   Announce audit path; proceed to `context-map`.

## Human gates

| Situation | Gate |
|-----------|------|
| Any `block` | Human/BA must acknowledge return; Architect does not continue |
| `pass-with-warnings` only | AskUserQuestion: proceed despite warnings? Require explicit yes |
| Ambiguous feasibility | Mark `needs-human`; do not silently downgrade to `ok` |

Never invent AC or “assume” vision confirmed when `visionConfirmed: false`.

## Done when

- Audit file exists at `architecture/audits/<workPackageId>-intake-audit.md`.
- Verdict is explicit on all three axes.
- On `fail`: package returned to BA with both-id contradictions (if any) and a repair list; no downstream Architect skills started.
- On `pass` / acknowledged `pass-with-warnings`: handoff is eligible for `context-map`.

## Failure modes

| Mode | Response |
|------|----------|
| Handoff schema invalid | `fail`; write audit with schema errors only; return to BA |
| WP path missing | `fail`; do not invent WP content |
| Contradiction found | `fail`; name both requirement ids; return |
| Agent “fixes” requirements in place | **Forbidden** — BA owns canon; Architect only audits |
| Skip writing audit file | **Forbidden** — artifact is the gate record |
| Proceed to design on `fail` | **Forbidden** |
