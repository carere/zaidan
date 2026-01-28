# Playwright Locator API Reference

## Overview

The Locator class represents Playwright's central mechanism for finding and interacting with page elements. "Locators are the central piece of Playwright's auto-waiting and retry-ability. In a nutshell, locators represent a way to find element(s) on the page at any moment."

## Creating Locators

Locators are instantiated through the `page.locator()` method and support chainable operations for refined element selection.

## Core Methods

### Element Query Methods

#### all()
Returns an array of locators for all matching elements.

```typescript
const buttons = await page.getByRole('button').all();
```

#### count()
Returns the number of elements matching the locator.

```typescript
const count = await page.locator('[role="button"]').count();
```

#### first()
Returns a locator that represents the first matching element.

```typescript
const firstButton = page.getByRole('button').first();
```

#### last()
Returns a locator that represents the last matching element.

```typescript
const lastButton = page.getByRole('button').last();
```

#### nth(index)
Returns a locator that represents the nth matching element (0-indexed).

```typescript
const secondButton = page.getByRole('button').nth(1);
```

### Text & Content Retrieval

#### innerText()
Retrieves the element's inner text content (only visible text).

```typescript
const text = await page.locator('[role="status"]').innerText();
```

#### innerHTML()
Gets the element's HTML content.

```typescript
const html = await page.locator('.container').innerHTML();
```

#### textContent()
Gets the text content of the element and all descendants.

```typescript
const content = await page.locator('.description').textContent();
```

#### allInnerTexts()
Returns an array of inner text values for all matching elements.

```typescript
const texts = await page.locator('li').allInnerTexts();
```

#### allTextContents()
Returns an array of text content values for all matching elements.

```typescript
const contents = await page.locator('.item').allTextContents();
```

#### inputValue()
Returns the value of an input, textarea, or select element.

```typescript
const value = await page.locator('input[type="text"]').inputValue();
```

#### getAttribute(name, options?)
Gets the value of a specific HTML attribute.

```typescript
const href = await page.locator('a').getAttribute('href');
const dataId = await page.locator('[data-id]').getAttribute('data-id');
```

### Element Location Methods

#### getByRole(role, options?)
Locates an element by its ARIA role.

```typescript
const button = page.getByRole('button', { name: 'Submit' });
const checkbox = page.getByRole('checkbox', { checked: true });
const heading = page.getByRole('heading', { level: 1 });
```

Options:
- `name` (string|RegExp) - Match by accessible name
- `checked` (boolean) - Match checked state
- `selected` (boolean) - Match selected state
- `level` (number) - For headings, match heading level
- `disabled` (boolean) - Match disabled state
- `expanded` (boolean) - Match expanded state
- `includeHidden` (boolean) - Include hidden elements (default: false)
- `exact` (boolean) - Exact matching (default: false)

#### getByLabel(text, options?)
Locates an input by its associated label.

```typescript
const emailInput = page.getByLabel('Email');
const emailInput = page.getByLabel(/email/i);
```

Options:
- `exact` (boolean) - Exact text matching (default: false)

#### getByPlaceholder(text, options?)
Locates an input by its placeholder text.

```typescript
const input = page.getByPlaceholder('Search');
const input = page.getByPlaceholder(/enter name/i);
```

Options:
- `exact` (boolean) - Exact text matching (default: false)

#### getByAltText(text, options?)
Locates an image by its alt text.

```typescript
const logo = page.getByAltText('Company Logo');
const icon = page.getByAltText(/icon/i);
```

Options:
- `exact` (boolean) - Exact text matching (default: false)

#### getByTitle(text, options?)
Locates an element by its title attribute.

```typescript
const tooltip = page.getByTitle('More information');
```

Options:
- `exact` (boolean) - Exact text matching (default: false)

#### getByText(text, options?)
Locates an element by its visible text content.

```typescript
const button = page.getByText('Click me');
const item = page.getByText(/submit/i);
```

Options:
- `exact` (boolean) - Exact text matching (default: false)

