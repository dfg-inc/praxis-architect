---
name: jira-plan-epic
description: Read BA Jira handoff for an Epic, add technical design, create Work Packages.
---

# Jira plan epic

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Allowed tools: common/Jira/project + Architect/WP. Do not start Developer.

Resolve the canonical local Work Package first. Pass `workPackageId` explicitly to preview — it is the materialization scope, not a hint. Do not call `praxis_architect_preview` without `workPackageId` when the WP is already known.

Call `praxis_architect_preview` with `epic` and `workPackageId`. Apply only after human approval:

`praxis_architect_apply` with the same `workPackageId`, `confirmation=YES`, and matching `previewFingerprint`.

Do not overwrite User Story / BA AC. Do not invent generic technical tasks. Do not immediately apply after preview.
