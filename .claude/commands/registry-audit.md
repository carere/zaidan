---
model: opus
description: "Run a read-only audit of the registry. Checks for missing entries, orphaned files, invalid dependencies, and schema violations."
argument-hint: "[--primitive=kobalte|base-ui]"
---

# Purpose

Run the `registry-manager` agent in audit (read-only) mode to analyze the current state of the component registry. Reports missing entries, orphaned files, invalid dependencies, schema violations, and dependency issues without modifying any files.

## Variables

ARGUMENTS: $ARGUMENTS
PRIMITIVE: parsed from ARGUMENTS `--primitive=<value>` flag (default: `kobalte`)
MODE: `audit` (constant -- this command always runs in audit mode)

## Codebase Structure

```
src/registry/
  <PRIMITIVE>/
    registry.json         # The registry manifest to audit
    ui/                   # Component files (*.tsx)
    blocks/               # Block composition files
    hooks/                # Custom hooks
    examples/
      <REGISTRY>/         # Component usage examples per registry
```

## Instructions

- This is a **read-only** command -- it MUST NOT modify any files
- Parse the `--primitive` flag from `$ARGUMENTS`. If not provided, default to `kobalte`
- Supported primitive values are `kobalte` and `base-ui`
- Delegate ALL audit work to the `registry-manager` agent via the Task tool -- do not perform the audit yourself
- Pass both `PRIMITIVE` and `MODE=audit` to the agent so it operates correctly
- If the Task tool returns an error or the agent cannot find the registry, report the error clearly to the user
- Do not attempt to fix any issues found -- that is the job of the `/registry-update` command

## Workflow

1. **Parse arguments** -- Extract the `--primitive` flag value from `$ARGUMENTS`. If `$ARGUMENTS` is empty or does not contain `--primitive`, set PRIMITIVE to `kobalte`.

2. **Deploy registry-manager agent** -- Use the Task tool to deploy the `registry-manager` agent with the following prompt:

   ```
   Run a registry audit with the following configuration:

   PRIMITIVE={PRIMITIVE}
   MODE=audit

   Follow your full workflow: read the registry, discover files on disk, cross-reference registry vs filesystem, validate schema, validate registry dependencies, validate package dependencies, and generate the complete audit report. Do NOT modify any files.
   ```

   The agent file is located at `.claude/agents/registry-manager.md`.

3. **Present the audit report** -- Once the agent completes, present the full audit report to the user. Now follow the `Report` section to format the output.

## Report

Present the audit results to the user in the following format:

---

## Registry Audit Report

**Primitive**: `{PRIMITIVE}`
**Mode**: audit (read-only)

### Registry Health Summary

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

### Detailed Findings

[Include all detailed finding tables from the registry-manager agent's report: missing entries, orphaned entries, schema violations, broken dependencies, invalid package dependencies, and circular dependencies]

### Verdict

[If all checks pass]: "Registry is healthy. No issues found."

[If issues found]: "Registry has [total count] issues. Run `/registry-update` to apply fixes automatically."

---

If the agent encountered an error (e.g., registry file not found), report:

**Error**: [description of what went wrong]
**Suggestion**: [actionable next step for the user]
