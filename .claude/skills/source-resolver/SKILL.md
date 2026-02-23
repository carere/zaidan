---
name: source-resolver
description: Normalizes source inputs (GitHub URLs, registry JSON endpoints, local file globs) into a fetchable manifest. Abstracts away source differences so agents are source-agnostic.
---

# Source Resolver

Resolves user-provided source inputs into a normalized, fetchable manifest. Handles raw GitHub URLs, registry JSON endpoints, local file globs, and the default shadcn source. Outputs a consistent manifest format so that consuming agents never need to know where the code came from.

## Supported Input Formats

| Input Format | Example | Resolution |
|---|---|---|
| **shadcn default** (no `--source`) | `/sync-component dialog` | Fetch from `https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/dialog.tsx` |
| **Raw GitHub URL** | `--source=https://raw.githubusercontent.com/...` | Direct fetch, parse imports for dependencies |
| **Registry JSON endpoint** | `--source=https://magicui.design/r/shimmer-button.json` | Fetch JSON, parse `files[]` array, fetch each file |
| **Multiple URLs** | `--source=url1 --source=url2` | Fetch each URL, combine into multi-file manifest |
| **Local globs** | `--source="./external/src/**/*.tsx"` | Read matching files from filesystem |

## Normalized Manifest Format

Regardless of input format, resolution always produces this JSON structure:

```json
{
  "source": "<source-identifier>",
  "name": "<component-name>",
  "files": [
    {
      "path": "<filename>.tsx",
      "content": "<full file content as string>",
      "type": "registry:ui"
    }
  ],
  "dependencies": ["<npm-package-name>"],
  "registryDependencies": ["<other-registry-component-name>"],
  "cssVars": {
    "theme": {
      "<css-var-name>": "<css-var-value>"
    }
  }
}
```

### Field Descriptions

| Field | Type | Description |
|---|---|---|
| `source` | `string` | Identifier for the source origin (`"shadcn"`, `"magicui"`, `"local"`, or domain name) |
| `name` | `string` | Component name in kebab-case (e.g., `"shimmer-button"`, `"dialog"`) |
| `files` | `array` | Array of file objects, each with `path`, `content`, and `type` |
| `files[].path` | `string` | Relative filename (e.g., `"shimmer-button.tsx"`) |
| `files[].content` | `string` | Full file content as a string |
| `files[].type` | `string` | Registry type: `"registry:ui"`, `"registry:block"`, `"registry:hook"`, `"registry:lib"` |
| `dependencies` | `string[]` | External npm packages required (e.g., `["framer-motion"]`) |
| `registryDependencies` | `string[]` | Other registry components this depends on (e.g., `["button"]`) |
| `cssVars` | `object` | CSS custom properties to add to the theme |

## Resolution Workflow

### Step 1: Detect Input Format

Determine which resolution strategy to use based on the input:

1. **No `--source` flag**: Default to shadcn GitHub source
2. **URL ending in `.json`**: Treat as registry JSON endpoint
3. **URL starting with `https://`**: Treat as raw GitHub URL (or any raw file URL)
4. **Multiple `--source` flags**: Treat as multiple URLs
5. **Path containing glob characters** (`*`, `**`, `?`): Treat as local glob
6. **Path without glob characters**: Treat as local file path

### Step 2: Resolve by Format

#### Format A: shadcn Default (No --source)

When no `--source` is provided, fetch from shadcn's GitHub:

```bash
curl -s "https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/<component-name>.tsx"
```

1. Fetch the raw TSX file
2. If response is 404, report error and stop
3. Parse the file content to extract imports
4. Identify `dependencies` from external package imports (e.g., `@base-ui/react/*` -> `@kobalte/core`)
5. Identify `registryDependencies` from `@/registry/ui/*` imports
6. Set `source` to `"shadcn"`
7. Set `type` to `"registry:ui"`

#### Format B: Raw GitHub URL

When `--source` is a raw URL to a single file:

