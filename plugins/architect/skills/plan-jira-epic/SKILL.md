---
name: plan-jira-epic
description: Continue an Epic as Architect — design package and Jira Work Package for implementation.
---

# Plan Jira Epic

Primary human UX is Claude UI / Cowork with project access. Users should not run Make, CLI, or `launchctl`.

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension. Do not instruct them to run CLI or edit config files.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE` and the `missing` field list. Tell the user: Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.
4. If `.project` is missing: `praxis_project_init_preview`, show it, wait for approval, then `praxis_project_init_apply` with `confirmation=YES`.

Quality runtime unhealthy must not block Architect status/preview. Do not start the Quality service.

Allowed tools: common/Jira/project + Architect/WP tools. Do not start Developer.

## Flow

Reuse existing local design (e.g. `WP-20260914-002`) when present. Do not redo architecture from scratch unless the user asks.

1. `praxis_jira_status` / `praxis_architect_status`
2. `praxis_work_package_list` / `praxis_work_package_show` — resolve the canonical local WP first
3. `praxis_architect_preview` with `epic` **and** `workPackageId`

`workPackageId` is the explicit materialization scope, not a hint. Do not call preview without it when the canonical WP is already known. Sibling local WPs must not appear in CREATE/UPDATE/LINK.

Preview must show the real plan: CREATE Jira WP for that scoped local WP, UPDATE managed architecture on canonical stories, LINK WP ↔ stories, IGNORED superseded. No generic “Technical implementation” task. No placeholder `flowchart LR / A-->B`. Canonical WP is `WP-20260914-002`, never `wp:PRX-3`. Jira summary must be a human title (never `---`).

Explain the preview. STOP. Ask for explicit approval. Do not call apply in the same autonomous sequence.

Only after approval call `praxis_architect_apply` with:

- `workPackageId`: the same scoped id
- `confirmation`: `YES`
- `previewFingerprint`: exact fingerprint from preview

Then verify postconditions.

Examples: «Продолжи PRX-123 как архитектор и подготовь пакеты реализации.» / “Continue PRX-123 as architect and prepare implementation packages.”
