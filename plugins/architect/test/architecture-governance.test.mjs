import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { rmSync } from "node:fs";
import {
  assertRecordDecisionAllowed,
  classifyErrorCost,
  computeBuildPlan,
  decideDeviation,
  detectMissingPlatformContracts,
  evaluateConformance,
  normalizePlatformContract,
  persistArtifact,
  recordCouncilOutcome,
  submitDeviationRequest,
} from "../tools/lib/architecture-governance.mjs";

const dirs = [];
afterEach(() => {
  while (dirs.length) {
    const d = dirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tmp() {
  const d = mkdtempSync(join(tmpdir(), "arch-gov-"));
  dirs.push(d);
  return d;
}

const highFlags = {
  schemaOrApiWithExternalConsumers: true,
  reversibleInWorkPackage: false,
};

const lowFlags = {
  reversibleInWorkPackage: true,
  noSchemaSecurityOrCrossSystem: true,
  noProductionMigration: true,
  failureContainedInPackage: true,
  noHighSeverityIrreversibleLensFinding: true,
};

describe("error-cost (4.7)", () => {
  it("classifies high / irreversible as council-required", () => {
    const g = classifyErrorCost({
      workPackageId: "WP-1",
      decisionId: "ADR-001",
      flags: highFlags,
    });
    expect(g.result).toBe("council-required");
    expect(g.priceOfError).toBe("high");
  });

  it("classifies low as skip", () => {
    const g = classifyErrorCost({
      workPackageId: "WP-1",
      decisionId: "ADR-001",
      flags: lowFlags,
    });
    expect(g.result).toBe("skip");
    expect(g.priceOfError).toBe("low");
  });

  it("blocks record-decision when council is required and missing", () => {
    const gate = classifyErrorCost({
      workPackageId: "WP-1",
      decisionId: "ADR-001",
      flags: highFlags,
    });
    expect(() => assertRecordDecisionAllowed({ errorCost: gate })).toThrow(/blocked/);
  });

  it("allows record-decision for low risk without council", () => {
    const gate = classifyErrorCost({
      workPackageId: "WP-1",
      decisionId: "ADR-001",
      flags: lowFlags,
    });
    expect(assertRecordDecisionAllowed({ errorCost: gate }).ok).toBe(true);
  });
});

describe("council (4.6)", () => {
  it("records a machine-readable outcome with roles and options", () => {
    const c = recordCouncilOutcome({
      workPackageId: "WP-1",
      decisionId: "ADR-001",
      participants: [{ role: "reliability" }, { role: "security" }, { role: "delivery" }],
      options: [
        { id: "A", summary: "Keep monolith" },
        { id: "B", summary: "Extract service" },
      ],
      concerns: [{ role: "security", text: "new attack surface" }],
      outcome: "approved",
      humanApproval: { actor: "architect-human" },
    });
    expect(c.selfApproved).toBe(false);
    expect(c.humanApproval.actor).toBe("architect-human");
    expect(c.options).toHaveLength(2);
  });

  it("refuses silent self-approve", () => {
    expect(() =>
      recordCouncilOutcome({
        workPackageId: "WP-1",
        decisionId: "ADR-001",
        participants: [{ role: "reliability" }, { role: "security" }],
        options: [
          { id: "A", summary: "A" },
          { id: "B", summary: "B" },
        ],
        outcome: "approved",
      }),
    ).toThrow(/self-approve|humanApproval/);
  });
});

describe("platform contracts (4.9)", () => {
  it("normalizes required interface fields", () => {
    const pc = normalizePlatformContract({
      id: "PC-001",
      owner: "orders",
      consumers: ["web"],
      request: { method: "POST", path: "/orders" },
      response: { status: 201 },
      errors: { "400": "validation" },
      compatibility: { version: "1.0.0" },
      nfrRefs: ["NFR-1"],
    });
    expect(pc.id).toBe("PC-001");
    expect(pc.owner).toBe("orders");
  });

  it("detects missing required contracts without inventing them", () => {
    const dir = tmp();
    mkdirSync(join(dir, "contracts"), { recursive: true });
    persistArtifact(join(dir, "contracts/PC-001.json"), {
      id: "PC-001",
    });
    const r = detectMissingPlatformContracts(dir, ["PC-001", "PC-999"]);
    expect(r.present).toEqual(["PC-001"]);
    expect(r.missing).toEqual(["PC-999"]);
  });
});

describe("build plan (4.13)", () => {
  it("orders A before B when B depends on A and flags parallel independents", () => {
    const plan = computeBuildPlan([
      { id: "B", title: "B", estimateHours: 2, dependsOn: ["A"] },
      { id: "A", title: "A", estimateHours: 3, dependsOn: [] },
      { id: "C", title: "C", estimateHours: 1, dependsOn: [] },
    ]);
    expect(plan.order.indexOf("A")).toBeLessThan(plan.order.indexOf("B"));
    expect(plan.waves[0]).toEqual(["A", "C"]);
    expect(plan.parallelizableGroups[0]).toEqual(["A", "C"]);
    expect(plan.totalEstimateHours).toBe(6);
    const again = computeBuildPlan([
      { id: "C", title: "C", estimateHours: 1, dependsOn: [] },
      { id: "B", title: "B", estimateHours: 2, dependsOn: ["A"] },
      { id: "A", title: "A", estimateHours: 3, dependsOn: [] },
    ]);
    expect(again).toEqual(plan);
  });
});

describe("deviation (4.15)", () => {
  it("approves without mutating the original ADR bytes", () => {
    const dir = tmp();
    const adr = join(dir, "ADR-001.md");
    const bytes = "# ADR-001\nKeep postgres.\n";
    writeFileSync(adr, bytes);
    const req = submitDeviationRequest({
      workPackageId: "WP-1",
      affectedId: "ADR-001",
      requestedDeviation: "Use sqlite in tests",
      reason: "CI speed",
      impact: "test-only",
      evidence: "src/db.js",
      bindingChange: false,
    });
    const d = decideDeviation({
      request: req,
      outcome: "approved",
      actor: "architect-human",
      rationale: "test-only ok",
      originalDecisionBytes: bytes,
    });
    expect(d.outcome).toBe("approved");
    expect(d.requiresNewDecisionRecord).toBe(false);
    expect(readFileSync(adr, "utf8")).toBe(bytes);
  });

  it("rejects and requires a new decision id for binding changes", () => {
    const req = submitDeviationRequest({
      workPackageId: "WP-1",
      affectedId: "ADR-001",
      requestedDeviation: "Replace postgres",
      reason: "cost",
      impact: "high",
      evidence: "note",
      bindingChange: true,
    });
    const rejected = decideDeviation({
      request: req,
      outcome: "rejected",
      actor: "architect-human",
      rationale: "binding stays",
    });
    expect(rejected.outcome).toBe("rejected");
    expect(() =>
      decideDeviation({
        request: req,
        outcome: "approved",
        actor: "architect-human",
        rationale: "ok",
      }),
    ).toThrow(/newDecisionId/);
  });
});

describe("conformance (4.16)", () => {
  it("passes when implementation matches bindings", () => {
    const r = evaluateConformance({
      files: { "src/db.js": "engine: postgres" },
      bindings: [
        {
          id: "ADR-001",
          kind: "decision",
          checks: [{ type: "contains", file: "src/db.js", contains: "postgres" }],
        },
      ],
    });
    expect(r.verdict).toBe("conforming");
    expect(r.conforming.map((c) => c.id)).toEqual(["ADR-001"]);
  });

  it("fails with the exact id when unauthorized", () => {
    const r = evaluateConformance({
      files: { "src/db.js": "engine: sqlite" },
      bindings: [
        {
          id: "ADR-001",
          kind: "decision",
          checks: [{ type: "contains", file: "src/db.js", contains: "postgres" }],
        },
      ],
    });
    expect(r.verdict).toBe("non-conforming");
    expect(r.deviations.map((d) => d.id)).toEqual(["ADR-001"]);
  });

  it("does not treat an approved deviation as unauthorized", () => {
    const r = evaluateConformance({
      files: { "src/db.js": "engine: sqlite" },
      bindings: [
        {
          id: "ADR-001",
          kind: "decision",
          checks: [{ type: "contains", file: "src/db.js", contains: "postgres" }],
        },
      ],
      deviations: [{ id: "DEV-1-decision", affectedId: "ADR-001", outcome: "approved" }],
    });
    expect(r.verdict).toBe("conforming");
    expect(r.deviations).toEqual([]);
    expect(r.authorizedDeviations[0].id).toBe("ADR-001");
    expect(r.authorizedDeviations[0].deviationId).toBe("DEV-1-decision");
  });
});
