/**
 * Shared architecture package writers for interactive and automated paths.
 * No product-specific hardcoding — change patches come from change-intent /
 * change-spec inputs derived from BA scope + Architect decisions.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

/**
 * @typedef {{
 *   contract: string,
 *   version?: string,
 *   workPackageId: string,
 *   workPackagePath?: string,
 *   requirementIds: string[],
 *   visionConfirmed: boolean,
 *   readinessChecks?: Array<{ id: string, passed: boolean, detail?: string }>
 * }} BaHandoff
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   readyForDev: boolean,
 *   estimateHours?: number
 * }} Feature
 */

/**
 * @typedef {{
 *   file: string,
 *   description?: string,
 *   match?: string,
 *   replace?: string,
 *   write?: string
 * }} Change
 */

/**
 * @param {BaHandoff} ba
 */
export function validateBaHandoff(ba) {
  if (!ba || ba.contract !== "ba.architect.handoff") {
    throw new Error(`unexpected contract: ${ba?.contract ?? "(missing)"}`);
  }
  if (!ba.workPackageId) throw new Error("ba handoff missing workPackageId");
  if (!Array.isArray(ba.requirementIds) || ba.requirementIds.length === 0) {
    throw new Error("ba handoff requires non-empty requirementIds");
  }
  if (!ba.visionConfirmed) {
    throw new Error("vision not confirmed — refuse architecture package");
  }
  const failed = (ba.readinessChecks ?? []).filter((c) => !c.passed);
  if (failed.length) {
    throw new Error(`readiness failed: ${failed.map((c) => c.id).join(",")}`);
  }
}

/**
 * @param {unknown} rawSpec
 * @param {BaHandoff} ba
 * @param {{ productHint?: string, designDir?: string }} [opts]
 */
export function normalizeChangeSpec(rawSpec, ba, opts = {}) {
  if (!rawSpec || typeof rawSpec !== "object") {
    throw new Error("change-spec must be an object");
  }
  /** @type {Record<string, any>} */
  const spec = rawSpec;
  if (!Array.isArray(spec.changes) || spec.changes.length === 0) {
    throw new Error("change-spec.changes must be a non-empty array");
  }
  if (!Array.isArray(spec.features) || spec.features.length === 0) {
    throw new Error("change-spec.features must be a non-empty array");
  }
  for (const f of spec.features) {
    if (!f?.id || !f?.title || f.readyForDev !== true) {
      throw new Error("each feature needs id, title, readyForDev:true");
    }
  }

  const wpId = ba.workPackageId;
  const fromDesign = listDecisionIds(opts.designDir);
  const adrId = spec.decisionIds?.[0] ?? fromDesign[0] ?? `ADR-${wpId}`;
  const designMeta = spec.design ?? {};
  const productHint = opts.productHint;

  return {
    workPackageId: wpId,
    requirementIds: spec.requirementIds ?? ba.requirementIds,
    decisionIds: spec.decisionIds?.length
      ? spec.decisionIds
      : fromDesign.length
        ? fromDesign
        : [adrId],
    productRootHint: productHint
      ? relative(opts.designDir ?? ".", productHint).split("\\").join("/")
      : (spec.productRootHint ?? "../product"),
    researchGlobs: spec.researchGlobs ?? [
      "src/**/*.js",
      "lib/**/*.js",
      "test/**/*.js",
    ],
    changes: spec.changes,
    acceptanceChecks: spec.acceptanceChecks ?? [],
    features: spec.features,
    design: designMeta,
  };
}

/**
 * Discover ADR ids from design package markdown / ADR files.
 * @param {string | undefined} designDir
 * @returns {string[]}
 */
export function listDecisionIds(designDir) {
  if (!designDir || !existsSync(designDir)) return [];
  const ids = new Set();
  const decisionsMd = join(designDir, "decisions.md");
  if (existsSync(decisionsMd)) {
    const body = readFileSync(decisionsMd, "utf8");
    for (const m of body.matchAll(/\b(ADR-[A-Z0-9][\w-]*)\b/g)) ids.add(m[1]);
  }
  const slice = join(designDir, "context-slice.md");
  if (existsSync(slice)) {
    const body = readFileSync(slice, "utf8");
    for (const m of body.matchAll(/\b(ADR-[A-Z0-9][\w-]*)\b/g)) ids.add(m[1]);
    const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fm) {
      const arr = fm[1].match(/decisionIds:\s*\[([^\]]*)\]/);
      if (arr) {
        for (const m of arr[1].matchAll(/ADR-[A-Z0-9][\w-]*/g)) ids.add(m[0]);
      }
    }
  }
  for (const name of readdirSync(designDir)) {
    const m = name.match(/^(ADR-[A-Z0-9][\w-]*)\.md$/i);
    if (m) ids.add(m[1]);
  }
  return [...ids];
}

