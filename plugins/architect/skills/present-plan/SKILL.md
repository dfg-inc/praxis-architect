---
name: present-plan
description: Show the user the exact architecture action (preview) before it is applied, then let them approve or reject it in the MCP client. Approving decisions does not confirm Stories.
---

# Present plan (Architect)

Action, preview, the user approves or rejects, execute, result.

Before recording or applying architecture mutations (`praxis_architect_apply`, `confirm-decision`):

1. Preview with `praxis_architect_preview` or `praxis_workflow_preview`.
2. List every decision id in scope (for example DEC-001…DEC-011) and the exact statements.
3. State explicitly that Stories remain unconfirmed: an architecture approval is not a `story_behavior`, Git push or Jira write approval.
4. Show the user the plan, then apply (see below). Confirming a decision uses its exact revision and `contentFingerprint` from `praxis_workflow_inspect` (`view=decisions`).

Approval works the same way everywhere:

- **Preview, then ask.** Call the matching preview tool and show the user what it returned: the exact plan, nothing summarized away. Then call the apply tool with `confirmation=YES` and the `previewFingerprint` from that preview. `confirmation=YES` only says you want to apply what was previewed; it is **not** the user's approval. Praxis asks the user in the MCP client's own approval dialog, which shows the same plan. **Approve** runs exactly that action. **Reject** or dismissing the dialog runs nothing and the tool returns `APPROVAL_REJECTED`.
- **A client without that dialog.** `praxis_doctor` reports `approval.mode`. When it is `no-dialog`, protected actions are **not executed**: the tool returns `APPROVAL_CLIENT_UI_REQUIRED` with the preview in `data.preview`. Show the user that preview, say plainly that nothing was applied and that it can only be applied from a client that supports approval dialogs. Do not ask the user to type "yes" as a substitute, do not retry with other wording, and do not report the action as done. Read-only tools and previews keep working.
- **If the user told you no**, call apply with `confirmation=NO`: it records the rejection and runs nothing.
- **Your "yes" is not theirs.** Never write approval files, tokens or approval-looking arguments, and never answer a dialog yourself: they authorize nothing.
- **A changed plan needs a new preview and a new approval.** An approval covers one action and exactly the content that was shown.
