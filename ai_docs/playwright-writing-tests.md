# Writing Tests

Playwright tests follow a simple pattern: **perform actions and assert state against expectations**. The framework automatically handles actionability checks and provides resilient assertions designed to eliminate flaky timeouts.

## Core Concepts

### First Test

A basic test structure imports the test framework and uses fixtures:

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
```

### Actions

**Navigation:**
Tests typically begin by navigating to a URL using `page.goto()`, which waits for the load state before proceeding.

**Interactions:**
The Locators API identifies elements on the page. Playwright waits for elements to be actionable before performing operations, eliminating manual wait statements.

**Common Actions:**
- `check()` / `uncheck()` - Checkbox operations
- `click()` - Element selection
- `fill()` - Form field input
- `hover()` - Mouse positioning
- `selectOption()` - Dropdown selection
- `setInputFiles()` - File uploads

### Assertions

Playwright provides async matchers that wait until conditions are met. Key assertions include:

- `toBeVisible()` - Element visibility confirmation
- `toContainText()` - Text presence verification
- `toHaveAttribute()` - Attribute validation
- `toHaveTitle()` - Page title matching
- `toHaveURL()` - URL verification

Generic matchers like `toBeTruthy()` perform immediate synchronous checks without `await`.

## Test Architecture

**Isolation:**
Each test receives a fresh Browser Context, equivalent to a new browser profile. Tests don't share state even within the same browser instance.

**Test Hooks:**
- `test.describe()` - Groups related tests
- `test.beforeEach()` / `test.afterEach()` - Per-test setup/cleanup
- `test.beforeAll()` / `test.afterAll()` - Worker-level setup/cleanup
