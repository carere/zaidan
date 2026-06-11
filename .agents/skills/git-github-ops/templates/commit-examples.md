# Commit Message Examples

This document provides examples of well-formatted Conventional Commit messages for various scenarios.

## Feature Commits

### Simple Feature
```
feat: add dark mode toggle
```

### Feature with Scope
```
feat(ui): add dark mode toggle to settings
```

### Feature with Body
```
feat(auth): implement OAuth2 authentication

Add support for Google and GitHub OAuth providers.
Users can now sign in with their existing accounts.
```

### Feature with Issue Reference
```
feat(users): add profile picture upload

Implement ability for users to upload and crop profile pictures.
Supports JPEG, PNG, and WebP formats up to 5MB.

Closes #234
```

### Breaking Feature
```
feat!: redesign API response format

Change all API responses to use consistent envelope structure.

BREAKING CHANGE: All API responses now wrapped in { data, meta, errors } format.
Existing clients must update their parsing logic.

Migration guide: https://docs.example.com/api-v2-migration
```

## Bug Fix Commits

### Simple Fix
```
fix: correct typo in error message
```

### Fix with Scope
```
fix(checkout): prevent double charges on slow networks
```

### Fix with Explanation
```
fix(database): resolve connection pool exhaustion

Connections were not being properly released after query timeouts.
Added explicit connection release in finally block.

Fixes #456
```

### Security Fix
```
fix(security): address XSS vulnerability in comments

Sanitize user input before rendering in comments section.
Add CSP headers for additional protection.

Security: CVE-2024-1234
Fixes #789
```

## Documentation Commits

### Simple Docs
```
docs: update README with installation instructions
```

### API Documentation
```
docs(api): document rate limiting behavior

Add documentation for:
- Rate limit headers
- Retry-After handling
- Best practices for clients
```

### Contributing Guide
```
docs(contributing): add PR template and guidelines

Add pull request template with checklist.
Document code review process and expectations.
```

## Refactoring Commits

### Simple Refactor
```
refactor: extract validation logic to separate module
```

### Component Refactor
```
refactor(auth): simplify token refresh flow

Consolidate token refresh logic into single service.
Remove duplicate code from multiple components.
```

### Architecture Change
```
refactor(core): migrate from class components to hooks

Convert all class components to functional components with hooks.
No behavioral changes, only structural improvements.
```

## Style Commits

### Formatting
```
style: format code with prettier
```

### Specific Changes
```
style(components): fix indentation and spacing

Apply consistent 2-space indentation.
Remove trailing whitespace.
```

## Test Commits

### Adding Tests
```
test: add unit tests for user service
```

### Integration Tests
```
test(integration): add API endpoint tests

Add tests for:
- User registration endpoint
- Login/logout flow
- Password reset
```

### Coverage Improvement
```
test(auth): increase coverage for token validation

Add edge case tests for expired tokens.
Add tests for malformed JWT handling.
```

## Chore Commits

### Dependencies
```
chore(deps): update dependencies
```

### Specific Dependency
```
chore(deps): bump lodash from 4.17.20 to 4.17.21

Addresses security vulnerability CVE-2021-23337.
```

### Configuration
```
chore: configure git hooks with husky

Add pre-commit hook for linting.
Add commit-msg hook for conventional commit validation.
```

### Cleanup
```
chore: remove deprecated code and unused imports
```

## CI/CD Commits

### Workflow Changes
```
ci: add GitHub Actions workflow for testing
```

### Pipeline Updates
```
ci(deploy): add staging environment deployment

Configure automatic deployment to staging on PR merge.
Add environment-specific configuration.
```

### Build Configuration
```
ci: configure parallel test execution

Split test suite into parallel jobs.
Reduces CI time from 15 minutes to 5 minutes.
```

## Build Commits

### Tool Updates
```
build: upgrade webpack to v5
```

### Configuration
```
build: configure path aliases for cleaner imports

Add @ alias for src directory.
Update tsconfig and bundler config.
```

### Docker
```
build(docker): optimize image size

Use multi-stage build.
Switch to alpine base image.
Reduces image size from 1.2GB to 150MB.
```

## Performance Commits

### Optimization
```
perf: optimize database queries

Add indexes for frequently queried columns.
Reduces query time from 500ms to 50ms.
```

### Frontend Performance
```
perf(images): implement lazy loading

Add intersection observer for below-fold images.
Reduces initial page load by 2MB.
```

### Bundle Size
```
perf(bundle): implement code splitting

Split vendor and app bundles.
Add route-based code splitting.
Reduces initial load from 2MB to 400KB.
```

## Revert Commits

### Simple Revert
```
revert: revert "feat: add experimental feature"

This reverts commit abc123def456.
```

### Revert with Explanation
```
revert: revert "perf: enable aggressive caching"

This reverts commit 789xyz.

The caching strategy caused stale data issues in production.
Will revisit with proper cache invalidation strategy.
```

## Complex Examples

### Multiple Footers
```
feat(payments): implement Stripe integration

Add payment processing with Stripe:
- Credit card payments
- Subscription management
- Invoice generation

Implements #123
Refs #124, #125
Reviewed-by: Jane <jane@example.com>
```

### Breaking Change with Migration
```
feat(api)!: change user endpoint response structure

Restructure user response to include nested profile object.

Before:
  { id, name, email, avatar }

After:
  { id, profile: { name, email, avatar } }

BREAKING CHANGE: User response structure changed.
Update client code to access profile fields via user.profile.

Migration script: scripts/migrate-user-response.js
Closes #500
```

### Co-authored Commit
```
feat(auth): implement SAML SSO

Add enterprise SAML single sign-on support.
Tested with Okta and Azure AD.

Co-authored-by: Alice <alice@example.com>
Co-authored-by: Bob <bob@example.com>
Closes #600
```

## Anti-Patterns (What NOT to Do)

### Too Vague
```
# Bad
fix: fix stuff
update: update code
misc: various changes

# Good
fix(cart): correct quantity calculation on item update
```

### Too Long Subject
```
# Bad
feat: add user authentication with OAuth2 support for Google and GitHub providers including token refresh and session management

# Good
feat(auth): add OAuth2 authentication

Add support for Google and GitHub providers.
Includes token refresh and session management.
```

### Wrong Tense
```
# Bad
feat: added user profile
fix: fixed the bug

# Good
feat: add user profile
fix: resolve login timeout issue
```

### Missing Type
```
# Bad
user authentication feature
fixed bug in checkout

# Good
feat: add user authentication
fix: resolve checkout bug
```

### Period at End
```
# Bad
feat: add user authentication.

# Good
feat: add user authentication
```

### Unrelated Changes
```
# Bad (multiple unrelated changes)
feat: add dark mode and fix login bug and update dependencies

# Good (separate commits)
feat(ui): add dark mode toggle
fix(auth): resolve login timeout
chore(deps): update dependencies
```
