#!/usr/bin/env node
/**
 * Build machine-consumable architecture package from BA→Architect handoff
 * plus an explicit change-spec (no product-specific hardcoding).
 *
 * Usage:
 *   node plugins/architect/tools/build-architecture-package.mjs \
 *     --ba-handoff <path> --change-spec <path> \
 *     [--canon <canon-root>] [--out <design-dir>] [--product <product-root>]
 *
 * Interactive Architect workflow should prefer emit-developer-handoff.mjs
 * after writing design/<wp>/ + change-intent.json (same machine writers).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildArchitecturePackage } from "./lib/architecture-package.mjs";

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

try {
  const ba = JSON.parse(readFileSync(baHandoffPath, "utf8"));
  const rawSpec = JSON.parse(readFileSync(changeSpecIn, "utf8"));
  const result = buildArchitecturePackage({
    ba,
    rawSpec,
    outRoot,
    productHint,
    writeMarkdown: true,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        designDir: result.designDir,
        handoffPath: result.handoffPath,
        changeSpecPath: result.changeSpecPath,
        handoff: result.handoff,
      },
      null,
      2,
    ),
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

void fileURLToPath;
