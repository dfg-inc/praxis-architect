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

Jobs: `validate`, `governance`, `pack_zip`.

**Required GitLab setting:** on `praxis-ba` and `praxis-developer` → Settings → CI/CD → Job token permissions → allow inbound from `praxis-architect`.

## Release

Artifact `praxis-architect.zip` + `dist/zip-checksums.json`. Version independently of other products.
