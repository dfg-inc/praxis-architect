/**
 * Deterministic Architecture governance (WBS 4.6 / 4.7 / 4.9 / 4.13 / 4.15 / 4.16).
 * Pure JSON artifacts — no LLM, no Jira, no network.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export const COUNCIL_OUTCOMES = [
  "approved",
  "approved-with-conditions",
  "rejected",
  "revise",
];

export const ERROR_COST_RESULTS = ["council-required", "council-optional", "skip"];

const MANDATORY_FLAGS = [
  "schemaOrApiWithExternalConsumers",
  "dataMigrationWithoutEasyRollback",
  "authTenancyOrSecurityBoundary",
  "multiServiceOrPlatformBoundary",
  "rollbackExceedsOneSprintOrIrreversibleData",
  "divergenceIrreversibleOrHighBlast",
];

const SKIP_FLAGS = [
  "reversibleInWorkPackage",
  "noSchemaSecurityOrCrossSystem",
  "noProductionMigration",
  "failureContainedInPackage",
  "noHighSeverityIrreversibleLensFinding",
];

function fail(msg) {
  throw new Error(msg);
}

function mustString(v, name) {
  if (typeof v !== "string" || !v.trim()) fail(`${name} is required`);
  return v.trim();
}

function writeJson(path, obj) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
  return obj;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** WBS 4.7 — explicit flags only (no LLM). */
export function classifyErrorCost(input) {
  const workPackageId = mustString(input?.workPackageId, "workPackageId");
  const decisionId = mustString(input?.decisionId ?? input?.candidateId, "decisionId");
  const flags = input?.flags && typeof input.flags === "object" ? input.flags : {};
  const mandatoryHit = MANDATORY_FLAGS.filter((k) => flags[k] === true);
  const skipOk = SKIP_FLAGS.every((k) => flags[k] === true);
  let result = "council-optional";
  let priceOfError = "medium";
  if (mandatoryHit.length > 0) {
    result = "council-required";
    priceOfError = "high";
  } else if (skipOk) {
    result = "skip";
    priceOfError = "low";
  }
  return {
    contract: "architect.error-cost.gate",
    version: "0.1.0",
    workPackageId,
    decisionId,
    result,
    priceOfError,
    mandatoryCriteria: mandatoryHit,
    flags,
  };
}

export function recordCouncilOutcome(input) {
  const workPackageId = mustString(input?.workPackageId, "workPackageId");
  const decisionId = mustString(input?.decisionId ?? input?.candidateId, "decisionId");
  const id = mustString(input?.id ?? `COUNCIL-${workPackageId}-${decisionId}`, "id");
  const outcome = input?.outcome;
  if (!COUNCIL_OUTCOMES.includes(outcome)) {
    fail(`council outcome must be one of ${COUNCIL_OUTCOMES.join("|")}`);
  }
  const participants = Array.isArray(input?.participants) ? input.participants : [];
  if (participants.length < 2) fail("council requires at least two participant roles");
  for (const p of participants) {
    if (!p?.role) fail("each participant needs a logical role (not a personal identity)");
  }
  const options = Array.isArray(input?.options) ? input.options : [];
  if (options.length < 2) fail("council requires at least two options considered");
  const concerns = Array.isArray(input?.concerns) ? input.concerns : [];
  const humanApproval = input?.humanApproval ?? {};
  const approved = outcome === "approved" || outcome === "approved-with-conditions";
  if (input?.selfApproved === true) {
    fail("council must not self-approve; humanApproval is required");
  }
  if (approved && !humanApproval.actor) {
    fail("approved council outcome requires humanApproval.actor (no silent self-approve)");
  }
  return {
    contract: "architect.council.outcome",
    version: "0.1.0",
    id,
    workPackageId,
    decisionId,
    participants: participants.map((p) => ({
      role: p.role,
      ...(p.name ? { name: p.name } : {}),
    })),
    options: options.map((o) => ({
      id: mustString(o.id, "option.id"),
      summary: mustString(o.summary, "option.summary"),
    })),
    concerns: concerns.map((c) => ({
      role: c.role ?? "unspecified",
      text: mustString(c.text, "concern.text"),
    })),
    outcome,
    conditions: Array.isArray(input?.conditions) ? input.conditions : [],
    humanApproval: {
      required: true,
      actor: humanApproval.actor,
      decision: humanApproval.decision ?? (approved ? "approved" : outcome),
    },
    selfApproved: false,
  };
}

