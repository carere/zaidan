# Playwright Locators Documentation

## Core Concept

Locators represent the foundational mechanism in Playwright's auto-waiting and retry capabilities. They enable finding elements on a page at any moment, refreshing the DOM query before each action.

## Recommended Built-in Locators

Playwright prioritizes user-facing attributes:

- **Role-based**: `page.getByRole()` for accessibility attributes
- **Text content**: `page.getByText()` for visible text
- **Form labels**: `page.getByLabel()` for associated labels
- **Placeholder text**: `page.getByPlaceholder()` for input hints
- **Alt text**: `page.getByAltText()` for images
- **Title attributes**: `page.getByTitle()`
- **Test IDs**: `page.getByTestId()` using `data-testid` attribute

## Locating Strategies

### By Role
Uses W3C ARIA specifications to reflect user perception and assistive technology interpretation. Supports buttons, checkboxes, headings, links, lists, and tables with implicit role definitions.

### By Label
Locates form controls through associated label text, ideal for form interactions.

### By Placeholder
Targets input elements using placeholder attribute values for elements without labels.

### By Text
Matches elements containing specific text—supports substrings, exact matches, or regex patterns with whitespace normalization.

### By Alt Text
Locates images and area elements using alternative text descriptions.

### By Title
Finds elements with matching title attributes.

### By Test ID
Uses `data-testid` attributes (configurable) for explicit testing contracts. Most resilient to UI changes but not user-facing.

### CSS/XPath
Available via `page.locator()` but not recommended due to brittleness when DOM structure changes.

## Shadow DOM Support

All locators work within Shadow DOM by default, except XPath (which doesn't pierce shadow roots) and closed-mode shadow roots.

## Filtering Techniques

- **By text**: `filter({ hasText: 'value' })` or `filter({ hasNotText: 'value' })`
- **By descendant**: `filter({ has: locator })` or `filter({ hasNot: locator })`
- **Visibility**: `filter({ visible: true })`

## Locator Operators

- **Chaining**: Narrow searches using sequential method calls
- **AND operator**: `locator.and()` combines multiple criteria
- **OR operator**: `locator.or()` matches alternatives
- **Positional**: `first()`, `last()`, `nth()` for specific elements

## Working with Lists

- Count items: `toHaveCount()`
- Assert text: `toHaveText(['item1', 'item2'])`
- Access specific items via text, filtering, test ID, or position
- Iterate with `.all()` or loops

## Strictness

Locators enforce strictness—operations throw errors if multiple elements match. Multi-element operations (like `.count()`) bypass this restriction. Positional methods (`nth()`, `first()`, `last()`) opt out but risk selecting wrong elements.

## Best Practices

Prioritize role and text locators for resilience. Use test IDs when role/text aren't viable. Avoid long CSS/XPath chains tied to DOM structure.