/**
 * Load machine change intent from design dir or explicit path.
 * Prefers change-intent.json (interactive), then change-spec.json, then override.
 *
 * @param {{
 *   ba: BaHandoff,
 *   designDir: string,
 *   changeSpecPath?: string,
 *   productHint?: string,
 * }} opts
 */
export function loadOrDeriveChangeSpec(opts) {
  const { ba, designDir, changeSpecPath, productHint } = opts;
  const candidates = [
    changeSpecPath,
    join(designDir, "change-intent.json"),
    join(designDir, "change-spec.json"),
  ].filter(Boolean);

  let raw = null;
  let source = null;
  for (const p of candidates) {
    if (p && existsSync(p)) {
      raw = JSON.parse(readFileSync(p, "utf8"));
      source = p;
      break;
    }
  }
  if (!raw) {
    throw new Error(
      `missing change-intent.json (or change-spec) under ${designDir}. ` +
        "Architect must write design/<wp>/change-intent.json before emitting developer handoff.",
    );
  }

  // Ensure features readyForDev when intent marks them; fill from BA if omitted.
  if (!Array.isArray(raw.features) || raw.features.length === 0) {
    raw.features = (ba.requirementIds ?? []).map((id) => ({
      id: `FEAT-${id}`,
      title: `Deliver ${id}`,
      readyForDev: true,
    }));
  } else {
    raw.features = raw.features.map((f) => ({
      ...f,
      readyForDev: f.readyForDev !== false,
    }));
  }

  if (!Array.isArray(raw.decisionIds) || raw.decisionIds.length === 0) {
    const fromDesign = listDecisionIds(designDir);
    if (fromDesign.length) raw.decisionIds = fromDesign;
  }

  if (!Array.isArray(raw.requirementIds) || raw.requirementIds.length === 0) {
    raw.requirementIds = ba.requirementIds;
  }

  // Derive acceptanceChecks from BA ACs when intent omits them but names files.
  if (
    (!Array.isArray(raw.acceptanceChecks) || raw.acceptanceChecks.length === 0) &&
    Array.isArray(raw.changes)
  ) {
    raw.acceptanceChecks = raw.changes
      .filter((c) => c.replace || c.write)
      .map((c) => ({
        file: c.file,
        contains: c.replace ?? String(c.write ?? "").slice(0, 80),
      }))
      .filter((c) => c.contains);
  }

  const changeSpec = normalizeChangeSpec(raw, ba, { productHint, designDir });
  return { changeSpec, source };
}

/**
 * Write only machine artifacts (change-spec + architect.developer.handoff).
 * Preserves existing interactive markdown.
 *
 * @param {string} designDir
 * @param {string} outRoot  parent of design/<wp> (usually …/design)
 * @param {{ ba: BaHandoff, changeSpec: Record<string, any> }} opts
 */
export function writeMachineArtifacts(designDir, outRoot, opts) {
  const { ba, changeSpec } = opts;
  mkdirSync(designDir, { recursive: true });

  const contextSliceRel = existsSync(join(designDir, "context-slice.md"))
    ? relative(outRoot, join(designDir, "context-slice.md")).split("\\").join("/")
    : relative(outRoot, join(designDir, "context-slice.md")).split("\\").join("/");

  const changeSpecPath = join(designDir, "change-spec.json");
  writeFileSync(changeSpecPath, `${JSON.stringify(changeSpec, null, 2)}\n`);

  const handoff = {
    contract: "architect.developer.handoff",
    version: "0.1.0",
    workPackageId: ba.workPackageId,
    designPackagePath:
      relative(outRoot, designDir).split("\\").join("/").replace(/\/?$/, "/") ,
    contextSlicePath: contextSliceRel,
    decisionIds: changeSpec.decisionIds,
    features: changeSpec.features,
  };
  const handoffPath = join(designDir, "architect-developer.handoff.json");
  writeFileSync(handoffPath, `${JSON.stringify(handoff, null, 2)}\n`);

  return { changeSpecPath, handoffPath, handoff, changeSpec };
}

