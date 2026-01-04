# StyleProvider Context Implementation Plan

## Objective

Refactor the current style management system from prop-based signal passing to a context-based architecture using SolidJS patterns. This will centralize style state management and eliminate prop drilling while maintaining SSR compatibility with Tanstack Start.

## Current State Analysis

### Existing Implementation

**File: `src/routes/__root.tsx`**
- Hardcoded `class="style-vega"` on the `<body>` element (line 41)
- Renders `<Shell />` component inside `<ColorModeProvider>`
- No dynamic style management at root level

**File: `src/components/shell.tsx`**
- Creates local style signal: `const [style, setStyle] = createSignal<Style>("vega")` (line 16)
- Passes `style={style()}` and `onStyleChange={setStyle}` to `<StyleSwitcher>` (line 40)
- Applies conditional style classes to `<SidebarInset>` based on signal value (lines 51-57):
  ```tsx
  class={cn("flex-1", {
    "style-vega": style() === "vega",
    "style-nova": style() === "nova",
    "style-lyra": style() === "lyra",
    "style-maia": style() === "maia",
    "style-mira": style() === "mira",
  })}
  ```

**File: `src/components/style-switcher.tsx`**
- Receives `style: Style` and `onStyleChange: (style: Style) => void` as props
- Renders `<Select>` component with style options
- Calls `props.onStyleChange(e as Style)` on change

**File: `src/routes/ui.$component.tsx`**
- Currently minimal implementation
- Returns placeholder text: "Hello /ui/$component!"
- **This is where style classes should be applied** (target for refactor)

**File: `src/routes/{-$doc}.tsx`**
- Renders documentation content via `<MDXContent>`
- Does NOT use `<SidebarInset>`, so naturally unaffected by style changes
- Will remain untouched by this refactor

### Type Definition

**File: `src/lib/types.ts`**
```typescript
export type Style = "vega" | "nova" | "lyra" | "maia" | "mira";
```

### Existing Context Pattern

The codebase already uses SolidJS context pattern in `src/registry/ui/sidebar.tsx`:
```typescript
const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}
```

This pattern should be followed for consistency.

## Proposed Architecture

### StyleContext Design

Create a new context that provides:
- `style: Accessor<Style>` - Current selected style (reactive)
- `setStyle: (style: Style) => void` - Function to update style
- Default value: "vega"

### Provider Hierarchy

```
<html>
  <body class="style-vega"> <!-- Remove hardcoded, keep for other purposes -->
    <ColorModeProvider>
      <StyleProvider> <!-- NEW: Add here -->
        <Suspense>
          <Shell />
        </Suspense>
      </StyleProvider>
    </ColorModeProvider>
  </body>
</html>
```

### Component Flow

1. **StyleProvider** (in `__root.tsx`) - Creates and provides style state
2. **StyleSwitcher** (in `shell.tsx` header) - Consumes context to change style
3. **UI Component Route** (`ui.$component.tsx`) - Consumes context to apply style classes
4. **Docs Route** (`{-$doc}.tsx`) - Unaffected, does not consume context

## Files to Create

### 1. `src/lib/style-context.tsx`

**Purpose:** Define StyleContext, StyleProvider component, and useStyle hook

**Exports:**
- `StyleProvider` - Provider component
- `useStyle` - Hook to consume context

**Implementation Pattern:**
```typescript
import { createContext, useContext, createSignal, type Accessor, type Component, type JSX } from "solid-js";
import type { Style } from "@/lib/types";

type StyleContextProps = {
  style: Accessor<Style>;
  setStyle: (style: Style) => void;
};

const StyleContext = createContext<StyleContextProps | null>(null);

export function useStyle() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error("useStyle must be used within a StyleProvider.");
  }
  return context;
}

export const StyleProvider: Component<{ children: JSX.Element }> = (props) => {
  const [style, setStyle] = createSignal<Style>("vega");

  return (
    <StyleContext.Provider value={{ style, setStyle }}>
      {props.children}
    </StyleContext.Provider>
  );
};
```

