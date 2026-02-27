# Pull Request Workflows

This document describes common PR workflows and best practices when using the git-github-ops skill.

## Creating Pull Requests

### Basic PR Creation

```bash
# Interactive mode - guided process
gh pr create

# With explicit title
gh pr create --title "Add user authentication" --body ""

# Auto-generate from commits
gh pr create --fill
```

### Draft Pull Requests

Draft PRs are useful when:
- Work is still in progress
- You want early feedback before completion
- Running CI checks before marking ready

```bash
# Create draft PR
gh pr create \
  --title "WIP: Implement payment processing" \
  --body "" \
  --draft

# Later, mark ready via GitHub UI or:
gh pr ready <pr-number>
```

### Specifying Base Branch

By default, PRs target the default branch (main/master). To target a different branch:

```bash
# Target develop branch
gh pr create \
  --title "Feature for next release" \
  --body "" \
  --base develop

# Target release branch
gh pr create \
  --title "Hotfix for v2.1" \
  --body "" \
  --base release/2.1
```

## Complete Workflows

### Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/user-profile

# 2. Make changes and commit
git commit -m "feat(users): add profile page"

# 3. Push to remote
git push -u origin $(git rev-parse --abbrev-ref HEAD)

# 4. Create PR
gh pr create \
  --title "feat(users): add profile page" \
  --fill
```

### Bug Fix Workflow

```bash
# 1. Create fix branch
git checkout -b fix/login-timeout

# 2. Fix and commit
git commit -m "fix: resolve login timeout issue" -m "Fixes #123"

# 3. Push and create PR
git push -u origin $(git rev-parse --abbrev-ref HEAD)
gh pr create --fill
```

### Review and Merge Workflow

```bash
# 1. Review the PR (on reviewer's machine)
gh pr checkout 456
# ... review code ...

# 2. Approve
gh pr review 456 --approve --body "Looks great! Tested locally."

# 3. Merge
gh pr merge 456 --squash --delete-branch
```

### Hotfix Workflow

```bash
# 1. Create hotfix from production branch
git checkout main
git checkout -b hotfix/security-patch

# 2. Apply fix
git commit -m "fix: patch XSS vulnerability" -m "Security: CVE-2024-1234"

# 3. Create PR to main (expedited review)
git push -u origin $(git rev-parse --abbrev-ref HEAD)
gh pr create \
  --title "HOTFIX: Security patch for XSS vulnerability" \
  --body "" \
  --base main

# 4. After merge, also merge to develop
git checkout develop
git merge main
git push origin develop
```

## Merge Strategies

### Squash Merge (Recommended)

Combines all commits into one. Best for:
- Feature branches with many WIP commits
- Keeping main branch history clean
- Most common default choice

```bash
gh pr merge 123 --squash
```

### Merge Commit

Creates a merge commit preserving all history. Best for:
- Release branches
- When individual commit history matters
- Large features with meaningful commits

```bash
gh pr merge 123 --merge
```

### Rebase Merge

Rebases commits onto base branch. Best for:
- Linear history preference
- Small, focused PRs
- When you want commits without merge commits

```bash
gh pr merge 123 --rebase
```

## Branch Management

### Auto-Delete Branches

Clean up merged branches automatically:

```bash
gh pr merge 123 --squash --delete-branch
```

### Manual Cleanup

```bash
# Delete local branch
git branch -d feature/old-feature

# Delete remote branch
git push origin --delete feature/old-feature

# Prune stale remote-tracking references
git fetch --prune
```

## PR Description Best Practices

### Structure

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Added user profile page
- Implemented avatar upload
- Added profile settings

## Testing
- [ ] Unit tests pass
- [ ] Manual testing completed
- [ ] Edge cases covered

## Screenshots (if applicable)
![Screenshot description](url)

## Related Issues
Closes #123
Refs #456
```

### Auto-Generated Descriptions

The `--fill` flag generates descriptions from commits:

```bash
gh pr create --fill
```

This creates a description with:
- List of commits
- Suggested test plan
- Base branch information

## Handling Common Scenarios

### PR Already Exists

If you try to create a PR for a branch that already has one:

```
A PR already exists for this branch: https://github.com/owner/repo/pull/123
```

Update the existing PR by pushing more commits.

### Conflicts

If there are merge conflicts:

```bash
# Update your branch with latest base
git fetch origin
git rebase origin/main

# Resolve conflicts
# ... fix conflicts ...
git add .
git rebase --continue

# Force push updated branch
git push --force origin $(git rev-parse --abbrev-ref HEAD)
```

### Failed CI Checks

If CI checks fail:

1. Review the failure logs
2. Fix the issues locally
3. Commit the fix:
   ```bash
   git commit -m "fix: address CI feedback"
   ```
4. Push:
   ```bash
   git push -u origin $(git rev-parse --abbrev-ref HEAD)
   ```

### Stale PR

If your PR is behind the base branch:

```bash
# Rebase onto latest base
git fetch origin
git rebase origin/main

# Force push
git push --force origin $(git rev-parse --abbrev-ref HEAD)
```

## Team Collaboration

### Requesting Reviews

After creating a PR, request reviews via GitHub:

```bash
gh pr edit 123 --add-reviewer alice,bob
```

### Adding Co-Authors

Include co-authors in commit messages:

```bash
git commit -m "feat: implement feature" -m "Co-authored-by: Alice <alice@example.com>"
```

### PR Discussions

Comment on PRs:

```bash
gh pr comment 123 --body "Great approach! One suggestion..."
```

## Automation Tips

### Scripting Workflows

Chain operations:

```bash
# Commit, push, and create PR
git commit -m "feat: add feature" && \
git push -u origin $(git rev-parse --abbrev-ref HEAD) && \
gh pr create --fill
```