/** Mechanical blocker for record-decision when council is required. */
export function assertRecordDecisionAllowed(opts) {
  const gate = opts?.errorCost;
  if (!gate || !ERROR_COST_RESULTS.includes(gate.result)) {
    fail("error-cost gate result is required before record-decision");
  }
  if (gate.result !== "council-required") {
    return { ok: true, reason: `council not mandatory (${gate.result})` };
  }
  const council = opts?.council;
  if (!council || council.contract !== "architect.council.outcome") {
    fail("council-required: record-decision blocked until a council outcome exists");
  }
  if (council.workPackageId !== gate.workPackageId || council.decisionId !== gate.decisionId) {
    fail("council outcome does not match the error-cost decision/work package");
  }
  if (council.outcome === "rejected" || council.outcome === "revise") {
    fail(`council-required: record-decision blocked (outcome ${council.outcome})`);
  }
  if (!council.humanApproval?.actor) {
    fail("council-required: record-decision blocked until human approval is recorded");
  }
  return { ok: true, reason: "council + human approval present" };
}

export function normalizePlatformContract(input) {
  const id = mustString(input?.id, "id");
  const owner = mustString(input?.owner ?? input?.provider, "owner/provider");
  const consumers = Array.isArray(input?.consumers) ? input.consumers.filter(Boolean) : [];
  if (consumers.length === 0) fail("platform contract requires at least one consumer");
  const request = input?.request ?? input?.input;
  const response = input?.response ?? input?.output;
  const errors = input?.errors ?? input?.failure;
  if (request == null || String(request).trim() === "") fail("platform contract missing request/input shape");
  if (response == null || String(response).trim() === "") fail("platform contract missing response/output shape");
  if (errors == null || String(errors).trim() === "") fail("platform contract missing failure/error behavior");
  const compatibility = input?.compatibility ?? {};
  const compatVersion = mustString(
    compatibility.version ?? input?.compatibilityVersion ?? input?.version,
    "compatibility version",
  );
  return {
    contract: "architect.platform.contract",
    version: "0.1.0",
    id,
    title: input?.title ?? id,
    owner,
    consumers,
    request,
    response,
    errors,
    compatibility: {
      version: compatVersion,
      policy: compatibility.policy ?? input?.compatibilityPolicy ?? "additive-with-deprecation",
    },
    nfrRefs: Array.isArray(input?.nfrRefs) ? input.nfrRefs : [],
    decisionIds: Array.isArray(input?.decisionIds) ? input.decisionIds : [],
  };
}

export function listPlatformContractIds(designDir) {
  const dir = join(designDir, "contracts");
  if (!existsSync(dir)) return [];
  const ids = [];
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = readJson(join(dir, name));
      if (raw?.id) ids.push(String(raw.id));
    } catch {
      /* skip unreadable */
    }
  }
  return ids;
}

export function detectMissingPlatformContracts(designDir, requiredIds = []) {
  const present = new Set(listPlatformContractIds(designDir));
  const missing = [...new Set(requiredIds.filter(Boolean))].filter((id) => !present.has(id));
  return { present: [...present].sort(), missing };
}

