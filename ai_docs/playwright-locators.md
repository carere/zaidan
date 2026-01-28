# Playwright Locators

## Overview

Locators are fundamental to Playwright's testing approach, providing "a way to find element(s) on the page at any moment" with built-in auto-waiting and retry capabilities.

## Recommended Built-in Locators

Playwright recommends prioritizing user-facing locators:

- **getByRole()** - Uses accessibility attributes to match elements
- **getByText()** - Finds elements by text content
- **getByLabel()** - Locates form controls by associated labels
- **getByPlaceholder()** - Targets inputs with placeholder text
- **getByAltText()** - Locates images by alt text
- **getByTitle()** - Finds elements with title attributes
- **getByTestId()** - Uses data-testid attributes for resilient tests

## Locating Elements

### By Role

Role locators reflect how users perceive pages and follow W3C ARIA specifications. They support buttons, checkboxes, headings, links, lists, tables, and more. When using role locators, include the accessible name for precision.

### By Label

Ideal for form controls with associated labels, enabling targeted interaction with form fields.

### By Placeholder

Useful for inputs lacking labels but containing placeholder text hints.

### By Text

Matches elements containing specific text via substring, exact match, or regex. Whitespace is normalized automatically.

### By Alt Text

Locates images and similar elements using their text alternatives, supporting accessibility standards.

### By Title

Targets elements containing specific title attributes.

### By Test ID

The most resilient approach when roles and text are unreliable. Default uses `data-testid` but custom attributes can be configured via `testIdAttribute` in playwright.config.ts.

### By CSS or XPath

As a last resort, use `page.locator()` for CSS or XPath selectors. Not recommended due to fragility when DOM structure changes.

## Shadow DOM Support

All Playwright locators work within Shadow DOM by default, except:
- XPath locators do not pierce shadow roots
- Closed-mode shadow roots are unsupported

## Filtering Locators

### Filter by Text

The `filter({ hasText: 'text' })` method narrows results to elements containing specific text.

### Filter by Absence

Use `filter({ hasNotText: 'text' })` to exclude elements with particular content.

### Filter by Child/Descendant

Chain filters using `filter({ has: locator })` to match elements containing specific descendants.

### Filter by Absence of Child

The `filter({ hasNot: locator })` option excludes elements containing particular child elements.

## Locator Operators

### Chaining Locators

Methods creating locators can be chained to narrow searches to specific page regions, progressively refining element selection.

### Combining Locators with AND

The `and()` method matches elements satisfying multiple locator conditions simultaneously.

### Combining with OR

The `or()` method creates alternatives, useful when uncertain which element appears. Use `first()` to avoid strictness violations when multiple matches occur.

### Visibility Filtering

The `filter({ visible: true })` option targets only visible elements, though more reliable identification methods are preferred.

## Working with Lists

### Counting Items

Use `expect(locator).toHaveCount(n)` to verify list length.

### Asserting List Text

The `toHaveText(['item1', 'item2'])` assertion validates all text content in lists.

### Getting Specific Items

Multiple approaches exist:
- **By text**: `page.getByText('text')`
- **By filter**: `locator.filter({ hasText: 'text' })`
- **By test ID**: `page.getByTestId('id')`
- **By position**: `nth()`, `first()`, `last()` (use cautiously)

### Iterating Elements

Use `all()` to retrieve all matching elements, or loop with `count()` and `nth()`.

### Page Evaluation

The `evaluateAll()` method runs JavaScript within the page context, enabling DOM operations on matched elements.

## Strictness

Locators enforce strictness by default, throwing exceptions when multiple elements match single-element operations. Operations implying multiple results (like `count()`) work without restriction. Use `first()`, `last()`, or `nth()` to bypass strictness checks, though explicit uniqueness is preferred.

## Best Practices

1. Prioritize user-facing locators (role, text, label)
2. Define explicit test IDs when role/text are insufficient
3. Avoid fragile CSS and XPath chains
4. Chain locators progressively to narrow searches
5. Create unique locators passing strictness criteria
6. Normalize whitespace expectations in text matching
