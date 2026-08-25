#!/usr/bin/env node
/**
 * Build machine-consumable architecture package from BA→Architect handoff
 * plus an explicit change-spec (no product-specific hardcoding).
 *
 * Usage:
 *   node plugins/architect/tools/build-architecture-package.mjs \
 *     --ba-handoff <path> --change-spec <path> \
 *     [--canon <canon-root>] [--out <design-dir>] [--product <product-root>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const baHandoffPath = resolve(flag("--ba-handoff") ?? "");
const changeSpecIn = resolve(flag("--change-spec") ?? "");
const canon = resolve(flag("--canon") ?? dirname(baHandoffPath));
const outRoot = resolve(flag("--out") ?? join(canon, "design"));
const productHint = flag("--product") ? resolve(flag("--product")) : undefined;

if (!baHandoffPath || !existsSync(baHandoffPath)) {
  console.error("missing or invalid --ba-handoff");
  process.exit(1);
}
if (!changeSpecIn || !existsSync(changeSpecIn)) {
  console.error(
    "missing or invalid --change-spec <path> (machine patch + features; required for any product)",
  );
  process.exit(1);
}

const ba = JSON.parse(readFileSync(baHandoffPath, "utf8"));
if (ba.contract !== "ba.architect.handoff") {
  console.error(`unexpected contract: ${ba.contract}`);
  process.exit(1);
}
if (!ba.visionConfirmed) {
  console.error("vision not confirmed — refuse architecture package");
  process.exit(1);
}
const failed = (ba.readinessChecks ?? []).filter((c) => !c.passed);
if (failed.length) {
  console.error(`readiness failed: ${failed.map((c) => c.id).join(",")}`);
  process.exit(1);
}

const rawSpec = JSON.parse(readFileSync(changeSpecIn, "utf8"));
if (!Array.isArray(rawSpec.changes) || rawSpec.changes.length === 0) {
  console.error("change-spec.changes must be a non-empty array");
  process.exit(1);
}
if (!Array.isArray(rawSpec.features) || rawSpec.features.length === 0) {
  console.error("change-spec.features must be a non-empty array");
  process.exit(1);
}
for (const f of rawSpec.features) {
  if (!f.id || !f.title || f.readyForDev !== true) {
    console.error("each feature needs id, title, readyForDev:true");
    process.exit(1);
  }
}

const wpId = ba.workPackageId;
const designDir = join(outRoot, wpId);
mkdirSync(designDir, { recursive: true });

const adrId = rawSpec.decisionIds?.[0] ?? `ADR-${wpId}`;
const designMeta = rawSpec.design ?? {};
const title =
  designMeta.title ??
  rawSpec.features.map((f) => f.title).join("; ");

const adrPath = join(designDir, `${adrId}.md`);
writeFileSync(
  adrPath,
  `# ${adrId}

## Context

BA work package ${wpId} delivers ${ba.requirementIds.join(", ")}.

## Decision

${designMeta.decision ?? title}

## Consequences

Developer applies change-spec; Quality verifies acceptanceChecks + handoff.
`,
);

const inScope = (designMeta.contextInScope ?? rawSpec.changes.map((c) => c.file))
  .map((x) => `- ${x}`)
  .join("\n");

const contextSlicePath = join(designDir, "context-slice.md");
writeFileSync(
  contextSlicePath,
  `# Context slice — ${wpId}

## In scope

${inScope}
- Requirements: ${ba.requirementIds.join(", ")}

## Out of scope

${(designMeta.outOfScope ?? ["Unrelated product surfaces"]).map((x) => `- ${x}`).join("\n")}
`,
);

const designPackagePath = join(designDir, "design-package.md");
const featureRows = rawSpec.features
  .map((f) => `| ${f.id} | ${f.title} | ${f.readyForDev ? "yes" : "no"} |`)
  .join("\n");
writeFileSync(
  designPackagePath,
  `# Design package — ${wpId}

## Features

| ID | Title | Ready |
|---|---|---|
${featureRows}

## Decisions

- ${adrId}

## Change intent

${designMeta.changeIntent ?? rawSpec.changes.map((c) => c.description).join("; ")}
`,
);

const changeSpec = {
  workPackageId: wpId,
  requirementIds: rawSpec.requirementIds ?? ba.requirementIds,
  decisionIds: rawSpec.decisionIds ?? [adrId],
  productRootHint: productHint
    ? relative(designDir, productHint).split("\\").join("/")
    : (rawSpec.productRootHint ?? "../product"),
  researchGlobs: rawSpec.researchGlobs ?? ["src/**/*.js", "lib/**/*.js", "test/**/*.js"],
  changes: rawSpec.changes,
  acceptanceChecks: rawSpec.acceptanceChecks ?? [],
  features: rawSpec.features,
  design: designMeta,
};
const changeSpecPath = join(designDir, "change-spec.json");
writeFileSync(changeSpecPath, JSON.stringify(changeSpec, null, 2) + "\n");

const handoff = {
  contract: "architect.developer.handoff",
  version: "0.1.0",
  workPackageId: wpId,
  designPackagePath: relative(outRoot, designDir).split("\\").join("/") + "/",
  contextSlicePath: relative(outRoot, contextSlicePath).split("\\").join("/"),
  decisionIds: changeSpec.decisionIds,
  features: changeSpec.features,
};
const handoffPath = join(designDir, "architect-developer.handoff.json");
writeFileSync(handoffPath, JSON.stringify(handoff, null, 2) + "\n");

console.log(
  JSON.stringify(
    {
      ok: true,
      designDir,
      handoffPath,
      changeSpecPath,
      handoff,
    },
    null,
    2,
  ),
);
