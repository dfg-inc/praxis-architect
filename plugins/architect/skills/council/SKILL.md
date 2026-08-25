---
name: council
description: Run a multi-perspective council on irreversible architecture decisions before the human chooses (WBS 4.6). Advises only — human decides. Triggered by error-cost-gate or explicit request.
---

# Council

When a choice is hard to roll back, force **independent** viewpoints and cross-examination, then a compact verdict for the human. The council **advises**; the human **decides**. Never auto-commit an ADR from a council verdict alone.

## When to use

- `error-cost-gate` returned `council-required` (mandatory — cannot skip).
- `error-cost-gate` returned `council-optional` and human chose to run it.
- Human asks to “run a council” / stress-test a design fork.
- Schema, data migration, security boundary, or cross-system coupling choices (WBS `4.6.1`).

Do **not** run council for package-local reversible choices (`error-cost-gate` = `skip`) unless the human explicitly wants theater — prefer `grill` instead.

## Inputs

| Input | Source |
|-------|--------|
| Problem statement | One paragraph: decision forced, options (≥2), constraints |
| Front-runner (if any) | From alternatives / grill |
| Evidence | Context map, lens-review, contracts, risk notes |
| Gate artifact | `error-cost-gate` result path |

## Panel defaults

- **Size:** 3 members unless human asks for more.
- **Lenses:** reliability, security, delivery (or classic + architecture if unspecified).
- Name members explicitly in the verdict file (role labels are enough; full personas optional).

## Protocol

### Round 1 — Blind independent analysis

Each member sees **only** the problem packet + their lens. No peer text.

Each produces:
- Verdict (which option / conditional)
- Confidence (high/med/low)
- Where they may be wrong
- Top risk if their advice is ignored

Preferred orchestration: parallel subagents / forked contexts. If unavailable → **Fallback** below.

### Round 2 — Cross-examination

Share Round 1 outputs. Sequentially, each member:
1. Names the peer position they most disagree with and why.
2. Names one insight that strengthened them.
3. Restates position (changed or not).

### Round 3 — Final stance

Short restatement only (≤5 lines each). No new evidence dumps.

### Synthesis

Compact verdict for the human — **do not force consensus**:
- Options considered
- Majority lean (if any) vs dissent
- Recommended path + conditions
- Residual risks that survive any choice
- Explicit: “Council does not decide.”

## Fallback (single-session)

If multi-agent orchestration is unavailable:
1. Simulate rounds as clearly separated persona sections (`### Member: Reliability`, etc.).
2. Disclose at top: `orchestration: simulated-single-session`.
3. Keep blind Round 1 discipline (write all three analyses before cross-exam edits).

## Steps (operational)

1. Confirm `error-cost-gate` status; if somehow `skip`, ask human whether to proceed anyway.
2. Write problem packet to:

   `design/<workPackageId>/council/<slug>-problem.md`

   (or `architecture/audits/<workPackageId>-council-<slug>-problem.md` if design folder not yet created).

3. Run Rounds 1–3 per protocol.
4. Write verdict:

   `design/<workPackageId>/council/<slug>-verdict.md`

   Required structure:
   - `## Verdict` first (human-readable, ≤20 lines)
   - `## Dissent`
   - `## Residual risks`
   - `## Recommended path`
   - Appendix: round notes (optional / collapsible)

5. **Human gate (required)** — AskUserQuestion with the verdict and the concrete options. Wait for explicit choice (option id / hybrid / reject-all).
6. Record human choice on the verdict file under `## Human decision` (date + choice + rationale if given).
7. Hand off to `record-decision` with chosen + rejected sets. Do not write the ADR inside this skill.

## Human gates

**Always required.** Present verdict; ask the human to choose. Silence ≠ consent. Council recommendation is not an ADR.

## Done when

- Verdict file exists with Verdict-first layout + human decision section filled.
- Independent positions were produced (or fallback disclosed).
- Human choice recorded; `record-decision` may run next.
- No ADR auto-written from synthesis alone.

## Failure modes

| Mode | Response |
|------|----------|
| Skipping council when `council-required` | **Forbidden** — `error-cost-gate` wins |
| Fake consensus wiping dissent | Restore dissent section; do not erase minority |
| Auto-accepting recommended path | **Forbidden** — human gate |
| Single undifferentiated essay as “council” | Invalid — separate member sections or re-run |
| Recording ADR inside council skill | Stop; invoke `record-decision` |
| Running council with only one option | Return to `present-alternatives` first |
