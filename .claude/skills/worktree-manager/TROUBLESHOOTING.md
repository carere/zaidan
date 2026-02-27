# Worktree Troubleshooting Guide

Common issues and their solutions when managing worktrees.

## Issue 1: Branch already checked out

### Symptom
```
fatal: 'feature-auth' is already checked out at '/path/to/project'
```

### Cause
Git does not allow the same branch to be checked out in multiple worktrees.

### Solution
- If the main project has this branch checked out, switch to another branch first
- If another worktree has it, remove that worktree first or use a different branch

---

## Issue 2: Worktree directory already exists

### Symptom
```
fatal: 'trees/feature-auth' already exists
```

### Cause
A previous worktree wasn't properly cleaned up, or the directory was created manually.

### Solution
1. Check if git knows about it: `git worktree list`
2. If it's a stale reference: `git worktree prune` then retry
3. If directory is orphaned: remove it manually then retry
   ```bash
   rm -rf trees/feature-auth
   git worktree prune
   ```

---

## Issue 3: Dependencies fail to install

### Symptom
`bun install` fails in the worktree.

### Cause
- Corrupted lockfile
- Platform-specific native modules
- Disk space issues

### Solution
1. Try removing `node_modules` and reinstalling:
   ```bash
   rm -rf trees/<branch>/node_modules
   cd trees/<branch> && bun install
   ```
2. Check disk space: `df -h`
3. Verify bun is up to date: `bun --version`

---

## Issue 4: Port conflicts

### Symptom
Dev server fails to start because the port is already in use.

### Cause
Another worktree or process is using the same port.

### Solution
1. Re-run the bundled `setup-dev-env.ts` to allocate a new free port:
   ```bash
   cd trees/<branch>
   bun .claude/skills/worktree-manager/scripts/setup-dev-env.ts --env-key APP_PORT
   ```
2. Check what's using the port: `lsof -i :<port>`
3. Kill the conflicting process if needed

---

## Issue 5: Can't remove worktree

### Symptom
`git worktree remove` fails.

### Cause
- Uncommitted or untracked files in the worktree
- Processes still running from the worktree directory

### Solution
1. Check for changes: `git -C trees/<branch> status`
2. Force remove if safe: `git worktree remove --force trees/<branch>`
3. If still stuck, manual cleanup:
   ```bash
   rm -rf trees/<branch>
   git worktree prune
   ```

---

## Issue 6: Missing .env in worktree

### Symptom
Application errors about missing environment variables.

### Cause
The `.env` file wasn't copied during creation.

### Solution
1. Copy from project root: `cp .env trees/<branch>/.env`
2. Re-run port allocation:
   ```bash
   cd trees/<branch>
   bun .claude/skills/worktree-manager/scripts/setup-dev-env.ts --env-key APP_PORT
   ```

---

## Issue 7: Worktree shows in git but directory is missing

### Symptom
`git worktree list` shows a worktree but the directory doesn't exist.

### Cause
Directory was manually deleted without using `git worktree remove`.

### Solution
```bash
git worktree prune
```

---

## General Debugging Approach

When a user reports any issue:

1. **Gather information**
   - Run `git worktree list` to see git's view
   - Check `ls trees/` to see what directories exist
   - Ask which specific worktree has the issue

2. **Diagnose**
   - Compare git's worktree list with actual directories
   - Check `.env` configuration
   - Verify `node_modules` exists

3. **Resolve**
   - Use the appropriate fix from above
   - Verify the fix worked

4. **Prevent**
   - Always use this skill's operations (not manual git commands)
   - Regularly list worktrees to catch stale references
   - Remove worktrees when done with them
