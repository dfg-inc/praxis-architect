---
name: divergence-points
description: Find divergence points where two implementers would make incompatible choices (WBS 4.3).
---

# Divergence Points

Найди точки расхождения — места, где два исполнителя сделают несовместимо.

## Purpose

Surface decisions that must be locked before coding so parallel work stays compatible.

## Inputs

- Context map
- Requirements and interfaces between components

## Steps

1. Walk interfaces, shared data, auth, error contracts, deployment order.
2. For each ambiguous point, write: what diverges, who would decide differently, blast radius.
3. Rank by irreversibility (feeds `error-cost-gate`).

## Outputs

- `divergence-points.md` ordered list with severity

## Human gates

None yet — alternatives and council come next.
