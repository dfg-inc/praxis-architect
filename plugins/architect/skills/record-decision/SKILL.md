---
name: record-decision
description: Record an architecture decision from templates/architecture-decision.md — binding scope, divergence prevented, rule introduced, rejected alternatives (WBS 4.8). Refuse incomplete records missing rejected alternatives.
---

# Record Decision

Persist a human-chosen architecture alternative as an auditable ADR. The template’s four binding fields are mandatory: what it binds, what divergence it prevents, what rule it introduces, what was rejected and why.

## When to use

- After human chose an alternative (post-`grill` / post-`council` / post-`error-cost-gate` skip path).
- Never before `error-cost-gate` has run for irreversible candidates.
- Never to draft speculative options — use `present-alternatives` for that.

## Inputs

| Input | Path / source |
|-------|----------------|
| Template | `plugins/architect/templates/architecture-decision.md` |
| Chosen alternative | Human-confirmed (session + grill/council artifacts) |
| Rejected set | From alternatives trail / council dissent |
| Related ids | Requirement ids, WP id, contract paths, NFR budgets |
| Gate | `error-cost-gate` result; council verdict if required |

## Template fields (all required for `accepted`)

Copy from `plugins/architect/templates/architecture-decision.md`:

1. **Context** — forces driving the decision.
2. **Decision** — what we choose.
3. **Divergence prevented** — incompatible paths this closes.
4. **Rule introduced** — normative statement implementers must follow.
5. **Consequences** — positive and negative.
6. **Rejected alternatives** — non-empty table: Option | Why rejected.
7. Frontmatter: `id`, `title`, `status`, `date`, `workPackageId`, `relatedRequirements`.
8. **Links** — platform contracts, NFR budgets.

## Steps

1. **Preflight gates**  
   - If `error-cost-gate` = `council-required`, require `architecture/.../council-verdict*` (or session-linked path) + recorded human choice. Else refuse.  
   - Confirm human choice is explicit (not inferred from silence).

2. **Mint id**  
   Scan `architecture/decisions/` for highest `ADR-NNN`; next id = `ADR-<NNN+1>` (zero-pad to 3). If folder missing, create it.

3. **Draft from template**  
   Write `architecture/decisions/<id>-<kebab-title>.md` by filling the template. Keep `status: proposed` until the completeness check passes.

4. **Completeness check — refuse incomplete** (WBS `4.8.2`)  
   Refuse to set `accepted` / finalize if any of:
   - `# Rejected alternatives` table empty or only placeholder rows.
   - `# Divergence prevented` empty.
   - `# Rule introduced` empty or non-normative (“consider…”, “try to…”).
   - `# Decision` empty.
   - Alternatives existed in the trail but none appear under Rejected.

   On refuse: leave file as `status: incomplete` (or delete draft if human prefers) and list **missing fields** in the reply. Do not invent fake rejected options.

5. **Link related artifacts**  
   Fill `relatedRequirements`, Links to `architecture/contracts/` (or platform-contract paths), NFR budget files. Decision must be referenceable from a tracker (path stable under `architecture/decisions/`).

6. **Human wording gate**  
   AskUserQuestion: confirm binding rule text + rejected table. On approve, set `status: accepted` and `date: YYYY-MM-DD`.

7. **Announce**  
   Return `id` + repo-relative path for handoff / Jira `attach-decision-link`.

## Human gates

| Gate | Required |
|------|----------|
| Choice of alternative | Yes — before drafting ADR body as accepted |
| Wording of rule + rejected list | Yes — before `status: accepted` |
| Council (when gate required) | Yes — prior skill |

## Done when

- File exists under `architecture/decisions/` with all four binding fields filled.
- `Rejected alternatives` has ≥1 real rejected option with reason (when ≥2 options were considered).  
  If only one conceivable option existed, document that explicitly under Rejected as `N/A — sole feasible option` **and** state why no alternative was viable; empty table still refuses.
- `status: accepted` only after human confirm.
- Path is stable for tracker links (WBS `4.8.1`).

## Failure modes

| Mode | Response |
|------|----------|
| Missing rejected alternatives | Refuse finalize; mark incomplete; list missing field |
| Soften rule to non-normative | Rewrite or refuse |
| Record before council when required | Refuse; point to `error-cost-gate` |
| Invent rejected options to pass check | **Forbidden** |
| Store outside `architecture/decisions/` without project convention override | Prefer convention; if project `.project` defines another root, use that and say so |
| Accept on silence | **Forbidden** — AskUserQuestion |
