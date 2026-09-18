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
import { listPlatformContractIds, detectMissingPlatformContracts } from "./architecture-governance.mjs";

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
 *   estimateHours?: number,
 *   dependsOn?: string[]
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

  const normalizedChanges = spec.changes.map((c, i) => {
    if (!c?.file) throw new Error(`changes[${i}] missing file`);
    const op =
      c.op ??
      (c.content !== undefined || c.write !== undefined ? "create" : "edit");
    if (op === "create") {
      const content = c.content ?? c.write;
      if (content === undefined) {
        throw new Error(
          `changes[${i}] (${c.file}): create requires content (or legacy write)`,
        );
      }
      return {
        file: c.file,
        description: c.description,
        op: "create",
        content,
      };
    }
    if (c.match === undefined || c.replace === undefined) {
      throw new Error(
        `changes[${i}] (${c.file}): edit requires match and replace`,
      );
    }
    return {
      file: c.file,
      description: c.description,
      op: "edit",
      match: c.match,
      replace: c.replace,
    };
  });

  const wpId = ba.workPackageId;
  const fromDesign = listDecisionIds(opts.designDir);
  const adrId = spec.decisionIds?.[0] ?? fromDesign[0] ?? `ADR-${wpId}`;
  const designMeta = { ...(spec.design ?? {}) };
  if (!designMeta.title && spec.features[0]?.title) {
    designMeta.title = spec.features[0].title;
  }
  const productHint = opts.productHint;

  const changeSpec = {
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
    changes: normalizedChanges,
    acceptanceChecks: normalizeAcceptanceChecks(
      spec.acceptanceChecks,
      normalizedChanges,
    ),
    features: spec.features,
    design: designMeta,
    requiredMachineFiles: spec.requiredMachineFiles,
    verificationPolicy: {
      requireTests:
        spec.verificationPolicy?.requireTests ??
        inferRequireTests(normalizedChanges, spec.acceptanceChecks),
      requireBuild: spec.verificationPolicy?.requireBuild ?? false,
      requireLint: spec.verificationPolicy?.requireLint ?? false,
    },
  };

  assertMachineCompleteness(changeSpec, opts.designDir);
  return changeSpec;
}

function inferRequireTests(changes, acceptanceChecks) {
  if (
    Array.isArray(acceptanceChecks) &&
    acceptanceChecks.some((c) => c?.type === "npm-test")
  ) {
    return true;
  }
  return changes.some(
    (c) =>
      /(^|\/)test\//.test(c.file) ||
      /\.test\.(js|mjs|cjs|ts)$/.test(c.file) ||
      c.file === "package.json",
  );
}

function normalizeAcceptanceChecks(raw, changes) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((c) => {
      if (c?.type === "npm-test") return { type: "npm-test" };
      if (c?.file && c?.contains) {
        return { type: "contains", file: c.file, contains: c.contains };
      }
      throw new Error(
        "acceptanceChecks entries need {file,contains} or {type:'npm-test'}",
      );
    });
  }
  // Default: substring checks from edits + npm-test when test artifacts present
  const checks = changes
    .filter((c) => c.op === "edit" && c.replace)
    .map((c) => ({
      type: "contains",
      file: c.file,
      contains: c.replace,
    }));
  if (inferRequireTests(changes, raw)) {
    checks.push({ type: "npm-test" });
  }
  return checks;
}

/**
 * Extract paths the design package declares as **machine-required** work.
 * In-slice / contextInScope alone is read-scope — not every path must be patched.
 * Completeness keys off:
 *   - change-spec.requiredMachineFiles
 *   - design.machineRequirements / change-intent.requiredMachineFiles
 *   - markdown `## Machine requirements` section
 */
