---
name: jira-plan-epic
description: Read BA Jira handoff for an Epic, add technical design, create Work Packages.
---

# Jira plan epic

Public CLI only. If unsure: `praxis architect --help`.

```
praxis architect preview --epic PRX-1 --repo . --json
```

Apply after human confirmation:

```
praxis architect apply --epic PRX-1 --repo . --confirm YES --json
```

Do not overwrite User Story / BA AC. Do not invent generic technical tasks.
