import { join } from "node:path";

export const PLUGINS = [
  {
    id: "praxis-architect",
    title: "Praxis Architect",
    src: "plugins/architect",
    role: "architect",
    requiredSkills: [
      "plan-jira-epic",
      "resume-architecture",
      "materialize-work-package",
      "architecture-status",
    ],
    helpCommands: [
      ["architect", "--help"],
      ["architect", "preview", "--help"],
    ],
  },
];

export const PLUGIN_ZIP_FILES = PLUGINS.map((p) => `${p.id}.zip`);
export const MANIFEST_CONTRACT = "praxis.claude-plugins.manifest";

export function distClaudePluginsDir(root, version) {
  return join(root, "dist", "claude-plugins", version);
}

export function repoClaudePluginsDir(root) {
  return join(root, "claude-plugins");
}
