---
name: resume-architecture
description: Resume Architect work from existing design and remote BA readiness.
---

# Resume Architecture

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.
4. If `.project` is missing: `praxis_project_init_preview`, wait for approval, then `praxis_project_init_apply` with `confirmation=YES`.

Allowed tools: common/Jira/project + Architect/WP. Do not start Developer. Quality unhealthy does not block this Skill.

Call `praxis_doctor` then `praxis_work_package_list` / `praxis_architect_status`. Resolve the canonical local Work Package first and pass that id as `workPackageId` — it is the materialization scope, not a hint. Do not call `praxis_architect_preview` without `workPackageId` when the canonical WP is already known.

Then `praxis_architect_preview` with `epic` and `workPackageId`. Show CREATE/UPDATE/LINK/IGNORED and wait for human approval.

Apply only with `praxis_architect_apply` using the same `workPackageId`, `confirmation=YES`, and matching `previewFingerprint`. Do not immediately apply after preview.
