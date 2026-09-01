---
name: decompose-features
description: Decompose design into features and stories with readiness criteria for handoff (WBS 4.12).
---

# Decompose Features

Декомпозиция на фичи и сценарии с критериями готовности передачи.

## Purpose

Break the design into trackable Feature/Story units with clear ready-for-dev criteria.

## Inputs

- Design package
- Jira/schema conventions if used

## Steps

1. Features = capability slices; Stories = implementable slices with AC.
2. For each: readiness checklist (deps, contracts stable, estimate pending).
3. Order by build sequence dependencies.

## Outputs

- Feature/story list with `readyForDev` flags
- Update `design/<workPackageId>/change-intent.json` `features[]` so every in-delivery feature has `readyForDev: true` before `context-slice` / `emit-developer-handoff`

## Human gates

Confirm slice boundaries if they affect release planning.
