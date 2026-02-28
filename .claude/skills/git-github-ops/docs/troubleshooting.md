# Troubleshooting Guide

This guide covers common issues and solutions when using the git-github-ops skill.

## Authentication Issues

### GitHub CLI Not Authenticated

**Symptom:**
```
Not authenticated with GitHub CLI.
Authenticate with: gh auth login
```

**Solution:**
```bash
# Check current auth status
gh auth status

# Authenticate with GitHub
gh auth login

# Follow the prompts to complete authentication
```

**Options during authentication:**
- HTTPS (recommended) or SSH
- Web browser (recommended) or token
- Select scopes (repo, workflow, etc.)

### Token Expired

**Symptom:**
```
HTTP 401: Bad credentials
```

**Solution:**
```bash
# Refresh authentication
gh auth refresh

# Or re-authenticate
gh auth logout
gh auth login
```

### SSH Key Issues

**Symptom:**
```
Permission denied (publickey)
```

**Solution:**
```bash
# Check SSH key is loaded
ssh-add -l

# Add SSH key if not loaded
ssh-add ~/.ssh/id_ed25519

# Test GitHub connection
ssh -T git@github.com

# Configure git to use SSH
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

## Git Repository Issues

### Not a Git Repository

**Symptom:**
```
Not a git repository.
Run this command from within a git repository.
```

**Solution:**
```bash
# Initialize a new repository
git init

# Or navigate to existing repository
cd /path/to/your/repo
```

### No Remote Configured

**Symptom:**
```
No 'origin' remote configured.
Add a remote with 'git remote add origin <url>'.
```

**Solution:**
```bash
# Add remote
git remote add origin https://github.com/owner/repo.git

# Or for SSH
git remote add origin git@github.com:owner/repo.git

# Verify
git remote -v
```

### Detached HEAD State

**Symptom:**
```
Failed to get current branch.
Ensure you are in a git repository with at least one commit.
```

**Solution:**
```bash
# Check current state
git status

# Create and checkout a branch
git checkout -b main

# Or checkout existing branch
git checkout main
```

## Commit Issues

### No Changes to Commit

**Symptom:**
```
No changes to commit.
Stage your changes with 'git add'.
```

**Solution:**
```bash
# Check status
git status

# Stage specific files
git add path/to/file

# Stage all changes
git add -A
```

### Pre-commit Hook Failure

**Symptom:**
```
Commit blocked by pre-commit hook:
[error output from hooks]
```

**Solutions:**

1. **Fix the issues** (recommended):
   - Read the hook output
   - Address linting/formatting issues
   - Re-run commit

2. **Skip hooks** (use sparingly):
   ```bash
   git commit -m "fix: urgent fix" --no-verify
   ```

3. **Check hook configuration**:
   ```bash
   # List hooks
   ls -la .git/hooks/

   # View specific hook
   cat .git/hooks/pre-commit
   ```

### Invalid Commit Message

**Symptom:**
```
Invalid commit message format.
Expected format: <type>[optional scope]: <description>
```

**Solution:**
Use git commit interactively or with -m flag:
```bash
git commit
```

Or ensure message follows format:
```bash
git commit -m "feat(api): add user endpoint"
```

## Push Issues

### Push Rejected (Non-Fast-Forward)

**Symptom:**
```
Push rejected: remote contains work you don't have locally.
Pull the latest changes first.
```

**Solution:**

1. **Rebase onto latest** (preferred):
   ```bash
   git fetch origin
   git rebase origin/main

   # Then push (force if rebased)
   git push --force origin $(git rev-parse --abbrev-ref HEAD)
   ```

2. **Merge remote changes**:
   ```bash
   git pull origin <branch>
   git push -u origin $(git rev-parse --abbrev-ref HEAD)
   ```

### Branch Behind Remote

**Symptom:**
```
Branch is 3 commits behind remote. Pull first or use --force.
```

**Solution:**
```bash
# Option 1: Rebase (preferred for feature branches)
git fetch origin
git rebase origin/main
git push --force origin $(git rev-parse --abbrev-ref HEAD)

# Option 2: Merge
git pull origin <branch>
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

### No Upstream Branch

**Symptom:**
```
Branch 'feature/new' has no upstream branch.
```

**Solution:**
The push command automatically sets upstream:
```bash
git push -u origin $(git rev-parse --abbrev-ref HEAD)
```

Or manually:
```bash
git push -u origin feature/new
```

## Pull Request Issues

### PR Already Exists

**Symptom:**
```
A PR already exists for this branch: https://github.com/...
```

**This is informational.** Push more commits to update the existing PR:
```bash
git push origin $(git rev-parse --abbrev-ref HEAD)
```

### No Commits Between Branches

**Symptom:**
```
No commits between base branch and current branch.
Make sure you have commits to include in the PR.
```

**Solution:**
```bash
# Check commit history
git log origin/main..HEAD

# If empty, you need to make commits first
git add -A && git commit -m "feat: your feature description"
```

### PR Not Found

**Symptom:**
```
Pull request #123 not found.
```

**Solution:**
- Verify PR number is correct
- Check if PR was closed/merged
- Ensure you have access to the repository

### Cannot Approve Own PR

**Symptom:**
```
Not authorized to approve this PR.
You cannot approve your own PR.
```

**This is expected behavior.** Ask a team member to approve.

### Merge Blocked

**Symptom:**
```
Cannot merge PR #123: Merge is blocked by branch protection rules
```

**Solutions:**
- Ensure required reviews are approved
- Wait for CI checks to pass
- Request review from required reviewers
- Check branch protection settings

### Merge Conflicts

**Symptom:**
```
Cannot merge: merge conflicts exist.
Resolve conflicts before merging.
```

**Solution:**
```bash
# Update your branch
git fetch origin
git checkout feature/your-branch
git rebase origin/main

# Resolve conflicts in each file
# ... edit files to resolve conflicts ...

# Mark as resolved and continue
git add <resolved-files>
git rebase --continue

# Force push the updated branch
git push --force origin $(git rev-parse --abbrev-ref HEAD)
```

## Network Issues

### Connection Timeout

**Symptom:**
```
Failed to connect to github.com
```

**Solutions:**
- Check internet connection
- Try again (temporary issue)
- Check if behind proxy:
  ```bash
  git config --global http.proxy http://proxy:port
  ```

### SSL Certificate Error

**Symptom:**
```
SSL certificate problem: unable to get local issuer certificate
```

**Solutions:**
```bash
# Update certificates
# macOS:
brew install ca-certificates

# Or temporarily disable (not recommended):
git config --global http.sslVerify false
```

## Tool Issues

### GitHub CLI Not Found

**Symptom:**
```
GitHub CLI (gh) is not installed.
```

**Solution:**
```bash
# macOS
brew install gh

# Linux
# See https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Windows
winget install GitHub.cli
```

## Getting Help

### Check Command Help

Git and GitHub CLI have built-in help:
```bash
git commit --help
git push --help
gh pr create --help
gh pr review --help
gh pr merge --help
```

### Debug Mode

For more verbose output, check git status:
```bash
git status
git log --oneline -5
gh auth status
gh pr status
```

### Check GitHub Status

If GitHub is having issues:
- Visit https://www.githubstatus.com/
- Check Twitter: @githubstatus

### Report Issues

If you encounter a bug in the skill:
1. Note the error message
2. Note the command you ran
3. Check `git status` output
4. Report with this information