**Considerations:**
- Default to "vega" to match current behavior
- Consider adding localStorage/cookie persistence in future iteration
- Keep SSR-safe (no direct localStorage access in provider creation)

## Files to Modify

### 2. `src/routes/__root.tsx`

**Changes Required:**
1. Import `StyleProvider` from `@/lib/style-context`
2. Wrap `<Shell />` with `<StyleProvider>`

**Before:**
```tsx
<ColorModeProvider storageManager={storageManager}>
  <Suspense>
    <Shell />
    <TanStackRouterDevtools />
  </Suspense>
</ColorModeProvider>
```

**After:**
```tsx
<ColorModeProvider storageManager={storageManager}>
  <StyleProvider>
    <Suspense>
      <Shell />
      <TanStackRouterDevtools />
    </Suspense>
  </StyleProvider>
</ColorModeProvider>
```

**Note:** The hardcoded `class="style-vega"` on body (line 41) can remain or be removed depending on whether it's used for other purposes beyond the SidebarInset styling.

### 3. `src/components/shell.tsx`

**Changes Required:**
1. **Remove:** `const [style, setStyle] = createSignal<Style>("vega");` (line 16)
2. **Remove:** Style-related imports if no longer needed
3. **Update:** `<StyleSwitcher>` to not receive props (line 40)
4. **Remove:** Conditional style classes from `<SidebarInset>` (lines 51-57)

**Before:**
```tsx
export function Shell() {
  const [isFullLayout, switchLayout] = createSignal(false);
  const [style, setStyle] = createSignal<Style>("vega");

  return (
    <div data-slot="layout" ...>
      <header ...>
        ...
        <StyleSwitcher style={style()} onStyleChange={setStyle} />
      </header>
      <main ...>
        <SidebarProvider ...>
          <div data-slot="designer" ...>
            <ItemExplorer />
            <SidebarInset
              class={cn("flex-1", {
                "style-vega": style() === "vega",
                "style-nova": style() === "nova",
                "style-lyra": style() === "lyra",
                "style-maia": style() === "maia",
                "style-mira": style() === "mira",
              })}
            >
              <Outlet />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </main>
    </div>
  );
}
```

**After:**
```tsx
export function Shell() {
  const [isFullLayout, switchLayout] = createSignal(false);

  return (
    <div data-slot="layout" ...>
      <header ...>
        ...
        <StyleSwitcher />
      </header>
      <main ...>
        <SidebarProvider ...>
          <div data-slot="designer" ...>
            <ItemExplorer />
            <SidebarInset class="flex-1">
              <Outlet />
            </SidebarInset>
          </div>
        </SidebarProvider>
      </main>
    </div>
  );
}
```

**Imports to Remove:**
- Remove `import type { Style } from "@/lib/types";` (if not used elsewhere)

### 4. `src/components/style-switcher.tsx`

**Changes Required:**
1. Import `useStyle` from `@/lib/style-context`
2. Remove `StyleSwitcherProps` interface
3. Remove `props` parameter and usage
4. Use `useStyle()` hook to get context
5. Update component signature to not accept props

**Before:**
```tsx
import type { Style } from "@/lib/types";
import { ... } from "@/registry/ui/select";

type StyleSwitcherProps = {
  style: Style;
  onStyleChange: (style: Style) => void;
};

export function StyleSwitcher(props: StyleSwitcherProps) {
  return (
    <Select
      itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
      onChange={(e) => props.onStyleChange(e as Style)}
      options={["vega", "nova", "lyra", "maia", "mira"]}
      placeholder="Select a style"
      defaultValue={props.style}
      value={props.style}
    >
      <SelectTrigger aria-label="Style" class="w-[180px]">
        <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
      </SelectTrigger>
      <SelectContent />
    </Select>
  );
}
```

