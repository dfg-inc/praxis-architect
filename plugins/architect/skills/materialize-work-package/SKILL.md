---
name: materialize-work-package
description: Materialize the canonical local Work Package into Jira (architect apply).
---

# Materialize Work Package

## Shared Praxis Runtime

This Skill uses tools from the **Praxis Runtime** Desktop Extension.

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`. Tell the user to install or enable the Praxis Runtime Desktop Extension.
2. Call `praxis_doctor`.
3. If Jira is not configured: stop with `JIRA_CONFIG_UNAVAILABLE`. Open Claude Desktop → Settings → Extensions → Praxis Runtime → Settings. Never request the token in chat.

Uses existing local WP identity (e.g. WP-20260914-002). Does not create `wp:PRX-3`.

Allowed tools: common/Jira/project + Architect/WP. Do not start Developer.

Call `praxis_architect_preview`. Show CREATE/UPDATE/LINK/IGNORED. STOP and wait for human approval.

Then `praxis_architect_apply` with `confirmation=YES` and matching `previewFingerprint`. Do not immediately apply after preview.
