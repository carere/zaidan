# Zaidan

Zaidan is a SolidJS design-system product that combines guidance, authored registry items, live examples, chart examples, and project configuration in one public website.

## Language

**Product Surface**:
One of Zaidan's five top-level user destinations: Home, Docs, Components, Charts, or Create. Each surface has its own purpose and may use a different page layout beneath the shared Product Header.
_Avoid_: Section, tab

**Product Header**:
The shared navigation and global controls that connect every Product Surface across desktop and mobile layouts.
_Avoid_: Universal shell, docs header

**Home Showcase**:
The live card composition on Home that demonstrates the component system directly in the page.
_Avoid_: Preview iframe, embedded website

**Docs Shell**:
The reading-oriented layout used by Docs and Components, combining hierarchical navigation, authored content, and contextual page navigation.
_Avoid_: Product shell, universal layout

**Component Catalog**:
The browsable collection of Zaidan's authored Components and Blocks, including their documentation and live examples.
_Avoid_: UI list, registry browser

**Chart Catalog**:
The first-class visual collection of chart examples and their usage guidance.
_Avoid_: Chart component page

**Create Workspace**:
The dedicated Product Surface where users configure a design system, preview it, and obtain project setup instructions.
_Avoid_: Customizer rail, theme page

**Design Configuration**:
The user's selected design-system choices that remain consistent while navigating between Product Surfaces and determine Create previews and setup output.
_Avoid_: Theme state, query options

**Primitive**:
The accessible behavior foundation beneath registry Components. Kobalte is Zaidan's only supported Primitive; Component identity remains independent of that choice so another Primitive can be introduced later without changing the Component Catalog.
_Avoid_: Component library, component variant
