# Registry.json Documentation

## Overview

The `registry.json` file defines a custom component registry structure for shadcn/ui. It serves as the configuration that specifies available components and their metadata.

## Core Properties

### $schema

Points to the JSON Schema specification: `https://ui.shadcn.com/schema/registry.json`

### name

A string identifier for your registry, used in data attributes and metadata. Example: `"acme"`

### homepage

The registry's URL, used for data attributes and reference purposes. Example: `"https://acme.com"`

### items

An array containing registry items. Each item follows the registry-item schema specification and includes:
- Component metadata (name, type, title, description)
- Dependencies and registry dependencies
- File references and paths

## Item Structure Example

```json
{
  "name": "hello-world",
  "type": "registry:block",
  "title": "Hello World",
  "description": "A simple hello world component.",
  "registryDependencies": [
    "button",
    "@acme/input-form",
    "https://example.com/r/foo"
  ],
  "dependencies": ["is-even@3.0.0", "motion"],
  "files": [
    {
      "path": "registry/new-york/hello-world/hello-world.tsx",
      "type": "registry:component"
    }
  ]
}
```

## Key Concepts

### registryDependencies

References to other registry items needed by a component, supporting namespaced and external URLs. Can include:
- Local component names
- Scoped packages
- External URLs

### dependencies

NPM package versions required for functionality

### files

Component file definitions with paths and type classifications. Each file object includes:
- `path`: The file path to the component source
- `type`: The type classification (e.g., "registry:component")

## Item Properties Reference

Each item in the registry requires:

- **name**: Unique component identifier
- **type**: Component classification (e.g., "registry:block", "registry:component")
- **title**: Display name for the component
- **description**: Purpose and explanation of the component
- **registryDependencies**: References to other registry components
- **dependencies**: npm packages with version specifications
- **files**: Array of file objects with `path` and `type` properties

## Full Schema

For comprehensive schema details, refer to the official JSON Schema at `https://ui.shadcn.com/schema/registry.json`