**After:**
```tsx
import type { Style } from "@/lib/types";
import { useStyle } from "@/lib/style-context";
import { ... } from "@/registry/ui/select";

export function StyleSwitcher() {
  const { style, setStyle } = useStyle();

  return (
    <Select
      itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
      onChange={(e) => setStyle(e as Style)}
      options={["vega", "nova", "lyra", "maia", "mira"]}
      placeholder="Select a style"
      defaultValue={style()}
      value={style()}
    >
      <SelectTrigger aria-label="Style" class="w-[180px]">
        <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
      </SelectTrigger>
      <SelectContent />
    </Select>
  );
}
```

### 5. `src/routes/ui.$component.tsx`

**Changes Required:**
1. Import `useStyle` from `@/lib/style-context`
2. Import `cn` utility from `@/lib/utils`
3. Use `useStyle()` to get current style
4. Apply conditional style classes to the component container
5. Implement actual component rendering logic (currently placeholder)

**Before:**
```tsx
import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";

export const Route = createFileRoute("/ui/$component")({
  loader: ({ params }) => {
    const doc = ui.find((u) => u.slug === params.component);
    if (!doc) {
      throw notFound({
        data: {
          component: params.component,
        },
      });
    }
    return doc;
  },
  component: RouteComponent,
  notFoundComponent: (props) => {
    return <div>Component not found: {(props.data as { component: string }).component}</div>;
  },
});

function RouteComponent() {
  return <div>Hello "/ui/$component"!</div>;
}
```

**After:**
```tsx
import { createFileRoute, notFound } from "@tanstack/solid-router";
import { ui } from "@velite";
import { useStyle } from "@/lib/style-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ui/$component")({
  loader: ({ params }) => {
    const doc = ui.find((u) => u.slug === params.component);
    if (!doc) {
      throw notFound({
        data: {
          component: params.component,
        },
      });
    }
    return doc;
  },
  component: RouteComponent,
  notFoundComponent: (props) => {
    return <div>Component not found: {(props.data as { component: string }).component}</div>;
  },
});

function RouteComponent() {
  const { style } = useStyle();
  const doc = Route.useLoaderData();

  return (
    <div
      class={cn({
        "style-vega": style() === "vega",
        "style-nova": style() === "nova",
        "style-lyra": style() === "lyra",
        "style-maia": style() === "maia",
        "style-mira": style() === "mira",
      })}
    >
      {/* TODO: Implement actual component rendering using doc data */}
      <div>Component: {doc().slug}</div>
    </div>
  );
}
```

**Note:** The actual component rendering logic is out of scope for this refactor but the container with style classes is essential.

## Implementation Steps

### Phase 1: Create Context Infrastructure
1. ✅ Create `src/lib/style-context.tsx`
   - Define `StyleContextProps` type
   - Create `StyleContext` with `createContext`
   - Implement `useStyle()` hook with error handling
   - Implement `StyleProvider` component with `createSignal`

### Phase 2: Integrate Provider
2. ✅ Update `src/routes/__root.tsx`
   - Import `StyleProvider`
   - Wrap `<Shell />` with `<StyleProvider>`
   - Verify component tree structure

### Phase 3: Update Consumers
3. ✅ Update `src/components/style-switcher.tsx`
   - Import `useStyle` hook
   - Remove props interface and props usage
   - Use context for `style()` and `setStyle()`
   - Test style switching functionality

4. ✅ Update `src/routes/ui.$component.tsx`
   - Import `useStyle` and `cn`
   - Add style conditional classes to component container
   - Use `style()` accessor for reactive class updates
   - Verify style changes apply correctly

### Phase 4: Remove Old Implementation
5. ✅ Update `src/components/shell.tsx`
   - Remove `style` and `setStyle` signal
   - Remove `Style` type import if unused
   - Remove props from `<StyleSwitcher />`
   - Remove conditional classes from `<SidebarInset>`
   - Clean up unused imports