#### getByTestId(testId)
Locates an element by its test ID attribute (default: `data-testid`).

```typescript
const button = page.getByTestId('submit-button');
```

The test ID attribute can be configured via `selectors.setTestIdAttribute()`.

#### locator(selector, options?)
Finds elements matching a CSS or XPath selector.

```typescript
const button = page.locator('button.primary');
const item = page.locator('xpath=//ul/li');
const element = page.locator('.container >> .item');
```

Options:
- `has` (Locator) - Filter by child locator
- `hasNot` (Locator) - Filter by absence of child locator
- `hasText` (string|RegExp) - Filter by text content
- `hasNotText` (string|RegExp) - Filter by absence of text

#### frameLocator(selector)
Returns a frame locator for accessing content within an iframe.

```typescript
const frameLocator = page.frameLocator('iframe');
const button = frameLocator.getByRole('button');
```

### Filtering Methods

#### filter(options?)
Narrows down locators by applying filter criteria.

```typescript
const visibleButtons = page.locator('button').filter({ visible: true });
const submitButton = page.locator('button').filter({ hasText: 'Submit' });
const itemsWithChild = page.locator('.item').filter({
  has: page.locator('.icon')
});
const itemsWithoutChild = page.locator('.item').filter({
  hasNot: page.locator('.disabled')
});
```

Options:
- `has` (Locator) - Filter by child element presence
- `hasNot` (Locator) - Filter by child element absence
- `hasText` (string|RegExp) - Filter by text content
- `hasNotText` (string|RegExp) - Filter by text absence
- `visible` (boolean) - Filter by visibility

#### and(locator)
Combines two locators with AND logic (both must match).

```typescript
const locator = page.locator('button').and(page.locator('[type="submit"]'));
```

#### or(locator)
Combines two locators with OR logic (either can match).

```typescript
const locator = page.locator('button').or(page.locator('[role="button"]'));
```

### User Interaction Methods

#### click(options?)
Performs a left-click action on the element.

```typescript
await page.locator('button').click();
await page.locator('button').click({ button: 'right' });
await page.locator('button').click({ modifiers: ['Control'] });
```

Options:
- `button` ('left'|'right'|'middle') - Mouse button (default: 'left')
- `clickCount` (number) - Number of clicks
- `delay` (number) - Milliseconds between mousedown and mouseup
- `position` (Object) - Click position relative to element
  - `x` (number) - X offset in pixels
  - `y` (number) - Y offset in pixels
- `modifiers` (Array) - Keyboard modifiers: 'Alt', 'Control', 'Meta', 'Shift'
- `force` (boolean) - Skip actionability checks
- `noWaitAfter` (boolean) - Don't wait for navigation/popup
- `trial` (boolean) - Perform actionability check without clicking
- `timeout` (number) - Maximum wait time in milliseconds

#### dblclick(options?)
Performs a double-click action on the element.

```typescript
await page.locator('text').dblclick();
```

Options: Same as `click()` except `clickCount` is not available.

#### hover(options?)
Moves the mouse over the element without clicking.

```typescript
await page.locator('button').hover();
```

Options:
- `position` (Object) - Hover position
- `modifiers` (Array) - Keyboard modifiers
- `force` (boolean) - Skip actionability checks
- `trial` (boolean) - Check readiness without hovering
- `timeout` (number) - Maximum wait time

#### fill(value, options?)
Fills an input, textarea, or contenteditable element with text.

```typescript
await page.locator('input[type="text"]').fill('Hello World');
```

Options:
- `force` (boolean) - Skip actionability checks
- `noWaitAfter` (boolean) - Don't wait after fill
- `timeout` (number) - Maximum wait time

#### clear(options?)
Clears the input or textarea element.

```typescript
await page.locator('input').clear();
```

Options:
- `force` (boolean) - Skip actionability checks
- `noWaitAfter` (boolean) - Don't wait after clear
- `timeout` (number) - Maximum wait time

#### type(text, options?)
Types text character by character with delays between keystrokes.

