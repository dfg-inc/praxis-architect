---
name: present-plan
description: Build and display an exact architecture action plan. Approving decisions does not confirm Stories.
---

# Present plan (Architect)

Before recording or applying architecture mutations:

1. Build a `praxis.action.plan` with `decisionKind=architecture_decision`.
2. List every decision id in scope (for example DEC-001…DEC-011) and the exact statements.
3. Explicitly state that Stories remain unconfirmed.
4. Submit to the broker; wait for a signed authorization.
5. Do not reuse an architecture authorization for `story_behavior`, Git push, or Jira writes outside the approved operations.
