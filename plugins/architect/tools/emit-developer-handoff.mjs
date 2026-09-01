#!/usr/bin/env node
/**
 * Emit Architect → Developer machine handoff from an interactive design package.
 *
 * Reads ba.architect.handoff + design/<wp>/ (context-slice.md required) and
 * change-intent.json (or existing change-spec), then writes:
 *   design/<wp>/change-spec.json
 *   design/<wp>/architect-developer.handoff.json
 *
 * Same writers as build-architecture-package.mjs — does not overwrite markdown.
 *
 * Usage:
 *   node <plugin>/tools/emit-developer-handoff.mjs \
 *     --ba-handoff <path> --design-dir <design/WP-…> \
 *     [--out <design-root>] [--product <product-root>] \
 *     [--change-spec <override-intent.json>]
 *
 * Or discover BA handoff:
 *   --canon <canon-root> --wp <WP-ID> --design-dir <…>
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { emitDeveloperHandoff } from "./lib/architecture-package.mjs";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const canon = flag("--canon") ? resolve(flag("--canon")) : undefined;
const wpId = flag("--wp");
let baHandoffPath = flag("--ba-handoff") ? resolve(flag("--ba-handoff")) : "";
if (!baHandoffPath && canon && wpId) {
  baHandoffPath = join(
    canon,
    "wp",
    wpId,
    "handoffs",
    "ba-architect.handoff.json",
  );
}

const designDir = resolve(flag("--design-dir") ?? "");
const outRoot = resolve(
  flag("--out") ?? (designDir ? dirname(designDir) : ""),
);
const productHint = flag("--product") ? resolve(flag("--product")) : undefined;
const changeSpecPath = flag("--change-spec")
  ? resolve(flag("--change-spec"))
  : undefined;

if (!baHandoffPath || !existsSync(baHandoffPath)) {
  console.error(
    "missing ba.architect.handoff — pass --ba-handoff or --canon + --wp " +
      "(expected wp/<id>/handoffs/ba-architect.handoff.json from BA approve-plan)",
  );
  process.exit(1);
}
if (!designDir || !existsSync(designDir)) {
  console.error("missing or invalid --design-dir <design/<workPackageId>>");
  process.exit(1);
}
if (!outRoot) {
  console.error("could not resolve --out (design root)");
  process.exit(1);
}

try {
  const ba = JSON.parse(readFileSync(baHandoffPath, "utf8"));
  const result = emitDeveloperHandoff({
    ba,
    designDir,
    outRoot,
    productHint,
    changeSpecPath,
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        designDir: result.designDir,
        source: result.source,
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
