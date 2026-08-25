---
name: verify-against-decisions
description: Verify implementation against architecture decisions and NFR budget spend (WBS 4.16).
---

# Verify Against Decisions

Сверка реализации с решениями и расходом бюджетов.

## Purpose

Before merge, check that code and design still match binding decisions and NFR limits.

## Inputs

- Decision ids, NFR budgets, MR / implementation refs
- Developer verification evidence if available

## Steps

1. For each decision: evidence of compliance or justified deviation.
2. For each budget: measurement or honest "not yet measured" with plan.
3. Fail closed on silent violations.

## Outputs

- Verification report pass/fail

## Human gates

Fail results escalate to human; do not rubber-stamp.
