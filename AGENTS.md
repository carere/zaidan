## Agent skills

### Issue tracker

Repository issues are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical engineering-workflow labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain layout. See `docs/agents/domain.md`.

### Workspace commands

Website and registry sources live in `apps/website`; the local factory lives in
`apps/factory`. Read the Development section of `README.md` before running build,
check, test, or deployment commands. Run Moon through
`direnv exec "$(git rev-parse --show-toplevel)" moon ...` so its configured environment
is available. Registry manifest source paths remain relative to `apps/website`.
