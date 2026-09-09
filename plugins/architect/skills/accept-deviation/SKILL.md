---
name: accept-deviation
description: Accept a design deviation request as a change to an architecture decision (WBS 4.15).
---

# Accept Deviation

Приём отклонения от дизайна как запроса на изменение решения.

## Purpose

Route Developer deviation requests through Architect change control — not silent drift.

## Inputs

- Deviation request (from Developer `request-architecture-deviation`)
- Original decision id(s)

## Steps

1. Classify: local clarification vs decision change.
2. If change: reopen alternatives / council if error-cost-gate trips.
3. Update or supersede decision record; refresh context slice if needed.
4. Accept or reject with rationale.

## Machine artifact

Developer files JSON via `tools/request-architecture-deviation.mjs`. Architect decides without editing the original ADR:

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/architecture-governance.mjs decide-deviation --request <req.json> --outcome approved|rejected|revise --actor <role> --rationale <text> --adr <original.md> --out <decision.json>
```

Binding changes require an explicit `--new-decision-id` (new ADR), never a silent rewrite of the original.

## Outputs

- Updated decision / rejection note; notify Developer

## Human gates

Decision changes require human confirm. Clarifications may proceed with disclosure.
