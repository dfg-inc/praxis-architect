#!/usr/bin/env node
/**
 * Packed Architect governance CLI (WBS 4.6–4.16).
 * Usage: node tools/architecture-governance.mjs <verb> [flags]
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertRecordDecisionAllowed,
  classifyErrorCost,
  computeBuildPlan,
  decideDeviation,
  detectMissingPlatformContracts,
  evaluateConformance,
  listPlatformContractIds,
  loadArtifact,
  normalizeArchitectureDecision,
  normalizeNfrBudget,
  normalizePlatformContract,
  persistArtifact,
  presentAlternatives,
  recordCouncilOutcome,
  submitDeviationRequest,
  intakeAudit,
  buildContextMap,
  findDivergencePoints,
  lensReview,
} from "./lib/architecture-governance.mjs";

const args = process.argv.slice(2);
const verb = args[0];
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function loadIn() {
  const p = flag("--in");
  if (!p) fail("--in <json> is required");
  return JSON.parse(readFileSync(resolve(p), "utf8"));
}

function maybeOut(obj) {
  const out = flag("--out");
  if (out) persistArtifact(resolve(out), obj);
  console.log(JSON.stringify(obj, null, 2));
}

if (!verb) {
  fail(
    "usage: architecture-governance.mjs <classify-error-cost|record-council|assert-record-decision|write-platform-contract|list-platform-contracts|detect-missing-contracts|build-plan|submit-deviation|decide-deviation|conformance|intake-audit|context-map|divergence-points|alternatives|lens-review|record-decision|nfr-budget>",
  );
}

try {
  if (verb === "classify-error-cost") {
    maybeOut(classifyErrorCost(loadIn()));
  } else if (verb === "record-council") {
    maybeOut(recordCouncilOutcome(loadIn()));
  } else if (verb === "assert-record-decision") {
    const errorCost = loadArtifact(resolve(flag("--error-cost") ?? ""));
    const councilPath = flag("--council");
    const council = councilPath && existsSync(resolve(councilPath))
      ? loadArtifact(resolve(councilPath))
      : undefined;
    const r = assertRecordDecisionAllowed({ errorCost, council });
    console.log(JSON.stringify({ ok: true, ...r }, null, 2));
  } else if (verb === "write-platform-contract") {
    maybeOut(normalizePlatformContract(loadIn()));
  } else if (verb === "list-platform-contracts") {
    const designDir = resolve(flag("--design-dir") ?? "");
    console.log(JSON.stringify({ ids: listPlatformContractIds(designDir) }, null, 2));
  } else if (verb === "detect-missing-contracts") {
    const designDir = resolve(flag("--design-dir") ?? "");
    const required = (flag("--required") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const r = detectMissingPlatformContracts(designDir, required);
    console.log(JSON.stringify(r, null, 2));
    if (r.missing.length) process.exit(1);
  } else if (verb === "build-plan") {
    const raw = loadIn();
    maybeOut(computeBuildPlan(raw.units ?? raw));
  } else if (verb === "submit-deviation") {
    maybeOut(submitDeviationRequest(loadIn()));
  } else if (verb === "decide-deviation") {
    const request = loadArtifact(resolve(flag("--request") ?? ""));
    const adrPath = flag("--adr");
    const originalDecisionBytes = adrPath && existsSync(resolve(adrPath))
      ? readFileSync(resolve(adrPath), "utf8")
      : undefined;
    const decision = decideDeviation({
      request,
      outcome: flag("--outcome"),
      actor: flag("--actor"),
      rationale: flag("--rationale"),
      newDecisionId: flag("--new-decision-id"),
      originalDecisionBytes,
    });
    const out = flag("--out");
    if (out) persistArtifact(resolve(out), decision);
    if (adrPath && originalDecisionBytes !== undefined) {
      const after = readFileSync(resolve(adrPath), "utf8");
      if (after !== originalDecisionBytes) fail("original ADR was mutated");
    }
    console.log(JSON.stringify(decision, null, 2));
  } else if (verb === "conformance") {
    maybeOut(evaluateConformance(loadIn()));
  } else if (verb === "intake-audit") {
    maybeOut(intakeAudit(loadIn()));
  } else if (verb === "context-map") {
    maybeOut(buildContextMap(loadIn()));
  } else if (verb === "divergence-points") {
    maybeOut(findDivergencePoints(loadIn()));
  } else if (verb === "alternatives") {
    maybeOut(presentAlternatives(loadIn()));
  } else if (verb === "lens-review") {
    maybeOut(lensReview(loadIn()));
  } else if (verb === "record-decision") {
    maybeOut(normalizeArchitectureDecision(loadIn()));
  } else if (verb === "nfr-budget") {
    maybeOut(normalizeNfrBudget(loadIn()));
  } else {
    fail(`unknown verb ${verb}`);
  }
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
