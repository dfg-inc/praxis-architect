---
name: design-package
description: Assemble the design package for a work package — text diagrams, linked decisions, contracts, and NFR budgets — ready for decompose and developer handoff (WBS 4.11).
---

# Design Package

Single package Developer (and `decompose-features`) can implement against: structure, flows, decisions, contracts, budgets. Diagrams are **text** (Mermaid/ASCII) — no binary drawing tools required (WBS `4.11.1`).

## When to use

- After the WP’s binding ADRs are `accepted` (via `record-decision`).
- After relevant `platform-contract` and `nfr-budget` artifacts exist (or explicitly N/A).
- Before `decompose-features` / `initial-estimate` / `context-slice`.

Do **not** start a design package while `intake-audit` is `fail`.

## Inputs

| Input | Path / source |
|-------|----------------|
| WP id | From `ba.architect.handoff.workPackageId` |
| Decisions | `architecture/decisions/ADR-*.md` for this WP |
| Contracts | Platform contract files from `platform-contract` skill |
| NFR budgets | From `nfr-budget` skill / template |
| Context map | Prior `context-map` artifact |
| Alternatives trail | Optional, for non-goals / rejected paths |

## Target layout

```text
design/<workPackageId>/
  index.md                 # overview + scope + non-goals
  diagrams/                # *.md with mermaid/ascii only
  decisions.md             # index of linked ADR ids + paths
  contracts.md             # linked contract paths + compatibility notes
  nfr-budgets.md           # linked budgets + verify moments
  open-questions.md        # prefer empty before handoff
  change-intent.json       # MACHINE: patches + features for Developer (required)
```

Project may relocate under `.project` `design.root`; default is `design/<workPackageId>/`.

## Steps

1. **Preflight**  
   - Intake audit verdict `pass` or acknowledged `pass-with-warnings`.  
   - Machine `ba.architect.handoff` present (from BA `wp approve-plan`).  
   - Every divergence point that required a decision has an `accepted` ADR (or an explicit deferred open question with human ok).  
   - List ADR ids that bind this WP.

2. **Create folder**  
   `design/<workPackageId>/` and `diagrams/`.

3. **Write `index.md`**  
   Required sections:
   - Purpose / user-visible outcome (product language, not code dump).
   - In-scope / out-of-scope.
   - Systems/platforms touched (from context map).
   - Pointers to `decisions.md`, `contracts.md`, `nfr-budgets.md`, `diagrams/`.
   - Build order hint (optional until `initial-estimate`).

4. **Text diagrams** (`diagrams/*.md`)  
   At least:
   - Context / container (C4-ish) for touched platforms.
   - One key sequence or data-flow for the critical path.  
   Use fenced `mermaid` or ASCII. No PNG/SVG required. Each file starts with a one-line legend.

5. **`decisions.md`**  
   Table: ADR id | title | path | rule (one-liner). Link only `accepted` ADRs that apply. Orphans with no link → fix before handoff.

6. **`contracts.md`**  
   For each inter-platform exchange: path to contract, format, compatibility policy summary. If none: section `None — single module` with justification.

7. **`nfr-budgets.md`**  
   Metric | limit | measure how | measure when | budget file path. Missing measure/when → incomplete package.

8. **`open-questions.md`**  
   Prefer empty. Any remaining open must be severity-tagged; high severity blocks handoff readiness.

9. **Write `change-intent.json` (machine, required)**  
   Product-agnostic patch + feature intent consumed by `emit-developer-handoff`. Derive from BA scope + accepted decisions — **never** hardcode a sample product. Include at minimum:

   ```json
   {
     "decisionIds": ["ADR-…"],
     "requirementIds": ["…from ba handoff…"],
     "features": [{ "id": "FEAT-…", "title": "…", "readyForDev": true }],
     "changes": [
       { "file": "path/in/product", "description": "…", "match": "…", "replace": "…" }
     ],
     "acceptanceChecks": [{ "file": "…", "contains": "…" }],
     "design": {
       "title": "…",
       "decision": "…",
       "contextInScope": ["…"],
       "outOfScope": ["…"],
       "changeIntent": "one-liner"
     }
   }
   ```

   `changes` may use `match`/`replace` or `write` for new files. Omit empty — handoff emit will fail.

10. **Self-check**  
   - Every diagram renders as text in a markdown viewer.  
   - Every ADR id resolves on disk.  
   - Non-goals explicit in `index.md`.  
   - `change-intent.json` parses and lists `readyForDev: true` features.

11. **Handoff path**  
    Record `designPackagePath: "design/<workPackageId>/"` for later `architect.developer.handoff` (filled fully in `context-slice` / emit).

## Human gates

| Situation | Gate |
|-----------|------|
| High residual risk / non-empty high opens | AskUserQuestion: sign off package readiness? |
| Diagram vs ADR conflict | Stop; reconcile before decompose |
| Low risk, opens empty | Proceed; still show package path for skim |

## Done when

- Folder `design/<workPackageId>/` contains index, decisions, contracts, budgets, ≥1 text diagram, **and** `change-intent.json`.
- Diagrams are text-only and self-contained.
- Binding ADR/contract/budget links resolve.
- Package is usable input to `decompose-features` without inventing architecture.

## Failure modes

| Mode | Response |
|------|----------|
| Binary-only diagrams | Replace with Mermaid/ASCII |
| Package without linked decisions | Incomplete — add `decisions.md` |
| Missing `change-intent.json` | Incomplete — write machine intent before context-slice emit |
| Open high-severity questions left silent | Block handoff; human gate |
| Inventing new ADRs inside design package | Stop; run `record-decision` first |
| Skipping intake-fail packages | **Forbidden** |
