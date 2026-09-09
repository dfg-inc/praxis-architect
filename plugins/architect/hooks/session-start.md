# Session-start hook (Architect)

At the beginning of an Architect session, run the bootstrap script so role/stage
rules and `.project` status are visible before other skills:

```
node ${CLAUDE_PLUGIN_ROOT}/tools/session-bootstrap.mjs [repo-root]
```

Positional repo root wins over CWD. `--repo` is accepted when no positional is given. Optional `--stage` (default `plan`).

Equivalent skill: `session-start`. Role `architect`, stage `plan` by default.
Uses shared `@praxis/plugin-sdk.bootstrapSession()` (bundled into
`session-bootstrap.cjs` in release artifacts). Does not invent a Knowledge path
when `knowledge.path` is unset.