export function collectRequiredMachineFiles(designDir, changeSpec) {
  const required = new Set();
  for (const f of changeSpec.requiredMachineFiles ?? []) {
    if (typeof f === "string" && f.trim()) required.add(normalizeRelPath(f));
  }
  for (const x of changeSpec.design?.machineRequirements ?? []) {
    for (const p of extractPathsFromText(String(x))) required.add(p);
  }
  if (!designDir || !existsSync(designDir)) return [...required];

  for (const name of ["index.md", "context-slice.md", "design-package.md", "change-intent.json"]) {
    const p = join(designDir, name);
    if (!existsSync(p)) continue;
    if (name.endsWith(".json")) {
      try {
        const j = JSON.parse(readFileSync(p, "utf8"));
        for (const f of j.requiredMachineFiles ?? []) {
          if (typeof f === "string") required.add(normalizeRelPath(f));
        }
        for (const x of j.design?.machineRequirements ?? []) {
          for (const path of extractPathsFromText(String(x))) required.add(path);
        }
      } catch {
        /* ignore */
      }
      continue;
    }
    const body = readFileSync(p, "utf8");
    const section = body.match(
      /##\s*Machine requirements\b([\s\S]*?)(?=\n##\s|\n?$)/i,
    )?.[1];
    if (section) {
      for (const path of extractPathsFromText(section)) required.add(path);
    }
  }
  return [...required];
}

function normalizeRelPath(p) {
  return p
    .trim()
    .replace(/^`+|`+$/g, "")
    .replace(/^\.\//, "")
    .split("\\")
    .join("/");
}

function extractPathsFromText(text) {
  const out = new Set();
  // Backtick paths and plain path-looking tokens with a slash or known roots
  for (const m of text.matchAll(
    /`((?:src|lib|test|scripts|tools)\/[^`\s]+|package\.json|[^\s`]+\.(?:js|mjs|cjs|ts|json))`/g,
  )) {
    out.add(normalizeRelPath(m[1]));
  }
  for (const m of text.matchAll(
    /(?<![`\w])((?:src|lib|test|scripts)\/[\w./-]+\.(?:js|mjs|cjs|ts|json)|package\.json)(?![`\w])/g,
  )) {
    out.add(normalizeRelPath(m[1]));
  }
  return [...out];
}

/**
 * Refuse readyForDev machine emit when design requires files not covered by changes.
 */
export function assertMachineCompleteness(changeSpec, designDir) {
  const covered = new Set(changeSpec.changes.map((c) => normalizeRelPath(c.file)));
  const required = collectRequiredMachineFiles(designDir, changeSpec);
  const missing = required.filter((f) => !covered.has(f));
  if (missing.length) {
    throw new Error(
      `change-spec incomplete for readyForDev: design requires [${missing.join(", ")}] ` +
        `but changes only cover [${[...covered].join(", ")}]. ` +
        "Add edit/create operations for every required machine file.",
    );
  }
  // Any create/edit must be well-formed (already normalized).
  if (!changeSpec.features.every((f) => f.readyForDev === true)) {
    throw new Error("cannot emit: not all features readyForDev:true");
  }
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

  const platformContractIds = listPlatformContractIds(designDir);
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
  if (platformContractIds.length) handoff.platformContractIds = platformContractIds;
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
    const nfrLines = (designMeta.nfrBudgets ?? []).length
      ? designMeta.nfrBudgets.map((x) => `- ${x}`).join("\n")
      : "None";
    const contractLines = (designMeta.contracts ?? []).length
      ? designMeta.contracts.map((x) => `- ${x}`).join("\n")
      : "None";
    writeFileSync(
      contextSlicePath,
      `# Context slice — ${ba.workPackageId}

## In slice

### Decisions
${(changeSpec.decisionIds ?? []).map((id) => `- ${id}`).join("\n") || "None"}

### Contracts
${contractLines}

### NFR budgets
${nfrLines}

### Must-read
${inScope}

## Out of slice

${(designMeta.outOfScope ?? ["Unrelated product surfaces"]).map((x) => `- ${x}`).join("\n")}

## Non-negotiables

- Apply change-spec only within allowed scope.

## Open items

None
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
  const required = changeSpec.design?.requiredContracts ?? [];
  if (Array.isArray(required) && required.length) {
    const { missing } = detectMissingPlatformContracts(designDir, required);
    if (missing.length) {
      throw new Error(
        `missing required platform contracts: ${missing.join(", ")} (will not invent them)`,
      );
    }
  }
  const machine = writeMachineArtifacts(designDir, outRoot, { ba, changeSpec });
  return { designDir, source, ...machine };
}

export { dirname };
