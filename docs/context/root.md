# Zaidan

Zaidan is a SolidJS design-system product that combines guidance, authored registry items, live examples, chart examples, and project configuration in one public website.

## Language

**Product Surface**:
One of Zaidan's five top-level user destinations: Home, Docs, Components, Charts, or Create. Each surface has its own purpose and may use a different page layout beneath the shared Product Header.
_Avoid_: Section, tab

**Product Header**:
The shared navigation and global controls that connect every Product Surface across desktop and mobile layouts.
_Avoid_: Universal shell, docs header

**Command Search**:
The Product Header's global navigation search across Product Surfaces and published authored or catalog content. It finds destinations and stable section anchors without running actions or changing the active Design Configuration.
_Avoid_: Item Picker, command palette

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

**Chart Catalog Entry**:
An individually installable chart example presented in the Chart Catalog. It is distributed through the registry as a block-shaped artifact but does not belong to the Component Catalog's Blocks collection.
_Avoid_: Chart block, Component block

**Create Workspace**:
The dedicated Product Surface where users configure a design system, preview it, and obtain project setup instructions.
_Avoid_: Customizer rail, theme page

**Design Configuration**:
The normalized design-system choices owned by the Create Workspace. The default is implicit; a modified selection is represented by a Preset Token inside Create and its Preview, determines preview and setup output, and is discarded when the user leaves Create.
_Avoid_: Theme state, query options

**Preset Token**:
The compact, versioned representation of one normalized Design Configuration. It is URL state only inside Create and its Preview, and it also identifies the generated virtual registry item used by setup output; it is never navigation state shared by other Product Surfaces.
_Avoid_: Global configuration, cross-surface state

**Primitive**:
The accessible behavior foundation beneath registry Components. Kobalte is Zaidan's only supported Primitive; Component identity remains independent of that choice so another Primitive can be introduced later without changing the Component Catalog.
_Avoid_: Component library, component variant
