#!/usr/bin/env node
/** Thin session bootstrap for Architect (SDK consumer — WBS 0.7). */
import { bootstrapSession, formatSessionBootstrap } from "@praxis/plugin-sdk";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const repoRoot = flag("--repo") ?? process.cwd();
const pkg = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../package.json"),
    "utf8",
  ),
);
const boot = bootstrapSession({
  repoRoot,
  role: "architect",
  stage: flag("--stage") ?? "plan",
  pluginName: "praxis-architect",
  pluginVersion: pkg.version,
  latestVersion: flag("--latest"),
});
console.log(formatSessionBootstrap(boot));
if (boot.version && !boot.version.continueAllowed) process.exit(1);
