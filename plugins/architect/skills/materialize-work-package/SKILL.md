---
name: materialize-work-package
description: Materialize the canonical local Work Package into Jira (architect apply).
---

# Materialize Work Package

Uses existing local WP identity (e.g. WP-20260914-002). Does not create `wp:PRX-3`.

Call `praxis_architect_preview`. Show CREATE/UPDATE/LINK/IGNORED. STOP and wait for human approval.

Then `praxis_architect_apply` with `confirmation=YES` and matching `previewFingerprint`. Do not immediately apply after preview. Do not start Developer.
