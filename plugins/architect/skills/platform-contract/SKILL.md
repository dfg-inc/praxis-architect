---
name: platform-contract
description: Draft or update a cross-platform contract with compatibility policy (WBS 4.9).
---

# Platform Contract

Контракт между платформами с политикой совместимости.

## Purpose

Make inter-platform expectations explicit: interfaces, versioning, compatibility.

## Inputs

- Decision(s) that introduce or change a boundary
- Template `templates/platform-contract.md`

## Steps

1. Name producer/consumer platforms.
2. Define interface (API/events/data), ownership, SLAs if any.
3. Compatibility policy: additive-only, deprecation window, break process.
4. Link to decision ids.

## Outputs

- Contract document path

## Human gates

Owners of both sides confirm before marking active.
