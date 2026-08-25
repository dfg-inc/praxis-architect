---
name: initial-estimate
description: Produce initial architect estimates and recommended build order (WBS 4.13).
---

# Initial Estimate

Изначальная оценка и порядок сборки.

## Purpose

Rough sizing for planning — not a commitment until human accepts.

## Inputs

- Decomposed features/stories
- Complexity signals from design package

## Steps

1. Estimate hours/points per feature (state scale).
2. Propose build order (critical path first).
3. Call out estimate risk drivers.

## Outputs

- Estimate table + build order (feeds Jira `setArchitectEstimate` when used)

## Human gates

Human accepts estimates before they become tracker values.
