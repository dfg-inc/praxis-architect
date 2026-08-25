---
name: context-map
description: Build a context map of affected platforms, services, and standing decisions for the work package (WBS 4.2).
---

# Context Map

Собери карту контекста по затрагиваемым платформам и действующим решениям.

## Purpose

Ground design in what already exists — platforms, contracts, decisions — before proposing change.

## Inputs

- Passed intake-audit
- Repo / knowledge slice for architecture decisions
- Platform inventory (services, APIs, data stores)

## Steps

1. List impacted systems and ownership boundaries.
2. Pull standing decisions that constrain the package.
3. Note open contracts and NFR budgets already in force.
4. Mark unknown areas explicitly (do not invent).

## Outputs

- `context-map.md`: platforms, decisions, unknowns, links to sources

## Human gates

None required unless unknowns block further work — then ask which systems are in scope.
