---
model: opus
description: "Audit the registry AND apply fixes: add missing entries, remove orphans, fix dependency chains, rebuild registry."
argument-hint: "[--primitive=kobalte|base-ui]"
---

# Purpose

Run the `registry-manager` agent in update mode to audit the component registry, apply all fixes (add missing entries, remove orphans, fix dependency chains), rebuild the registry output, and commit the changes. This is the "fix it" counterpart to the read-only `/registry-audit` command.

## Variables

ARGUMENTS: $ARGUMENTS
PRIMITIVE: parsed from ARGUMENTS `--primitive=<value>` flag (default: `kobalte`)
MODE: `update` (constant -- this command always runs in update mode)

## Codebase Structure

```
src/registry/
  <PRIMITIVE>/
    registry.json         # The registry manifest to audit and fix
    ui/                   # Component files (*.tsx)
    blocks/               # Block composition files
    hooks/                # Custom hooks
    examples/             # Component usage examples
```

## Instructions

- This command **modifies files** -- it audits the registry and applies fixes
- Parse the `--primitive` flag from `$ARGUMENTS`. If not provided, default to `kobalte`
- Supported primitive values are `kobalte` and `base-ui`
- Delegate ALL audit and fix work to the `registry-manager` agent via the Task tool -- do not perform the work yourself
- Pass both `PRIMITIVE` and `MODE=update` to the agent so it applies fixes
- The registry-manager agent handles its own commits via the `git-github-ops` skill -- do NOT create a separate commit after the agent completes
- If the Task tool returns an error or the agent cannot find the registry, report the error clearly to the user
- After the agent completes, present a clear summary of what was fixed

## Workflow

1. **Parse arguments** -- Extract the `--primitive` flag value from `$ARGUMENTS`. If `$ARGUMENTS` is empty or does not contain `--primitive`, set PRIMITIVE to `kobalte`.

2. **Deploy registry-manager agent** -- Use the Task tool to deploy the `registry-manager` agent with the following prompt:

   ```
   Run a registry update with the following configuration:

   PRIMITIVE={PRIMITIVE}
   MODE=update

   Follow your full workflow: read the registry, discover files on disk, cross-reference registry vs filesystem, validate schema, validate registry dependencies, validate package dependencies. Then apply all fixes: add missing entries, remove orphaned entries, fix broken registryDependencies, add missing package dependencies. After all fixes, rebuild the registry with `bun run registry:build`, format with Biome, and commit the changes using the git-github-ops skill with a conventional commit message. Generate the complete report including the Actions Taken section.
   ```

   The agent file is located at `.claude/agents/registry-manager.md`.

3. **Present the update report** -- Once the agent completes, present the full report to the user. Now follow the `Report` section to format the output.

## Report

Present the update results to the user in the following format:

---

## Registry Update Report

**Primitive**: `{PRIMITIVE}`
**Mode**: update (audit + fix)

### Registry Health Summary (Before Fixes)

| Metric | Count |
|--------|-------|
| Total registry items | [count] |
| Total files on disk | [count] |
| Missing registry entries | [count] |
| Orphaned registry entries | [count] |
| Schema violations | [count] |
| Broken registryDependencies | [count] |
| Invalid package dependencies | [count] |
| Circular dependencies | [count] |

### Actions Taken

| Action | Target | Details |
|--------|--------|---------|
| [action type] | [target name] | [description of fix] |

[Include all actions from the registry-manager agent's report: entries added, entries removed, dependencies fixed, registry rebuild status, commit message]

### Rebuild Status

- Registry rebuild: [success/failure]
- Biome format: [success/failure]
- Commit: [commit message or "no changes needed"]

### Verdict

[If all checks passed with no fixes needed]: "Registry was already healthy. No changes made."

[If fixes were applied]: "[N] issues found and fixed. Changes committed as: `[commit message]`"

[If some issues could not be auto-fixed]: "[N] issues fixed, [M] issues require manual intervention: [list of manual issues]"

---

If the agent encountered an error (e.g., registry file not found, rebuild failed), report:

**Error**: [description of what went wrong]
**Suggestion**: [actionable next step for the user]
