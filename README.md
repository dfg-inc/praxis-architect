# praxis-architect

Independent Praxis Architect Skills plugin. Distribution: **`praxis-architect.zip`**.

## Development

```bash
npm ci
# For architecture governance across roles (local):
export PRAXIS_BA_ROOT=/path/to/praxis-ba
export PRAXIS_DEVELOPER_ROOT=/path/to/praxis-developer
export PRAXIS_ARCHITECT_ROOT=$PWD
npm run verify
```

Governance **never packs raw `plugins/` trees** that still declare `file:vendor` deps. Missing sibling `dist/release-mirror` trees are auto-staged.

## CI

Jobs: `validate`, `governance`, `pack_zip`; on tag `v$version` → `publish_release`.

**Required GitLab setting:** on `praxis-ba` and `praxis-developer` → Settings → CI/CD → Job token permissions → allow inbound from `praxis-architect`.

## Release

Install from [GitLab Releases](https://gl.jetru.by/engineering/ai-tooling/praxis-architect/-/releases): `praxis-architect.zip` + `release-meta.json` (SHA-256, source SHA, compatibility). Tag pipeline publishes to Generic Package Registry. Version independently of other products.

