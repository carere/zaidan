# Playwright Locator API Documentation

## Overview

The Locator class serves as "the central piece of Playwright's auto-waiting and retry-ability," enabling developers to find and interact with page elements dynamically. Locators are created via `page.locator()`.

## Key Method Categories

### Element Discovery
- **`all()`** – Returns array of locators for matching elements
- **`first()`, `last()`, `nth(index)`** – Access specific matches
- **`count()`** – Returns number of matching elements
- **`filter(options)`** – Narrows results by text, nested elements, or visibility
- **`locator(selector, options)`** – Finds elements within subtree

### Text & Content Retrieval
- **`allInnerTexts()`, `allTextContents()`** – Arrays of text from all matches
- **`innerText()`, `textContent()`** – Single element text
- **`innerHTML()`** – Element HTML content
- **`inputValue()`** – Value from input/textarea/select elements

### User Interactions
- **`click(options)`** – Click with customizable button, modifiers, position
- **`dblclick(options)`** – Double-click action
- **`fill(value)`** – Set input field values
- **`clear()`** – Empty input fields
- **`check()`, `uncheck()`** – Toggle checkboxes/radio buttons
- **`hover(options)`** – Mouse hover
- **`dragTo(target, options)`** – Drag and drop operations
- **`focus()`, `blur()`** – Focus management

### State Queries
- **`isVisible()`, `isHidden()`** – Visibility status
- **`isEnabled()`, `isDisabled()`** – Enabled state
- **`isChecked()`, `isEditable()`** – Element-specific states

### Element Properties
- **`getAttribute(name)`** – Retrieve attribute values
- **`boundingBox()`** – Get element coordinates and dimensions
- **`ariaSnapshot()`** – Capture accessibility tree representation

### Advanced Locating
- **`getByRole()`, `getByText()`, `getByLabel()`, `getByTestId()`** – Semantic locators
- **`getByPlaceholder()`, `getByAltText()`, `getByTitle()`** – Attribute-based locators
- **`and(locator)`, `or(locator)`** – Combine multiple locators

### Execution & Automation
- **`evaluate()`, `evaluateAll()`, `evaluateHandle()`** – Execute JavaScript with elements
- **`dispatchEvent(type, eventInit)`** – Programmatically trigger DOM events
- **`frameLocator(selector)`** – Access iframe content

### Utilities
- **`describe(text)`** – Add custom descriptions for debugging
- **`highlight()`** – Visual highlighting for troubleshooting

## Common Options Pattern

Most action methods support:
- **`timeout`** – Max milliseconds to wait (defaults to 0)
- **`force`** – Bypass actionability checks
- **`trial`** – Perform checks without executing action