export function computeBuildPlan(unitsInput) {
  const units = Array.isArray(unitsInput) ? unitsInput : unitsInput?.units;
  if (!Array.isArray(units) || units.length === 0) fail("build plan requires units[]");
  const byId = new Map();
  for (const u of units) {
    const id = mustString(u.id, "unit.id");
    if (byId.has(id)) fail(`duplicate unit id ${id}`);
    const estimateHours = Number(u.estimateHours ?? 0);
    if (!Number.isFinite(estimateHours) || estimateHours < 0) {
      fail(`unit ${id} estimateHours must be a non-negative number`);
    }
    byId.set(id, {
      id,
      title: mustString(u.title ?? id, "unit.title"),
      estimateHours,
      dependsOn: [...new Set(Array.isArray(u.dependsOn) ? u.dependsOn : [])].sort(),
    });
  }
  const incoming = new Map();
  const outgoing = new Map();
  for (const u of byId.values()) {
    incoming.set(u.id, new Set());
    outgoing.set(u.id, new Set());
  }
  for (const u of byId.values()) {
    for (const dep of u.dependsOn) {
      if (!byId.has(dep)) fail(`unit ${u.id} depends on unknown ${dep}`);
      incoming.get(u.id).add(dep);
      outgoing.get(dep).add(u.id);
    }
  }
  const order = [];
  const waves = [];
  const remaining = new Set(byId.keys());
  while (remaining.size) {
    const wave = [...remaining]
      .filter((id) => incoming.get(id).size === 0)
      .sort((a, b) => a.localeCompare(b));
    if (wave.length === 0) {
      fail(`cyclic dependencies: ${[...remaining].sort().join(",")}`);
    }
    waves.push(wave);
    for (const id of wave) {
      order.push(id);
      remaining.delete(id);
      for (const nxt of outgoing.get(id)) {
        incoming.get(nxt).delete(id);
      }
    }
  }
  const totalEstimateHours = [...byId.values()].reduce((s, u) => s + u.estimateHours, 0);
  return {
    contract: "architect.build.plan",
    version: "0.1.0",
    units: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
    order,
    waves,
    parallelizableGroups: waves.filter((w) => w.length > 1),
    totalEstimateHours,
  };
}

export function submitDeviationRequest(input) {
  const workPackageId = mustString(input?.workPackageId, "workPackageId");
  const affected = mustString(
    input?.affectedId ?? input?.affectedDecision ?? input?.affectedContract,
    "affected decision/contract",
  );
  const requestedDeviation = mustString(input?.requestedDeviation, "requestedDeviation");
  const reason = mustString(input?.reason, "reason");
  const impact = mustString(input?.impact ?? input?.risk, "impact/risk");
  const evidence = mustString(input?.evidence ?? input?.reference, "evidence/reference");
  const id = mustString(input?.id ?? `DEV-${workPackageId}-${affected}`, "id");
  const kind = input?.kind === "contract" ? "contract" : "decision";
  return {
    contract: "architect.deviation.request",
    version: "0.1.0",
    id,
    status: "open",
    workPackageId,
    affectedId: affected,
    kind,
    requestedDeviation,
    reason,
    impact,
    evidence,
    bindingChange: input?.bindingChange === true,
  };
}

export function decideDeviation(opts) {
  const request = opts?.request;
  if (!request || request.contract !== "architect.deviation.request") {
    fail("decide-deviation requires a deviation request artifact");
  }
  const outcome = opts?.outcome;
  if (!["approved", "rejected", "revise"].includes(outcome)) {
    fail("deviation outcome must be approved|rejected|revise");
  }
  const actor = mustString(opts?.actor, "actor");
  const rationale = mustString(opts?.rationale, "rationale");
  const originalDecisionBytes = opts?.originalDecisionBytes;
  let requiresNewDecisionRecord = false;
  let newDecisionId;
  if (outcome === "approved" && request.bindingChange === true) {
    requiresNewDecisionRecord = true;
    newDecisionId = mustString(opts?.newDecisionId, "newDecisionId (explicit new ADR when binding changes)");
    if (newDecisionId === request.affectedId) {
      fail("new decision record must not silently reuse the original ADR id");
    }
  }
  return {
    contract: "architect.deviation.decision",
    version: "0.1.0",
    id: `${request.id}-decision`,
    requestId: request.id,
    workPackageId: request.workPackageId,
    affectedId: request.affectedId,
    kind: request.kind,
    outcome,
    actor,
    rationale,
    originalDecisionUnchanged: true,
    originalDecisionBytesPresent: typeof originalDecisionBytes === "string",
    requiresNewDecisionRecord,
    newDecisionId,
    status: outcome,
  };
}

