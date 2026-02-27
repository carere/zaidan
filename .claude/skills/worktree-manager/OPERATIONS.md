# Worktree Operations Guide

Detailed step-by-step instructions for each worktree operation.

## CREATE

**When user wants to create a new worktree.**

### Step 1: Extract information

- **Branch name** (required): The git branch for the worktree
  - If not provided, ask the user
- **Base branch** (optional): The branch to create from (defaults to current branch)

### Step 2: Validate prerequisites

```bash
# Verify we're in a git repository
git rev-parse --git-dir

# Check if the branch exists (local or remote)
git branch -a | grep <branch-name>

# If branch doesn't exist, create it from the base branch
git branch <branch-name> <base-branch>
```

### Step 3: Create the worktree

```bash
# Ensure the trees/ directory exists
mkdir -p trees

# Create the worktree
git worktree add trees/<branch-name> <branch-name>
```

### Step 4: Copy environment files

```bash
# Copy .env from main project if it exists
if [ -f .env ]; then
  cp .env trees/<branch-name>/.env
fi

# Also copy .env.example if it exists and .env doesn't
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example trees/<branch-name>/.env
fi
```

### Step 5: Set up ports with setup-dev-env

Use the bundled `setup-dev-env.ts` script to allocate free ports for the worktree. The script lives at `.claude/skills/worktree-manager/scripts/setup-dev-env.ts` and resolves `.env` relative to `process.cwd()`.

**Important:** Always `cd` into the worktree directory first so the script writes to the correct `.env`:

```bash
cd trees/<branch-name>
bun .claude/skills/worktree-manager/scripts/setup-dev-env.ts --env-key APP_PORT
```

Run the script once per env key that requires a unique port:

```bash
# For projects with separate frontend/backend ports:
bun .claude/skills/worktree-manager/scripts/setup-dev-env.ts --env-key FRONTEND_PORT
bun .claude/skills/worktree-manager/scripts/setup-dev-env.ts --env-key BACKEND_PORT
```

After port allocation, update any URL-based env vars that depend on the port. Read the `.env` to get the allocated port, then update the related URL vars:

```bash
# Example: If APP_PORT was set to 3001, update related URLs
# FRONTEND_URL=http://localhost:3001
# BACKEND_URL=http://localhost:3001/api
```

Use the Edit tool to update these values in the worktree's `.env` file.

### Step 6: Install dependencies

```bash
cd trees/<branch-name> && bun install
```

### Step 7: Report results

Tell the user:
- Worktree location: `trees/<branch-name>/`
- Branch checked out
- Allocated ports (if setup-dev-env was used)
- Any URL env vars that were configured
- How to start development in the worktree

---

## LIST

**When user wants to see existing worktrees.**

### Step 1: List git worktrees

```bash
git worktree list
```

### Step 2: Enhance with details

For each worktree under `trees/`:
- Read its `.env` to show configured ports
- Check if `node_modules/` exists (deps installed)
- Show the branch name and last commit

```bash
# For each worktree in trees/
for dir in trees/*/; do
  echo "=== $(basename $dir) ==="
  echo "Path: $dir"
  echo "Branch: $(git -C $dir branch --show-current)"
  echo "Last commit: $(git -C $dir log -1 --oneline)"
  if [ -f "$dir/.env" ]; then
    echo "Ports:"
    grep -E "PORT|URL" "$dir/.env" || echo "  (no port config)"
  fi
  if [ -d "$dir/node_modules" ]; then
    echo "Dependencies: installed"
  else
    echo "Dependencies: NOT installed"
  fi
  echo ""
done
```

### Step 3: Present overview

Provide a clear summary showing:
- All worktrees with their branches
- Port configurations
- Dependency status
- Quick tips for management

---

## UPDATE

**When user wants to refresh an existing worktree.**

### Step 1: Identify the worktree

- **Branch name** (required): The worktree to update
  - If not provided, ask the user
  - Verify it exists under `trees/`

### Step 2: Pull latest changes

```bash
cd trees/<branch-name> && git pull
```

If there are merge conflicts, inform the user and help resolve them.

### Step 3: Reinstall dependencies

```bash
cd trees/<branch-name> && bun install
```

### Step 4: Re-run environment setup (if needed)

Only re-run the bundled `setup-dev-env.ts` if the user explicitly asks to reassign ports. Existing port assignments should be preserved by default.

```bash
cd trees/<branch-name>
bun .claude/skills/worktree-manager/scripts/setup-dev-env.ts --env-key APP_PORT
```

### Step 5: Report results

Tell the user:
- What was updated (commits pulled, deps installed)
- Any conflicts or issues encountered
- Current state of the worktree

---

## REMOVE

**When user wants to delete a worktree.**

### Step 1: Identify the worktree

- **Branch name** (required): The worktree to remove
  - If not provided, ask the user
  - Verify it exists under `trees/`

### Step 2: Check for uncommitted changes

```bash
cd trees/<branch-name> && git status --porcelain
```

If there are uncommitted changes, **warn the user** and ask for confirmation before proceeding.

### Step 3: Remove the worktree

```bash
# Remove via git (handles cleanup of .git/worktrees)
git worktree remove trees/<branch-name>
```

If it fails due to untracked files, ask the user if they want to force remove:

```bash
git worktree remove --force trees/<branch-name>
```

### Step 4: Prune stale worktree references

```bash
git worktree prune
```

### Step 5: Clean up empty trees/ directory

```bash
# Remove trees/ dir if empty
rmdir trees 2>/dev/null || true
```

### Step 6: Confirm removal

Tell the user:
- Worktree has been removed
- Branch still exists in git (removal doesn't delete the branch)
- Any cleanup actions performed