### Phase 5: Verification
6. ✅ Test all routes
   - Verify `/ui/$component` applies styles correctly
   - Verify `/{-$doc}` (docs) is NOT affected by style changes
   - Verify `<StyleSwitcher>` changes update the UI component
   - Test SSR compatibility (no hydration mismatches)

7. ✅ Code cleanup
   - Remove any dead code
   - Ensure no TypeScript errors
   - Verify all imports are correct

## Acceptance Criteria

### Functional Requirements
- ✅ `<StyleProvider>` is added to `__root.tsx` and wraps the application
- ✅ `ui.$component.tsx` applies style classes based on `StyleContext`
- ✅ Style selection logic is moved from `shell.tsx` to `ui.$component.tsx`
- ✅ Docs page (`{-$doc}.tsx`) is NOT affected by style changes
- ✅ `StyleSwitcher` uses `useStyle()` hook instead of props
- ✅ Changing style in `StyleSwitcher` updates the UI component in real-time

### Technical Requirements
- ✅ Uses SolidJS patterns (`createContext`, `createSignal`, `useContext`)
- ✅ Follows existing codebase patterns (matches `sidebar.tsx` context pattern)
- ✅ Type-safe implementation (no `any` types)
- ✅ SSR-compatible (works with Tanstack Start)
- ✅ No prop drilling (context eliminates need to pass style through components)
- ✅ Error handling in `useStyle()` hook (throws if used outside provider)

### Code Quality
- ✅ Clean separation of concerns
- ✅ Consistent with existing code style
- ✅ No console errors or warnings
- ✅ No TypeScript compilation errors
- ✅ Proper imports organization

## Technical Considerations

### SolidJS-Specific Patterns

1. **Reactive Accessors:** Use `style()` not `style` when reading signal values
2. **Context Usage:** Follow the pattern:
   ```tsx
   const { style, setStyle } = useStyle();
   // Read: style()
   // Write: setStyle(newValue)
   ```

3. **JSX Children:** TypeScript: Use `JSX.Element` type for children prop

### Tanstack Start Integration

1. **SSR Compatibility:**
   - Avoid `localStorage` or `window` access during initial render
   - Use `createIsomorphicFn` if server/client divergence needed (see `__root.tsx` cookie example)
   - Current implementation is SSR-safe (pure signal, no side effects)

2. **Route Context:**
   - `StyleProvider` must wrap all routes that need style access
   - Docs route naturally excluded as it doesn't consume context

### Class Application Strategy

The `cn()` utility (from `class-variance-authority`) merges conditional classes:
```tsx
class={cn({
  "style-vega": style() === "vega",
  "style-nova": style() === "nova",
  // ... etc
})}
```

Only ONE style class is applied at a time (mutually exclusive).

### Future Enhancements (Out of Scope)

1. **Style Persistence:**
   - Add cookie/localStorage to persist style selection
   - Follow `ColorModeProvider` pattern with `cookieStorageManagerSSR`

2. **Default Style Configuration:**
   - Make default style configurable via env var or config file

3. **Style Preloading:**
   - Consider preloading style CSS if styles have separate bundles

## Migration Safety

### Backward Compatibility
- Default style remains "vega" (no behavior change)
- Style classes remain the same (`style-vega`, `style-nova`, etc.)
- Component hierarchy unchanged (only internal implementation)

### Rollback Plan
If issues arise:
1. Revert `__root.tsx` (remove `<StyleProvider>`)
2. Restore `shell.tsx` signal and props
3. Revert `style-switcher.tsx` to accept props
4. Delete `src/lib/style-context.tsx`

## Summary

This refactor modernizes the style management system by:
- ✅ Centralizing style state in a context provider
- ✅ Eliminating prop drilling through component tree
- ✅ Moving style application to the appropriate component (`ui.$component.tsx`)
- ✅ Following established SolidJS and codebase patterns
- ✅ Maintaining SSR compatibility with Tanstack Start
- ✅ Keeping docs page unaffected by style changes

The implementation is straightforward, type-safe, and aligns with modern SolidJS best practices.