function fileText(opts, rel) {
  if (opts?.files && Object.prototype.hasOwnProperty.call(opts.files, rel)) {
    return String(opts.files[rel]);
  }
  if (opts?.productRoot) {
    const p = join(opts.productRoot, rel);
    if (!existsSync(p)) return null;
    return readFileSync(p, "utf8");
  }
  return null;
}

export function evaluateConformance(opts) {
  const bindings = Array.isArray(opts?.bindings) ? opts.bindings : [];
  const deviations = Array.isArray(opts?.deviations) ? opts.deviations : [];
  const approved = new Map();
  for (const d of deviations) {
    if (d?.outcome === "approved" || d?.status === "approved") {
      approved.set(d.affectedId, d);
    }
  }
  const checked = [];
  const conforming = [];
  const unauthorized = [];
  const authorized = [];
  const unverifiable = [];

  for (const b of bindings) {
    const id = mustString(b.id, "binding.id");
    const kind = b.kind === "contract" ? "contract" : "decision";
    const checks = Array.isArray(b.checks) ? b.checks : [];
    if (checks.length === 0) {
      unverifiable.push({ id, kind, reason: "no machine checks" });
      checked.push(id);
      continue;
    }
    let anyFail = false;
    let anyUnverifiable = false;
    for (const c of checks) {
      if (c.type !== "contains" || !c.file || c.contains == null) {
        unverifiable.push({ id, kind, reason: `unsupported check ${c.type ?? "(none)"}` });
        anyUnverifiable = true;
        continue;
      }
      const text = fileText(opts, c.file);
      if (text == null) {
        unverifiable.push({ id, kind, file: c.file, reason: "file not found" });
        anyUnverifiable = true;
        continue;
      }
      if (!text.includes(String(c.contains))) {
        anyFail = true;
      }
    }
    checked.push(id);
    if (anyFail) {
      const rec = approved.get(id);
      if (rec) {
        authorized.push({
          id,
          kind,
          deviationId: rec.id ?? rec.requestId,
          requestId: rec.requestId,
        });
      } else {
        unauthorized.push({ id, kind });
      }
    } else if (!anyUnverifiable) {
      conforming.push({ id, kind });
    }
  }

  const verdict = unauthorized.length > 0 ? "non-conforming" : "conforming";
  return {
    contract: "architect.conformance.report",
    version: "0.1.0",
    checked,
    conforming,
    deviations: unauthorized,
    authorizedDeviations: authorized,
    unverifiable,
    verdict,
  };
}

/** WBS 4.1 — structured intake (no LLM). */
export function intakeAudit(input) {
  const items = Array.isArray(input?.requirements) ? input.requirements : [];
  const axes = { completeness: [], contradictions: [], feasibility: [] };
  for (const r of items) {
    const id = mustString(r?.id, "requirement.id");
    if (!r?.hasAcceptanceCriteria) {
      axes.completeness.push(`${id}: missing acceptance criteria`);
    }
    if (r?.feasible === false) {
      axes.feasibility.push(`${id}: ${r.feasibilityNote ?? "not feasible"}`);
    }
  }
  for (const pair of input?.contradictions ?? []) {
    axes.contradictions.push(
      `${pair.a} incompatible with ${pair.b}: ${pair.reason ?? "unspecified"}`,
    );
  }
  const returned = axes.contradictions.length > 0 || axes.feasibility.length > 0;
  const complete = axes.completeness.length === 0;
  return {
    contract: "architect.intake.audit",
    version: "0.1.0",
    workPackageId: mustString(input?.workPackageId, "workPackageId"),
    axes,
    accepted: complete && !returned,
    returnTo: returned ? "ba" : null,
  };
}