```typescript
await page.locator('input').type('Hello');
```

Options:
- `delay` (number) - Milliseconds between keystrokes
- `noWaitAfter` (boolean) - Don't wait after typing
- `timeout` (number) - Maximum wait time

#### pressSequentially(keys, options?)
Presses keys sequentially with delays between each keystroke.

```typescript
await page.locator('input').pressSequentially('Hello', { delay: 100 });
```

Options:
- `delay` (number) - Milliseconds between keystrokes
- `noWaitAfter` (boolean) - Don't wait after pressing
- `timeout` (number) - Maximum wait time

#### press(key, options?)
Presses a single key on the keyboard.

```typescript
await page.locator('input').press('Enter');
await page.locator('input').press('ArrowDown');
```

Options:
- `delay` (number) - Milliseconds between keydown and keyup
- `noWaitAfter` (boolean) - Don't wait after pressing
- `timeout` (number) - Maximum wait time

#### check(options?)
Checks a checkbox or radio button.

```typescript
await page.locator('input[type="checkbox"]').check();
```

Options:
- `force` (boolean) - Skip actionability checks
- `noWaitAfter` (boolean) - Don't wait after check
- `position` (Object) - Click position
- `trial` (boolean) - Check readiness without checking
- `timeout` (number) - Maximum wait time

#### uncheck(options?)
Unchecks a checkbox or radio button.

```typescript
await page.locator('input[type="checkbox"]').uncheck();
```

Options: Same as `check()`.

#### dragTo(target, options?)
Drags the element to another location.

```typescript
await page.locator('#source').dragTo(page.locator('#target'));
```

Options:
- `sourcePosition` (Object) - Starting position offset
- `targetPosition` (Object) - Ending position offset
- `force` (boolean) - Skip actionability checks
- `noWaitAfter` (boolean) - Don't wait after drag
- `timeout` (number) - Maximum wait time

#### focus(options?)
Focuses the element.

```typescript
await page.locator('input').focus();
```

Options:
- `timeout` (number) - Maximum wait time

#### blur(options?)
Blurs (removes focus from) the element.

```typescript
await page.locator('input').blur();
```

Options:
- `timeout` (number) - Maximum wait time

### State Inspection Methods

#### isVisible(options?)
Checks if the element is visible on the page.

```typescript
const visible = await page.locator('button').isVisible();
if (visible) {
  await page.locator('button').click();
}
```

Options:
- `timeout` (number) - Maximum wait time

#### isHidden(options?)
Checks if the element is hidden (opposite of visible).

```typescript
const hidden = await page.locator('.modal-backdrop').isHidden();
```

Options:
- `timeout` (number) - Maximum wait time

#### isEnabled(options?)
Checks if the element is enabled (for form controls).

```typescript
const enabled = await page.locator('button').isEnabled();
```

Options:
- `timeout` (number) - Maximum wait time

#### isDisabled(options?)
Checks if the element is disabled (opposite of enabled).

```typescript
const disabled = await page.locator('button').isDisabled();
```

Options:
- `timeout` (number) - Maximum wait time

#### isEditable(options?)
Checks if the element is editable (for inputs and textareas).

```typescript
const editable = await page.locator('input').isEditable();
```

Options:
- `timeout` (number) - Maximum wait time

#### isChecked(options?)
Checks if the element is checked (for checkboxes and radio buttons).

```typescript
const checked = await page.locator('input[type="checkbox"]').isChecked();
```

Options:
- `timeout` (number) - Maximum wait time

### Advanced Methods

#### evaluate(function, arg?)
Executes a function in the page context with the element as the first argument.

```typescript
const elementTag = await page.locator('button').evaluate(el => el.tagName);
const value = await page.locator('input').evaluate((el, arg) => {
  return el.value + arg;
}, ' suffix');
```

#### evaluateAll(function, arg?)
Executes a function for each matching element and returns an array of results.

```typescript
const tags = await page.locator('[role="button"]').evaluateAll(
  (elements) => elements.map(el => el.tagName)
);
```