/**
 * Optional markdown scaffold used by the automated build-architecture-package path.
 */
export function writeMarkdownScaffold(designDir, opts) {
  const { ba, changeSpec } = opts;
  const adrId = changeSpec.decisionIds?.[0] ?? `ADR-${ba.workPackageId}`;
  const designMeta = changeSpec.design ?? {};
  const title =
    designMeta.title ?? changeSpec.features.map((f) => f.title).join("; ");

  mkdirSync(designDir, { recursive: true });

  const adrPath = join(designDir, `${adrId}.md`);
  if (!existsSync(adrPath)) {
    writeFileSync(
      adrPath,
      `# ${adrId}

## Context

BA work package ${ba.workPackageId} delivers ${ba.requirementIds.join(", ")}.

## Decision

${designMeta.decision ?? title}

## Consequences

Developer applies change-spec; Quality verifies acceptanceChecks + handoff.
`,
    );
  }

  const inScope = (designMeta.contextInScope ?? changeSpec.changes.map((c) => c.file))
    .map((x) => `- ${x}`)
    .join("\n");

  const contextSlicePath = join(designDir, "context-slice.md");
  if (!existsSync(contextSlicePath)) {
    writeFileSync(
      contextSlicePath,
      `# Context slice — ${ba.workPackageId}

## In slice

${inScope}
- Requirements: ${ba.requirementIds.join(", ")}

## Out of slice

${(designMeta.outOfScope ?? ["Unrelated product surfaces"]).map((x) => `- ${x}`).join("\n")}

## Non-negotiables

- Apply change-spec only within allowed scope.
`,
    );
  }

  const designPackagePath = join(designDir, "design-package.md");
  if (!existsSync(designPackagePath)) {
    const featureRows = changeSpec.features
      .map((f) => `| ${f.id} | ${f.title} | ${f.readyForDev ? "yes" : "no"} |`)
      .join("\n");
    writeFileSync(
      designPackagePath,
      `# Design package — ${ba.workPackageId}

## Features

| ID | Title | Ready |
|---|---|---|
${featureRows}

## Decisions

- ${adrId}

## Change intent

${designMeta.changeIntent ?? changeSpec.changes.map((c) => c.description).join("; ")}
`,
    );
  }

  const indexPath = join(designDir, "index.md");
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      `# Design package — ${ba.workPackageId}

## Purpose

${title}

## In scope

${inScope}

## Out of scope

${(designMeta.outOfScope ?? ["Unrelated product surfaces"]).map((x) => `- ${x}`).join("\n")}
`,
    );
  }

  return { adrPath, contextSlicePath, designPackagePath };
}

/**
 * Full automated package build (smoke/e2e).
 */
export function buildArchitecturePackage(opts) {
  const {
    ba,
    rawSpec,
    outRoot,
    productHint,
    writeMarkdown = true,
  } = opts;
  validateBaHandoff(ba);
  const wpId = ba.workPackageId;
  const designDir = join(outRoot, wpId);
  mkdirSync(designDir, { recursive: true });
  const changeSpec = normalizeChangeSpec(rawSpec, ba, { productHint, designDir });
  if (writeMarkdown) writeMarkdownScaffold(designDir, { ba, changeSpec });
  const machine = writeMachineArtifacts(designDir, outRoot, { ba, changeSpec });
  return { designDir, ...machine };
}

/**
 * Interactive / workflow emit: BA handoff + existing design dir → machine files.
 */
export function emitDeveloperHandoff(opts) {
  const { ba, designDir, outRoot, productHint, changeSpecPath } = opts;
  validateBaHandoff(ba);
  if (!existsSync(designDir)) {
    throw new Error(`design package missing: ${designDir}`);
  }
  const slice = join(designDir, "context-slice.md");
  if (!existsSync(slice)) {
    throw new Error(`context-slice.md missing in ${designDir}`);
  }
  const { changeSpec, source } = loadOrDeriveChangeSpec({
    ba,
    designDir,
    changeSpecPath,
    productHint,
  });
  const machine = writeMachineArtifacts(designDir, outRoot, { ba, changeSpec });
  return { designDir, source, ...machine };
}

export { dirname };