```bash
curl -s "<url>"
```

1. Fetch the URL content
2. If response is not 200, report error and stop
3. Extract the filename from the URL path
4. Derive `name` from filename (strip `.tsx` extension)
5. Derive `source` from the URL domain/org (e.g., `magicuidesign` -> `"magicui"`)
6. Parse imports to extract `dependencies` and `registryDependencies`
7. Set `type` based on file location hints or default to `"registry:ui"`

#### Format C: Registry JSON Endpoint

When `--source` ends in `.json`:

```bash
curl -s "<url>"
```

1. Fetch the JSON endpoint
2. Parse the response as JSON
3. If response contains a `files[]` array, iterate over each file entry:
   - If the file entry contains `content` inline, use it directly
   - If the file entry contains a `url`, fetch that URL to get the content
   - If the file entry contains only a `path`, construct the URL from the registry base and fetch
4. Extract `dependencies` from the JSON if present
5. Extract `registryDependencies` from the JSON if present
6. Extract `cssVars` from the JSON if present
7. Set `source` from the registry domain
8. Set `name` from the JSON `name` field or derive from URL

**Example registry JSON response:**
```json
{
  "name": "shimmer-button",
  "type": "registry:ui",
  "files": [
    {
      "path": "magicui/shimmer-button.tsx",
      "content": "import { cn } from \"@/lib/utils\";\n..."
    }
  ],
  "dependencies": ["framer-motion"],
  "registryDependencies": ["button"],
  "cssVars": {
    "theme": {
      "animate-shimmer": "shimmer 2s linear infinite"
    }
  }
}
```

#### Format D: Multiple URLs

When multiple `--source` flags are provided:

1. Resolve each URL independently using Format B or Format C
2. Combine all files into a single manifest `files[]` array
3. Merge `dependencies` arrays (deduplicate)
4. Merge `registryDependencies` arrays (deduplicate)
5. Merge `cssVars` objects
6. Use the first URL's source as the manifest `source`
7. Derive `name` from the first file or use a user-provided name

#### Format E: Local Globs

When `--source` contains glob characters:

```bash
# Use Bun.Glob or shell glob expansion
ls <glob-pattern>
```

1. Expand the glob pattern to get matching file paths
2. Read each matching file's content
3. Derive `name` from the first file or directory name
4. Set `source` to `"local"`
5. Parse imports from each file to extract `dependencies` and `registryDependencies`
6. Set `type` based on file location (e.g., files in `ui/` -> `"registry:ui"`, files in `hooks/` -> `"registry:hook"`)

### Step 3: Parse Dependencies from Imports

For any file content, extract dependencies by scanning import statements:

```
External dependencies (npm packages):
- import ... from "<package-name>"        -> add to dependencies
- import ... from "<package-name>/..."    -> add to dependencies (use root package)
- Exclude: solid-js, @kobalte/core, @corvu/* (these are part of the project)

Registry dependencies (other Zaidan components):
- import ... from "@/registry/ui/<name>"  -> add to registryDependencies
- import ... from "@/components/ui/<name>" -> add to registryDependencies
- import ... from "~/components/ui/<name>" -> add to registryDependencies
```

### Step 4: Validate Manifest

Before returning the manifest, validate:

1. `name` is non-empty and kebab-case
2. `files` array has at least one entry
3. Each file has non-empty `path` and `content`
4. Each file has a valid `type`
5. `dependencies` contains no duplicates
6. `registryDependencies` contains no duplicates

## Examples

### Example 1: Default shadcn Component

Input:
```
/sync-component dialog
```

Resolution:
1. No `--source` -> use shadcn default
2. Fetch `https://raw.githubusercontent.com/shadcn-ui/ui/refs/heads/main/apps/v4/registry/bases/base/ui/dialog.tsx`
3. Parse imports: `@base-ui/react/dialog` -> dependency `@base-ui/react`
4. Produce manifest:

