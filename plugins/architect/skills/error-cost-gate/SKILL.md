---
name: error-cost-gate
description: Decide whether council is mandatory, optional, or skipped for a candidate architecture choice based on rollback cost (WBS 4.7). Blocks record-decision when council is required but missing.
---

# Error Cost Gate

Binary-friendly gate: if the choice is hard to roll back or blast radius is high, **council is mandatory** and cannot be skipped. Cheap, package-local choices skip council and go straight to human choice + `record-decision`.

## When to use

- After `present-alternatives` / `lens-review` (or `grill`) when a front-runner exists.
- Before `council` and before `record-decision`.
- Re-evaluate if the chosen option’s blast radius changed during grilling.

Do **not** use as a substitute for the human decision itself.

## Inputs

| Input | Source |
|-------|--------|
| Candidate decision / front-runner | Session + alternatives trail |
| Divergence points | `divergence-points` notes |
| Lens findings | `lens-review` output |
| Affected contracts / schemas | Paths under `architecture/` or design draft |

## Mandatory council — any criterion true → `council-required`

Mark `council-required` if **any** of the following hold:

1. **Schema / API contract** change with external or cross-team consumers.
2. **Data migration** without a documented easy rollback (or production data rewrite risk).
3. **Auth / tenancy / security boundary** change.
4. **Multi-service / platform boundary** change that creates permanent coupling.
5. Estimated **rollback > 1 sprint**, or irreversible production data risk.
6. Divergence severity already tagged irreversible / high blast radius.

When `council-required`, **skip is forbidden** (WBS `4.7.2`). `record-decision` must refuse until council verdict + human choice exist.

## Skip council — all must hold → `skip`

Mark `skip` only when **all** are true (WBS `4.7.1`):

1. Decision is fully reversible **within this work package** (revert PR / config flag / local module swap).
2. No schema, security-boundary, or cross-system contract change.
3. No production data migration.
4. Failure mode is contained to the WP’s feature set.
5. Lens review did not raise a high-severity irreversible risk.

Write a one-paragraph rationale naming why each irreversible class does **not** apply.

## Optional council → `council-optional`

Use when skip criteria almost hold but:

- Two strong alternatives remain with similar cost, or
- Human / Architect wants stress-test, or
- Medium blast radius (team-local API, internal-only contract).

Council may run; it is not a hard block on `record-decision` if the human explicitly waives it **in writing** on the gate artifact.

## Steps

1. Name the candidate decision in one sentence (what locks in).
2. Score each mandatory criterion true/false with evidence (file path, consumer, migration note).
3. Emit gate result:

   `architecture/audits/<workPackageId>-error-cost-<slug>.md`

   or append a `## Error cost gate` section to the alternatives draft if one already exists for this fork.

   Required fields:
   - `result: council-required | council-optional | skip`
   - Criterion checklist (true/false + evidence)
   - Rationale (≤10 lines)
   - Next skill: `council` | `record-decision` | human waive path

   Machine gate (deterministic flags, no LLM):

   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/tools/architecture-governance.mjs classify-error-cost --in <flags.json>
   ```

   `priceOfError: high` → `council-required` and `record-decision` is blocked until council + human approval exist.

4. If `council-required` → invoke `council`; do not call `record-decision` yet.
5. If `skip` → proceed to human choice confirmation, then `record-decision`.
6. If `council-optional` → AskUserQuestion: run council or waive? Record the answer on the artifact.

## Human gates

| Result | Gate |
|--------|------|
| `council-required` | No waive. Council + human choice required |
| `council-optional` | Explicit run vs waive |
| `skip` | Still need human to pick the alternative before ADR |

Architect must not auto-commit the ADR after this gate alone.

## Done when

- Gate artifact (or section) records `result` + evidence checklist.
- Routing is unambiguous: council path or direct `record-decision` path.
- If `council-required`, `record-decision` is blocked until council + human choice complete.

## Failure modes

| Mode | Response |
|------|----------|
| Soft-skip of schema/boundary change | **Forbidden** — force `council-required` |
| “We’ll document later” without artifact | **Forbidden** — write the gate file |
| `record-decision` before council when required | Refuse; point at this gate |
| Vague “seems reversible” with no rollback story | Treat as `council-required` or `needs-human` |
| Collapsing optional into skip without human waive | Re-open AskUserQuestion |
