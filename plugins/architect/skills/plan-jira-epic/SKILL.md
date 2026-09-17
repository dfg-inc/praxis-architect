---
name: plan-jira-epic
description: Continue an Epic as Architect — design package and Jira Work Package for implementation.
---

# Plan Jira Epic

Primary human UX is Claude UI. Users should not run Make or internal scripts.

## Capability detection

Detect repo via `git rev-parse --show-toplevel`. Run `${CLAUDE_PLUGIN_ROOT}/bin/praxis doctor --json`. If execution fails: `LOCAL_RUNTIME_UNAVAILABLE` — do not pretend architecture ran.

If `.project` is missing: infer preview, ask once, persist with `--confirm YES`.

If unsure of commands: `praxis architect --help` then `praxis architect preview --help`.

## Flow

Reuse existing local design (e.g. `WP-20260914-002`) when present. Do not redo architecture from scratch unless the user asks.

```
praxis jira status --epic <EPIC> --json
praxis architect preview --epic <EPIC> --repo . --json
```

Preview must show the real plan: CREATE Jira WP for the canonical local WP, UPDATE managed architecture on canonical stories, LINK WP ↔ stories, IGNORED superseded. No generic “Technical implementation” task. No placeholder `flowchart LR / A-->B`.

After human approval:

```
praxis architect apply --epic <EPIC> --repo . --confirm YES --json
```

Do not start Developer.

Examples: «Продолжи PRX-123 как архитектор и подготовь пакеты реализации.» / “Continue PRX-123 as architect and prepare implementation packages.”
