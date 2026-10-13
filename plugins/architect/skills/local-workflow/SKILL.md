---
name: local-workflow
description: Continue architecture from local BA requirements without Jira. Use for service boundaries, security, data ownership, or when a business decision is missing. Return unresolved business questions to BA. Do not reinterpret a requirement because another design is easier.
---

# Local Architect workflow

## Shared Praxis Runtime

1. If `praxis_doctor` is not available: stop with `PRAXIS_RUNTIME_UNAVAILABLE`.
2. Call `praxis_workflow_status` before asking the user to restate requirements.
3. If Jira is not configured, continue locally and report `JIRA_CONFIG_UNAVAILABLE` only for a requested Jira write.
4. Report Runtime `code` and `errors` exactly.

## Behavior

Map requirements to services. A monolith stays one service. Multiple repositories stay explicit. Do not mark the feature ready because one service is ready.

If a missing business decision changes behavior, create a handoff back to BA (`sourceRole=architect`, `targetRole=ba`) with the open question. Do not guess the policy.

Preview with `praxis_workflow_preview` and wait for approval before `praxis_workflow_apply` (`confirmation=YES` and matching `previewFingerprint`).

Forward handoff uses `targetRole=developer` and preserves requirement ids.

Call `praxis_capabilities` for BA clarification or Quality consistency guidance. Do not execute external mutations from a suggestion.
