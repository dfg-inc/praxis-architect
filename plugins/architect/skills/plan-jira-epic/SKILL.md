---
name: plan-jira-epic
description: Continue an Epic as Architect — design package and Jira Work Package for implementation.
---

# Plan Jira Epic

Primary human UX is Claude UI / Cowork with project access. Users should not run Make or CLI.

## Capability detection

Resolve the repo. Call `praxis_doctor`. If execution is not available: `LOCAL_RUNTIME_UNAVAILABLE`. If the repo is missing: `REPOSITORY_UNAVAILABLE`. If Jira is not configured: `JIRA_CONFIG_UNAVAILABLE`. Do not pretend architecture ran. Never paste tokens into chat.

If `.project` is missing: `praxis_project_init_preview`, show it, wait for approval, then `praxis_project_init_apply` with `confirmation=YES`.

## Flow

Reuse existing local design (e.g. `WP-20260914-002`) when present. Do not redo architecture from scratch unless the user asks.

1. `praxis_jira_status` / `praxis_architect_status`
2. `praxis_work_package_list` / `praxis_work_package_show` if a WP is named
3. `praxis_architect_preview`

Preview must show the real plan: CREATE Jira WP for the canonical local WP, UPDATE managed architecture on canonical stories, LINK WP ↔ stories, IGNORED superseded. No generic “Technical implementation” task. No placeholder `flowchart LR / A-->B`. Canonical WP is `WP-20260914-002`, never `wp:PRX-3`.

Explain the preview. STOP. Ask for explicit approval. Do not call apply in the same autonomous sequence.

Only after approval call `praxis_architect_apply` with:

- `confirmation`: `YES`
- `previewFingerprint`: exact fingerprint from preview

Then verify postconditions. Do not start Developer.

Examples: «Продолжи PRX-123 как архитектор и подготовь пакеты реализации.» / “Continue PRX-123 as architect and prepare implementation packages.”
