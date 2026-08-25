---
name: nfr-budget
description: Define an NFR budget: metric, limit, how and when it is verified (WBS 4.10).
---

# NFR Budget

Бюджет нефункциональных требований: метрика, предел, способ и момент проверки.

## Purpose

Turn soft NFRs into checkable budgets tied to design and verification.

## Inputs

- Requirements / lens notes
- Template `templates/nfr-budget.md`

## Steps

1. Pick metric (latency p95, error rate, cost/req, RPO/RTO, …).
2. Set limit and environment (prod / staging).
3. Define verification method and when (CI, load test, review).
4. Link decisions and features that consume the budget.

## Outputs

- NFR budget file(s)

## Human gates

Confirm limits that constrain delivery cost or UX.
