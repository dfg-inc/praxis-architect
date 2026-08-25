---
name: lens-review
description: Run alternatives through reliability, security, cost, operations, and migration lenses (WBS 4.5).
---

# Lens Review

Прогон альтернатив через линзы: надёжность, безопасность, стоимость, эксплуатация, миграция.

## Purpose

Stress-test options with fixed perspectives so soft spots surface before the human chooses.

## Inputs

- Alternatives document
- NFR hints / platform constraints

## Lenses (each produces compact notes)

1. **Reliability** — failure modes, retries, consistency
2. **Security** — trust boundaries, secrets, authz
3. **Cost** — build + run cost, lock-in
4. **Operations** — observability, runbooks, on-call burden
5. **Migration** — cutover, dual-write, rollback path

## Steps

1. Score or annotate each alternative per lens (pass/concern/fail).
2. Call out where lenses conflict (e.g. cost vs reliability).
3. Update recommendation only if a lens falsifies the prior pick — disclose change.

## Outputs

- `lens-review.md` matrix alternative × lens

## Human gates

None; escalate to `council` when `error-cost-gate` triggers.
