# Conventional Commits Reference

This document provides a comprehensive reference for the Conventional Commits v1.0.0 specification.

## Specification

Conventional Commits is a lightweight convention on top of commit messages that provides a consistent way to structure commit history. It makes it easier to:

- Automatically generate CHANGELOGs
- Automatically determine semantic version bumps
- Communicate the nature of changes to teammates and stakeholders
- Trigger build and publish processes
- Make it easier for people to contribute by providing structured guidance

## Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Header

The header is **required** and must follow this format:

```
<type>[(scope)][!]: <description>
```

- **type** - Required. Describes the category of change
- **scope** - Optional. Describes the section of codebase affected
- **!** - Optional. Indicates a breaking change
- **description** - Required. Short summary of the change

**Rules:**
- Keep the header under 72 characters
- Use lowercase for type and scope
- Description should be lowercase and not end with a period
- Use imperative mood ("add" not "added" or "adds")

### Body

The body is **optional** and provides additional context:

- Separated from header by a blank line
- Can be multiple paragraphs
- Should explain the "what" and "why", not the "how"

### Footer

Footers are **optional** and follow a specific format:

```
<token>: <value>
```

or for issue references:

```
<token> #<issue-number>
```

Common footer tokens:
- `BREAKING CHANGE` - Describes breaking changes
- `Fixes` - Closes an issue
- `Closes` - Closes an issue
- `Refs` - References an issue
- `Reviewed-by` - Code reviewer
- `Co-authored-by` - Co-author information

## Commit Types

### Primary Types

#### `feat` - New Feature
Introduces a new feature to the codebase.

```
feat: add user registration
feat(auth): implement OAuth2 login
feat(api)!: add v2 endpoints with new response format
```

#### `fix` - Bug Fix
Patches a bug in the codebase.

```
fix: resolve null pointer in user lookup
fix(database): correct connection pooling issue
fix(ui): handle empty state in user list
```

### Supporting Types

#### `docs` - Documentation
Changes to documentation only.

```
docs: update API documentation
docs(readme): add installation instructions
docs(contributing): clarify PR process
```

#### `style` - Code Style
Changes that don't affect code meaning (formatting, whitespace, semicolons).

```
style: format with prettier
style(components): fix indentation
style: remove trailing whitespace
```

#### `refactor` - Code Refactoring
Code changes that neither fix bugs nor add features.

```
refactor: extract validation logic to separate module
refactor(auth): simplify token refresh flow
refactor: convert class components to hooks
```

#### `test` - Tests
Adding or updating tests.

```
test: add unit tests for user service
test(integration): add API endpoint tests
test: increase coverage for auth module
```

#### `chore` - Maintenance
Maintenance tasks, dependency updates, etc.

```
chore: update dependencies
chore(deps): bump lodash from 4.17.20 to 4.17.21
chore: configure git hooks
```

#### `perf` - Performance
Performance improvements.

```
perf: optimize database queries
perf(images): implement lazy loading
perf: reduce bundle size with tree shaking
```

#### `ci` - Continuous Integration
Changes to CI/CD configuration.

```
ci: add GitHub Actions workflow
ci: configure automated testing
ci: add deployment pipeline
```

#### `build` - Build System
Changes to build system or external dependencies.

```
build: upgrade webpack to v5
build: configure path aliases
build(docker): optimize image size
```

#### `revert` - Revert
Reverts a previous commit.

```
revert: revert "feat: add user registration"

This reverts commit abc123def456.
```

## Breaking Changes

Breaking changes can be indicated in two ways:

### 1. Using `!` in Header

```
feat!: remove deprecated API endpoints

The v1 API endpoints have been removed. Use v2 instead.
```

```
feat(api)!: change response format

Response now uses snake_case instead of camelCase.
```

### 2. Using Footer

```
feat: update user model

BREAKING CHANGE: email field is now required for all users.
Existing users without email will need to update their profile.
```

### Combined

```
feat!: redesign authentication flow

Implement new token-based authentication system.

BREAKING CHANGE: JWT tokens now expire after 1 hour.
Clients must implement token refresh logic.
```

## Scope Guidelines

Scopes help identify which part of the codebase was affected. Common patterns:

### By Module/Component
```
feat(auth): add two-factor authentication
fix(cart): correct quantity calculation
docs(api): update endpoint documentation
```

### By Layer
```
feat(ui): add dark mode toggle
fix(db): correct migration script
perf(cache): implement Redis caching
```

### By Package (Monorepos)
```
feat(core): add new utility functions
fix(cli): resolve argument parsing issue
test(sdk): add integration tests
```

## Best Practices

### DO

- ✅ Use present tense, imperative mood ("add" not "added")
- ✅ Keep the subject line under 72 characters
- ✅ Use the body to explain "what" and "why"
- ✅ Reference issues in footers
- ✅ Use meaningful scopes consistently

### DON'T

- ❌ End the subject line with a period
- ❌ Use past tense ("added feature")
- ❌ Write vague messages ("fix stuff", "update code")
- ❌ Mix unrelated changes in one commit
- ❌ Skip the type

## Examples by Scenario

### Adding a Feature

```
feat(users): add profile picture upload

Implement ability for users to upload and crop profile pictures.
Supports JPEG, PNG, and WebP formats up to 5MB.

Closes #234
```

### Fixing a Bug

```
fix(checkout): prevent double charges on slow networks

Add idempotency key to payment requests to prevent duplicate
charges when users click the pay button multiple times.

Fixes #456
```

### Documentation Update

```
docs(api): document rate limiting behavior

Add documentation for API rate limits including:
- Rate limit headers
- Retry-After handling
- Best practices for clients

Refs #789
```

### Breaking Change

```
feat(api)!: remove deprecated v1 endpoints

Remove all v1 API endpoints that were deprecated in version 2.0.

BREAKING CHANGE: v1 endpoints no longer available. Migrate to v2.

See migration guide: https://docs.example.com/migrate-v1-to-v2

Closes #123
```

### Multiple Footers

```
fix(security): address XSS vulnerability in comments

Sanitize user input before rendering in comments section.
Add CSP headers for additional protection.

Fixes #901
Reviewed-by: Alice <alice@example.com>
Co-authored-by: Bob <bob@example.com>
```

## Semantic Versioning Integration

Conventional Commits maps directly to semantic versioning:

| Commit Type | Version Bump |
|-------------|--------------|
| `fix` | PATCH (0.0.X) |
| `feat` | MINOR (0.X.0) |
| `BREAKING CHANGE` | MAJOR (X.0.0) |
| Other types | No version bump |

## Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Semantic Versioning](https://semver.org/)
