---
name: grill
description: Adversarial one-question-at-a-time grilling with recommended answers; Architect Phase 1 port from praxis feat/grill-rules (WBS 4.4–4.7 adjacent).
---

# Grill (Architect)

Maieutic stress-test of an architecture choice until the human **consciously owns** it. Convergence move — does not invent options; pressure-tests one front-runner.

## Call sites

| Mode | When | Output |
|---|---|---|
| brainstorm | After alternatives/lenses, before `record-decision` | grill transcript + sharpened choice |
| pre-decision | Before irreversible commit (`error-cost-gate` triggered) | ownership of trade-offs |
| readthrough | After design-package draft, before handoff | text ownership edits |

## Hard rules

1. **One question at a time** — wait for explicit confirmation before the next.
2. **Every question carries a recommended answer** with a one-line reason.
3. **Recursive tree-walk** — fork → choice → grill → sub-forks; finish a branch before jumping.
4. **Facts from the repo; choices from the human** — never skip a choice question because the answer seems obvious.
5. **No “nothing to grill” exit** — depth regulator is the human.

## Human gates

Required for irreversible decisions (`error-cost-gate`). Pair with `council` when blast radius is high (schema, platform boundary, data migration).

## Outputs

- `_grill-transcript.md` next to the decision draft
- Confirmed choice feeds `record-decision`

## Relationship to BA `grill-cr`

Same maieutic pattern, different object: BA grills change-request scope; Architect grills structural choices. Do not mix pipelines.
