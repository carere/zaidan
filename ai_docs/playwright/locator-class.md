# Playwright Locator API Documentation

## Overview

Locators are central to Playwright's auto-waiting and retry capabilities. They represent a dynamic way to find element(s) on a page. Create locators using `page.locator()`.

## Core Methods

### Element Selection & Retrieval

**all()** - Returns array of locators for list elements without waiting
**count()** - Gets number of matching elements
**first()** - Returns locator to first matching element
**last()** - Returns locator to last matching element
**nth(index)** - Returns locator to n-th matching element (zero-based)

### Query Methods

**getAttribute(name)** - Returns element's attribute value
**innerHTML()** - Returns element's inner HTML
**innerText()** - Returns element's text content
**inputValue()** - Returns value of input/textarea/select elements
**allInnerTexts()** - Returns array of innerText values
**allTextContents()** - Returns array of textContent values

### Visibility & State Checks

**isChecked()** - Checks if checkbox/radio is checked
**isDisabled()** - Returns disabled state
**isEditable()** - Returns editable state
**isEnabled()** - Returns enabled state
**isHidden()** - Returns hidden state
**isVisible()** - Returns visible state

### User Interactions

**check()** - Ensures checkbox/radio is checked
**click(options)** - Clicks element with optional modifiers and position
**dblclick(options)** - Double-clicks element
**dragTo(target)** - Drags source element to target
**fill(value)** - Sets input/textarea value
**clear()** - Clears input field
**focus()** - Calls focus on element
**blur()** - Calls blur on element
**hover(options)** - Hovers over element
**uncheck()** - Ensures checkbox/radio unchecked

### JavaScript Execution

**evaluate(function, arg)** - Executes JS with element as argument
**evaluateAll(function, arg)** - Executes JS with all matching elements
**evaluateHandle(function)** - Returns JSHandle from JS execution
**dispatchEvent(type, eventInit)** - Programmatically dispatches DOM events

### Locator Composition

**and(locator)** - Creates locator matching both criteria
**or(locator)** - Creates locator matching either criteria
**filter(options)** - Narrows locator by text, elements, or visibility
**locator(selector)** - Finds nested element matching selector
**frameLocator(selector)** - Returns FrameLocator for iframe
**contentFrame()** - Returns FrameLocator for iframe element

### Accessibility

**getByAltText(text)** - Locates elements by alt text
**getByLabel(text)** - Locates inputs by associated label
**getByPlaceholder(text)** - Locates inputs by placeholder
**getByRole(role, options)** - Locates elements by ARIA role
**getByTestId(testId)** - Locates elements by test ID attribute
**getByText(text)** - Locates elements by text content
**getByTitle(text)** - Locates elements by title attribute
**ariaSnapshot(options)** - Captures ARIA snapshot for element

### Utilities

**boundingBox(options)** - Returns element's bounding box coordinates
**describe(description)** - Adds description for trace viewer
**description()** - Returns previously set description
**highlight()** - Highlights element on screen for debugging
**screenshot(options)** - Takes element screenshot
**toString()** - Returns string representation

## Key Parameters

**timeout** - Maximum milliseconds to wait (defaults to 0, no timeout)
**force** - Bypasses actionability checks when true
**position** - Relative coordinates {x, y} within element
**modifiers** - Keyboard modifiers: Alt, Control, Meta, Shift
**hasText/hasNot** - Filters by text presence/absence
**visible** - Filters by visibility state

## Return Types

Most action methods return `Promise<void>`. Query methods return `Promise<string>`, `Promise<number>`, or `Promise<boolean>`. Locator methods return `Locator` objects for chaining.
