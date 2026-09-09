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

## Machine artifact

```bash
node ${CLAUDE_PLUGIN_ROOT}/tools/architecture-governance.mjs write-platform-contract --in <json> --out design/<wp>/contracts/<id>.json
```

JSON must include id, owner, consumers, request, response, errors, compatibility.version. Missing required ids are detected (`detect-missing-contracts`) and never invented. Developer handoff lists `platformContractIds` when contract files exist.

## Outputs

- Contract document path

## Human gates

Owners of both sides confirm before marking active.
