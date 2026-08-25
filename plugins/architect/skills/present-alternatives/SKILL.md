---
name: present-alternatives
description: Present design alternatives with explicit tradeoffs for each divergence point (WBS 4.4).
---

# Present Alternatives

Предъяви альтернативы с явными компромиссами.

## Purpose

Give the human real choices — not a single hidden recommendation dressed as inevitability.

## Inputs

- Divergence points
- Context map, constraints, NFR hints

## Steps

1. For each high-severity divergence, propose ≥2 viable alternatives.
2. For each alternative: benefits, costs, risks, rollback difficulty, fit to standing decisions.
3. Mark a recommended option with one-line rationale (recommendation ≠ decision).

## Outputs

- `alternatives.md` per divergence or one consolidated file

## Human gates

Do not lock a choice here. Hand off to `lens-review` / `council` as needed.
