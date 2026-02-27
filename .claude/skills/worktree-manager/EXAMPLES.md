# Worktree Usage Examples

Real-world examples demonstrating how to handle different worktree management scenarios.

## Example 1: Create a worktree for a feature branch

**User says:** "Create a worktree for the feature-auth branch"

**Your actions:**
1. Check if the `feature-auth` branch exists
2. Run `git worktree add trees/feature-auth feature-auth`
3. Copy `.env` from project root to `trees/feature-auth/.env`
4. Run the bundled `setup-dev-env.ts` to allocate ports
5. Run `bun install` in the worktree
6. Report the result

**Sample response:**
> Created worktree for `feature-auth`:
> - Location: `trees/feature-auth/`
> - APP_PORT: 3001
> - Dependencies installed
>
> To start development: `cd trees/feature-auth && bun dev`

---

## Example 2: Create a worktree from a new branch

**User says:** "Create a new worktree on a branch called fix/login-bug based on main"

**Your actions:**
1. Create the branch: `git branch fix/login-bug main`
2. Run `git worktree add trees/fix/login-bug fix/login-bug`
3. Copy `.env` and set up ports
4. Run `bun install`
5. Report the result

---

## Example 3: List all worktrees

**User says:** "What worktrees do I have?"

**Your actions:**
1. Run `git worktree list`
2. For each worktree in `trees/`, read `.env` and check deps status
3. Present a formatted overview

**Sample response:**
> You have 2 worktrees:
>
> 1. **feature-auth** (`trees/feature-auth/`)
>    - APP_PORT: 3001
>    - Dependencies: installed
>    - Last commit: `abc1234 feat: add auth middleware`
>
> 2. **fix/login-bug** (`trees/fix/login-bug/`)
>    - APP_PORT: 3002
>    - Dependencies: installed
>    - Last commit: `def5678 fix: handle null user`

---

## Example 4: Update a worktree

**User says:** "Update the feature-auth worktree"

**Your actions:**
1. `cd trees/feature-auth && git pull`
2. `bun install` (in case deps changed)
3. Report what was updated

**Sample response:**
> Updated `feature-auth` worktree:
> - Pulled 3 new commits
> - Dependencies reinstalled (lockfile changed)

---

## Example 5: Remove a worktree

**User says:** "Remove the fix/login-bug worktree"

**Your actions:**
1. Check for uncommitted changes in `trees/fix/login-bug/`
2. If clean, run `git worktree remove trees/fix/login-bug`
3. Run `git worktree prune`
4. Confirm removal

**Sample response:**
> Removed the `fix/login-bug` worktree. The branch still exists in git if you need it later.

---

## Example 6: Remove with uncommitted changes

**User says:** "Delete the feature-auth worktree"

**Your actions:**
1. Check for uncommitted changes — found modified files
2. Warn the user: "The worktree has uncommitted changes. Do you want to force remove?"
3. If confirmed, `git worktree remove --force trees/feature-auth`

---

## Example 7: Multiple worktrees at once

**User says:** "Create worktrees for feature-a, feature-b, and feature-c"

**Your actions:**
1. Create each sequentially (ports need to be allocated one at a time)
2. Each gets a unique port via the bundled `setup-dev-env.ts`
3. Run `bun install` in each
4. Present a summary of all three

---

## Pattern Recognition

### Create Keywords
- "create", "new", "setup", "make", "start", "initialize", "add"
- "I need a worktree for..."
- "Set up a parallel environment for..."

### List Keywords
- "list", "show", "display", "what", "which", "status", "check", "view"
- "What worktrees do I have?"
- "Show me my worktrees"

### Update Keywords
- "update", "refresh", "pull", "sync", "reinstall"
- "Pull the latest into my worktree"
- "Refresh the worktree"

### Remove Keywords
- "remove", "delete", "cleanup", "destroy", "stop", "kill", "terminate"
- "Clean up the...", "I don't need..."
- "Get rid of...", "Delete the..."
