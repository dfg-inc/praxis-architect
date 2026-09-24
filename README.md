# praxis-architect

Independent Praxis Architect Skills plugin. Distribution: **`praxis-architect.zip`**.

## Clone / develop

```bash
git clone https://github.com/dfg-inc/praxis-architect.git
cd praxis-architect
npm ci
# Optional: sibling checkouts for cross-role governance
export PRAXIS_BA_ROOT=/path/to/praxis-ba
export PRAXIS_DEVELOPER_ROOT=/path/to/praxis-developer
export PRAXIS_ARCHITECT_ROOT=$PWD
npm run verify
```

Governance uses pack-safe staged mirrors (never raw `file:vendor` plugin trees). CI checks out public sibling `dfg-inc` repositories — no private job tokens.

## Install

[Releases](https://github.com/dfg-inc/praxis-architect/releases): `praxis-architect.zip` + `release-meta.json`.

## Release

Tag `v$version` → GitHub Actions publishes the ZIP to a GitHub Release. Version independently of other products.