#### evaluateHandle(function, arg?)
Similar to `evaluate()` but returns a JSHandle that can be passed to other APIs.

```typescript
const handle = await page.locator('button').evaluateHandle(el => el.parentElement);
```

#### boundingBox(options?)
Returns the bounding box of the element (position and dimensions).

```typescript
const box = await page.locator('button').boundingBox();
if (box) {
  console.log(`Position: (${box.x}, ${box.y}), Size: ${box.width}x${box.height}`);
}
```

Returns an object with:
- `x` (number) - X coordinate
- `y` (number) - Y coordinate
- `width` (number) - Element width
- `height` (number) - Element height

Or `null` if element is not visible.

#### contentFrame()
Converts an iframe locator to a FrameLocator for accessing content inside the iframe.

```typescript
const frameLocator = page.locator('iframe').contentFrame();
```

#### dispatchEvent(type, eventInit?, options?)
Programmatically dispatches a DOM event on the element.

```typescript
await page.locator('input').dispatchEvent('change');
await page.locator('div').dispatchEvent('mouseenter', { bubbles: true });
```

Options:
- `timeout` (number) - Maximum wait time

#### ariaSnapshot(options?)
Captures the ARIA tree snapshot for accessibility testing.

```typescript
const snapshot = await page.locator('[role="dialog"]').ariaSnapshot();
```

Options:
- `timeout` (number) - Maximum wait time

### Debugging Methods

#### describe(description)
Adds a custom description to the locator for better debugging in traces.

```typescript
const button = page.getByRole('button', { name: 'Submit' }).describe('Submit button in dialog');
await button.click();
```

#### description()
Returns the description of the locator if one was set.

```typescript
const desc = locator.description();
```

#### highlight()
Highlights the element visually on the page (for debugging).

```typescript
await page.locator('button').highlight();
```

## Key Features

### Auto-waiting

Methods automatically wait for elements to become actionable before executing actions. This includes:
- Waiting for the element to be visible
- Waiting for the element to stop moving
- Waiting for the element to be enabled (for interactive elements)

### Actionability Checks

Before performing user interactions, Playwright checks:
- Element is visible
- Element is not blocked by other elements
- Element is in a stable position
- Element is enabled (if applicable)

### Filtering Options

The `filter()` method supports sophisticated filtering:
- Filter by text content (case-insensitive substring or regex)
- Filter by child element presence (`has`)
- Filter by child element absence (`hasNot`)
- Filter by visibility state

### Timeout Handling

Most methods accept optional timeout parameters, with defaults configurable via test configuration. A timeout of 0 means no timeout.

### Trial Mode

Actions support a `trial` option that performs all actionability checks without executing the actual interaction. Useful for testing without side effects.

## Chainable Design

Locators support method chaining for complex element selection:

```typescript
const button = page
  .getByRole('button')
  .filter({ hasText: 'Submit' })
  .first();

await button.click();
```

## Best Practices

1. **Prefer semantic locators**: Use `getByRole()`, `getByLabel()`, `getByText()` over CSS/XPath selectors when possible.

2. **Use test IDs for complex scenarios**: When semantic locators are insufficient, use `getByTestId()`.

3. **Leverage filtering**: Use `filter()` to narrow results instead of creating multiple locator definitions.

4. **Use `expect()` for assertions**: Prefer `expect(locator).toHaveText()` over retrieving text and comparing manually.

5. **Configure custom test ID attributes**: If not using `data-testid`, configure the attribute via `selectors.setTestIdAttribute()`.

6. **Avoid force clicks**: Let auto-waiting handle actionability unless necessary.

7. **Use `trial` mode for debugging**: Check actionability without performing actions.

## Summary

The Locator API is Playwright's foundation for reliable element interaction. Built-in auto-waiting and retry capabilities reduce flakiness and make tests more resilient to timing issues. Semantic locators prioritize accessibility-based selection, promoting inclusive web development practices.
