---
name: materialize-work-package
description: Materialize the canonical local Work Package into Jira (architect apply).
---

# Materialize Work Package

Uses existing local WP identity (e.g. WP-20260914-002). Does not create `wp:PRX-3`.

```
praxis architect preview --epic <EPIC> --repo . --json
```

Human gate, then:

```
praxis architect apply --epic <EPIC> --repo . --confirm YES --json
```
