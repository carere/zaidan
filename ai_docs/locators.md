# Locators

Locators are the central piece of Playwright's auto-waiting and retry-ability. In short, locators are a way to find element(s) on the page at any moment.

## Quick guide

These are the recommended locators:

- `page.getByRole()` - Locate by [explicit and implicit accessibility attributes](https://www.w3.org/TR/wai-aria-1.2/).
- `page.getByText()` - Locate by text content.
- `page.getByLabel()` - Locate a form control by the associated label's text.
- `page.getByPlaceholder()` - Locate an input by placeholder text.
- `page.getByAltText()` - Locate an element, usually image, by its text alternative.
- `page.getByTitle()` - Locate an element by its title attribute.
- `page.getByTestId()` - Locate an element based on its `data-testid` attribute (other attribute can be configured).

## Locating by role

The `getByRole()` locator reflects how users and assistive technology perceive the page, serving as a primary method for test interaction. This locator uses explicit and implicit [accessibility attributes](https://www.w3.org/TR/wai-aria-1.2/).

```javascript
// Click a button with accessible name "login"
await page.getByRole('button', { name: 'login' }).click();

// Find input by label text
await page.getByLabel('Password').fill('secret');

// Click a heading with specific level
await page.getByRole('heading', { level: 1 }).click();

// Select an option from a combobox
await page.getByRole('combobox').selectOption('option');
```

All elements have an implicit role. For example, `<button>` element has an implicit "button" role. Many html elements like `<button>`, `<a>`, `<h1>` - `<h6>` have an implicitly defined role.

## Locating by label

Form control locators like `getByLabel()` can be used when the control has an associated label element:

```javascript
await page.getByLabel('I agree to the terms above').check();
```

## Locating by placeholder

Inputs may have placeholder attribute to hint to the user what value should be entered:

```javascript
await page.getByPlaceholder('name@example.com').fill('playwright@microsoft.com');
```

## Locating by text

Locate an element by the text it contains. You can match by substring, exact string, or a regular expression.

```javascript
await page.getByText('Welcome, John').click();

// Text matching is case-insensitive, trims whitespace and normalizes spaces
await page.getByText('welcome, john').click();

// Regex matching
await page.getByText(/welcome, john/i).click();

// Exact string matching (with no regex or case-insensitive option)
await page.getByText('Welcome, John', { exact: true }).click();
```

Note that matching is done by the normalized text, so spaces are trimmed and multiple spaces are collapsed into one. Whitespace-only text nodes are ignored.

## Locating by alt text

All images should have an alt attribute that describes the image. You can locate an image based on the alt text:

```javascript
await page.getByAltText('playwright logo').click();
```

## Locating by title

Locate an element with the matching title attribute:

```javascript
await page.getByTitle('Issues count').click();
```

## Locating by test id

Test your app with test ids. Set a data attribute to your test id:

```javascript
<button data-testid="directions">PWgen</button>
```

Then locate the button by the test id:

```javascript
await page.getByTestId('directions').click();
```

#### Using custom test ids

By default, `getByTestId()` will look for the `data-testid` attribute. If you are using a different test id attribute in your application, you can specify it in the test configuration:

```javascript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    testIdAttribute: 'data-qa',
  },
});
```

Then in your tests:

```javascript
await page.getByTestId('directions').click();
```

## Locating by CSS or XPath

If you absolutely must use CSS or XPath locators, you can use `page.locator()` to create a locator that takes a CSS selector or XPath expression.

```javascript
// CSS locator
await page.locator('css=button').click();

// XPath locator
await page.locator('xpath=//button').click();

// CSS locator shorthand
await page.locator('button').click();
```

We recommend using user-facing locators instead of selectors, since the former better reflect how the application works.

## Locating by XPath

:::note
XPath cannot pierce shadow DOM.
:::

XPath locators work with both HTML and XML documents.

```javascript
// XPath locator
await page.locator('xpath=//button').click();
```

## Locating by CSS

CSS locators work with both HTML and XML documents. CSS locators are not recommended as they are brittle and non-resilient.

```javascript
// CSS locator
await page.locator('css=button').click();
```

## Shadow DOM

All locators in Playwright **pierce shadow DOM by default**. The exception is `page.locator('xpath')` - it cannot pierce shadow DOM.

```javascript
await page.getByText('My Text').click();
```

The above will find elements in shadow DOMs as well.

## Filtering locators

### Filter by text

You can filter locators by text with `locator.filter()`:

```javascript
await page
  .locator('button')
  .filter({ hasText: 'Apply' })
  .click();
```

You can also use regex:

```javascript
await page
  .locator('button')
  .filter({ hasText: /apply/i })
  .click();
```

### Filter by element

You can filter locators by another locator with `locator.filter()`:

```javascript
await page
  .locator('li')
  .filter({ has: page.locator('text=John') })
  .click();
```

Or filter to see if a child element is not present:

```javascript
await page
  .locator('li')
  .filter({ hasNot: page.getByRole('button', { name: 'John' }) })
  .click();
```

### Filter by absence

You can filter locators by the absence of text:

```javascript
await page
  .locator('button')
  .filter({ hasNotText: 'Apply' })
  .click();
```

## Locator operators

### Combine locators

You can combine two locators using `locator.and()`:

```javascript
const button = page
  .getByRole('button')
  .and(page.getByTitle('Subscribe'));

await button.click();
```

### Choose either locator

You can choose one of the two locators using `locator.or()`:

```javascript
const button = page
  .getByRole('button', { name: 'Subscribe' })
  .or(page.getByRole('button', { name: 'Join' }));

await button.click();
```

## List of locators

You can use `.all()` to retrieve all matching locators:

```javascript
const locators = await page.getByRole('button').all();
locators.forEach(locator => console.log(locator));
```

## Count elements

You can count elements using `.count()`:

```javascript
const count = await page.getByRole('button').count();
console.log(count);
```

## Filter list of locators

You can filter a list of locators by text:

```javascript
await page
  .locator('li')
  .filter({ hasText: 'John' })
  .click();
```

## Get nth element

You can use `.nth()` to retrieve one of the matching locators:

```javascript
const button = page.getByRole('button').nth(2);
await button.click();
```

## Get first and last element

You can use `.first()` and `.last()` to retrieve the first and last matching locators:

```javascript
const firstButton = page.getByRole('button').first();
await firstButton.click();

const lastButton = page.getByRole('button').last();
await lastButton.click();
```

## Evaluate in page

You can run JavaScript in the page context and return the result using `.evaluateAll()`:

```javascript
const buttonTexts = await page
  .locator('button')
  .evaluateAll(buttons => buttons.map(btn => btn.textContent));

console.log(buttonTexts);
```

## Assertions using locators

You can assert elements with `expect()`:

```javascript
await expect(page.locator('button')).toHaveCount(3);
```

Learn more about [assertions](./test-assertions.md).

## Strictness

Locators can be strict. Strict locators require their corresponding element(s) to have exactly one match. If a strict locator matches more than one element, Playwright will throw:

```
Error: <locator> resolved to 4 elements
```

By default, most locators are strict. Locators like `locator.nth(i)` and `locator.first()` are not strict.

### Disabling strictness

You can disable strictness using `.first()`, `.last()` or `.nth(index)`:

```javascript
// This will select the first button
await page.getByRole('button').first().click();
```

## User-facing attributes

We recommend prioritizing user-facing attributes and explicit contracts (test ids) over implementation details. Long CSS or XPath chains are an example of a bad practice that leads to unstable tests.

Below is the priority order for using locators:

1. User-facing attributes
   - `getByAltText()` - For images
   - `getByLabel()` - For form fields
   - `getByPlaceholder()` - For input placeholders
   - `getByRole()` - For semantic HTML
   - `getByText()` - For non-interactive elements
   - `getByTitle()` - For tooltips

2. Test attributes
   - `getByTestId()` - For test ids (data-testid by default)

3. CSS/XPath selectors (not recommended)
   - These are brittle and non-resilient to DOM changes
   - They tie tests to implementation details
