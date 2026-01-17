# Writing Tests | Playwright

## Introduction

Playwright tests follow a straightforward pattern: they **perform actions** and **assert the state** against expectations. The framework automatically waits for actionability checks before executing actions, eliminating manual waits and race conditions.

## First Test

Here's a basic test example:

```typescript
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
```

## Actions

### Navigation

Tests typically begin with page navigation:

```typescript
await page.goto('https://playwright.dev/');
```

### Interactions

The Locators API finds elements on the page. Playwright automatically waits for elements to become actionable:

```typescript
await page.getByRole('link', { name: 'Get started' }).click();
```

### Basic Actions Table

| Action | Purpose |
|--------|---------|
| `locator.check()` | Check input checkbox |
| `locator.click()` | Click element |
| `locator.fill()` | Fill form field |
| `locator.hover()` | Hover mouse |
| `locator.press()` | Press key |
| `locator.selectOption()` | Select dropdown option |

## Assertions

Playwright provides async matchers that wait until conditions are met:

```typescript
await expect(page).toHaveTitle(/Playwright/);
```

### Popular Assertions

| Assertion | Description |
|-----------|-------------|
| `toBeVisible()` | Element visible |
| `toBeChecked()` | Checkbox checked |
| `toContainText()` | Contains text |
| `toHaveTitle()` | Page has title |
| `toHaveURL()` | Page has URL |

## Test Isolation

Each test receives a fresh browser context, ensuring complete isolation between tests even within a single browser session.

## Test Hooks

Organize tests with `test.describe()` and use lifecycle hooks:

```typescript
test.describe('navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://playwright.dev/');
  });
});
```