```json
{
  "source": "shadcn",
  "name": "dialog",
  "files": [
    {
      "path": "dialog.tsx",
      "content": "import * as React from \"react\";\nimport * as DialogPrimitive from \"@base-ui/react/dialog\";\n...",
      "type": "registry:ui"
    }
  ],
  "dependencies": ["@base-ui/react"],
  "registryDependencies": [],
  "cssVars": {}
}
```

### Example 2: External Registry JSON

Input:
```
/sync-external shimmer-button --source=https://magicui.design/r/shimmer-button.json
```

Resolution:
1. URL ends in `.json` -> registry JSON endpoint
2. Fetch and parse JSON
3. Produce manifest:

```json
{
  "source": "magicui",
  "name": "shimmer-button",
  "files": [
    {
      "path": "shimmer-button.tsx",
      "content": "import { cn } from \"@/lib/utils\";\nimport { motion } from \"framer-motion\";\n...",
      "type": "registry:ui"
    }
  ],
  "dependencies": ["framer-motion"],
  "registryDependencies": ["button"],
  "cssVars": {
    "theme": {
      "animate-shimmer": "shimmer 2s linear infinite"
    }
  }
}
```

### Example 3: Raw GitHub URL

Input:
```
/sync-external marquee --source=https://raw.githubusercontent.com/magicuidesign/magicui/main/registry/magicui/marquee.tsx
```

Resolution:
1. URL is a raw file URL -> direct fetch
2. Fetch content
3. Parse imports for dependencies
4. Produce manifest:

```json
{
  "source": "magicui",
  "name": "marquee",
  "files": [
    {
      "path": "marquee.tsx",
      "content": "import { cn } from \"@/lib/utils\";\n...",
      "type": "registry:ui"
    }
  ],
  "dependencies": [],
  "registryDependencies": [],
  "cssVars": {}
}
```

### Example 4: Local Files

Input:
```
/sync-external my-component --source="./external/magic-ui/src/**/*.tsx"
```

Resolution:
1. Contains glob `**` -> local glob
2. Expand glob, read files
3. Produce manifest:

```json
{
  "source": "local",
  "name": "my-component",
  "files": [
    {
      "path": "my-component.tsx",
      "content": "...",
      "type": "registry:ui"
    },
    {
      "path": "use-my-hook.ts",
      "content": "...",
      "type": "registry:hook"
    }
  ],
  "dependencies": ["framer-motion"],
  "registryDependencies": ["button", "card"],
  "cssVars": {}
}
```

## Error Handling

| Error | Action |
|---|---|
| **404 Not Found** | Report: "Source not found at `<url>`. Verify the URL is correct and the resource exists." Stop resolution. |
| **Network error** | Report: "Failed to fetch `<url>`: `<error-message>`. Check network connectivity." Retry once, then stop. |
| **Invalid JSON** (registry endpoint) | Report: "Registry endpoint returned invalid JSON. Expected a registry manifest with `files[]` array." Stop resolution. |
| **Empty file content** | Report: "File at `<path>` is empty. Skipping." Continue with other files. |
| **No files matched** (local glob) | Report: "No files matched the glob pattern `<pattern>`. Verify the path and pattern." Stop resolution. |
| **Missing `files[]` in JSON** | Report: "Registry JSON does not contain a `files` array. Attempting to treat as a single-file source." Fall back to direct content extraction. |
| **Import parse failure** | Report: "Could not parse imports from `<file>`. Dependencies may be incomplete." Continue with partial results. |

## Registry Discovery

When using `/sync-registry` to batch-sync from a third-party registry:

1. Fetch the registry manifest (e.g., `https://magicui.design/r/registry.json`)
2. The manifest contains an array of component entries
3. Each entry has at minimum `name` and `type` fields
4. Diff against Zaidan's `registry.json` to find components not yet synced
5. For each component to sync, resolve its individual source using the appropriate format above
6. Return an array of manifests, one per component
