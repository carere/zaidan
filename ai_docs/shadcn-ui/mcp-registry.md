# MCP Server Registry Documentation

## Overview

The shadcn MCP server integrates seamlessly with any shadcn-compatible registry without requiring special configuration, enabling AI assistants to access your components.

## Core Requirements

**Registry Index File**: Your registry must include a `registry.json` or `registry` file at its root that conforms to the registry schema. For a registry at `https://acme.com/r/[name].json`, the index should be accessible at `https://acme.com/r/registry.json`.

## Configuration Steps

Registry maintainers should instruct users to:

1. **Update `components.json`** with registry details:

```json
{
  "registries": {
    "@acme": "https://acme.com/r/{name}.json"
  }
}
```

2. **Initialize MCP** using the appropriate client command (Claude Code, Cursor, VS Code, Codex, or OpenCode each have specific initialization steps)

3. **Test functionality** with sample prompts like requesting component listings or creating pages using registry items

## Optimization Guidelines

To maximize MCP effectiveness, maintainers should:

- Provide "concise, informative descriptions that help AI assistants understand what a registry item is for" and its implementation
- Specify all dependencies accurately for automatic installation
- Establish relationships between items through `registryDependencies`
- Maintain kebab-case naming conventions consistently

Additional information is available in the full MCP documentation.