/** WBS 4.2 */
export function buildContextMap(input) {
  const platforms = Array.isArray(input?.platforms) ? input.platforms : [];
  if (!platforms.length) fail("platforms required");
  return {
    contract: "architect.context-map",
    version: "0.1.0",
    workPackageId: mustString(input?.workPackageId, "workPackageId"),
    platforms: platforms.map((p) => ({
      name: mustString(p.name, "platform.name"),
      decisions: (p.decisions ?? []).map((d) => ({
        id: mustString(d.id, "decision.id"),
        path: mustString(d.path, "decision.path"),
      })),
    })),
  };
}

/** WBS 4.3 */
export function findDivergencePoints(input) {
  const points = [];
  for (const ex of input?.exchanges ?? []) {
    if (!ex.formatFixed) {
      points.push({
        id: `DIV-${(points.length + 1).toString().padStart(3, "0")}`,
        systems: [ex.from, ex.to],
        consequence: "incompatible payloads / silent data loss",
        requiredDecision: `fix exchange format ${ex.from}↔${ex.to}`,
      });
    }
  }
  return {
    contract: "architect.divergence-points",
    version: "0.1.0",
    points,
  };
}

/** WBS 4.4 */
export function presentAlternatives(input) {
  const options = Array.isArray(input?.options) ? input.options : [];
  if (options.length < 2) fail("at least two alternatives required");
  return {
    contract: "architect.alternatives",
    version: "0.1.0",
    decisionId: mustString(input?.decisionId, "decisionId"),
    options: options.map((o) => ({
      id: mustString(o.id, "option.id"),
      cost: mustString(o.cost, "option.cost"),
      risks: mustString(o.risks, "option.risks"),
      operations: mustString(o.operations, "option.operations"),
    })),
  };
}

const LENSES = ["reliability", "security", "cost", "operations", "migration"];

/** WBS 4.5 */
export function lensReview(input) {
  const findings = {};
  for (const lens of LENSES) {
    const row = input?.lenses?.[lens];
    if (!row || typeof row.verdict !== "string") {
      fail(`lens ${lens} missing verdict`);
    }
    findings[lens] = {
      verdict: row.verdict,
      weakness: row.weakness ?? "",
    };
  }
  return {
    contract: "architect.lens-review",
    version: "0.1.0",
    optionId: mustString(input?.optionId, "optionId"),
    findings,
    weakLenses: LENSES.filter((l) => findings[l].weakness),
  };
}

/** WBS 4.8 */
export function normalizeArchitectureDecision(input) {
  const missing = [];
  if (!input?.bindingScope) missing.push("bindingScope");
  if (!input?.preventsDivergence) missing.push("preventsDivergence");
  if (!input?.ruleIntroduced) missing.push("ruleIntroduced");
  if (!input?.rejectedAlternatives) missing.push("rejectedAlternatives");
  if (missing.length) {
    return {
      contract: "architect.decision",
      version: "0.1.0",
      complete: false,
      missing,
    };
  }
  return {
    contract: "architect.decision",
    version: "0.1.0",
    id: mustString(input.id, "id"),
    complete: true,
    bindingScope: input.bindingScope,
    preventsDivergence: input.preventsDivergence,
    ruleIntroduced: input.ruleIntroduced,
    rejectedAlternatives: input.rejectedAlternatives,
  };
}

/** WBS 4.10 */
export function normalizeNfrBudget(input) {
  return {
    contract: "architect.nfr-budget",
    version: "0.1.0",
    metric: mustString(input?.metric, "metric"),
    limit: mustString(String(input?.limit ?? ""), "limit"),
    verifyHow: mustString(input?.verifyHow, "verifyHow"),
    verifyWhen: mustString(input?.verifyWhen, "verifyWhen"),
  };
}

export function persistArtifact(path, obj) {
  return writeJson(path, obj);
}

export function loadArtifact(path) {
  return readJson(path);
}

export { writeJson, readJson, dirname, join };
