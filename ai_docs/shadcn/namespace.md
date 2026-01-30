# Namespaces Documentation

## Core Concept

The namespace system enables configuration of multiple resource registries within a single project. Resources are prefixed with `@` symbols and can include components, libraries, utilities, AI prompts, and configuration files from various sources.

## Key Features

**Decentralized Architecture**: Rather than relying on a central authority, the system allows organizations to create and manage any namespace they need. This eliminates naming conflicts and provides complete organizational flexibility.

**Configuration Structure**: Registries are defined in `components.json` using either simple URL templates or advanced object configurations with authentication:

```json
{
  "registries": {
    "@namespace": "https://registry.example.com/{name}.json"
  }
}
```

## URL Placeholders

The system supports two main placeholders:
- `{name}` - Required placeholder replaced with the resource name
- `{style}` - Optional placeholder for style-specific variants

## Authentication Methods

The documentation outlines several approaches:
- Bearer token authentication via OAuth 2.0
- API key headers
- Basic authentication
- Query parameter authentication
- Multiple simultaneous authentication methods

Environment variables (formatted as `${VAR_NAME}`) are automatically expanded at runtime and "never logged or displayed by the CLI."

## Dependency Resolution

Resources can depend on other resources across different registries. The system automatically:
- Resolves nested dependencies recursively
- Applies topological sorting for proper installation order
- Deduplicates files when multiple sources target the same path
- Merges configurations from all sources

The "last one wins" principle applies—later dependencies override earlier ones with identical target paths.

## Security Considerations

The system validates all fetched resources against the registry item schema before installation. "Resources are data files, not executable scripts," and environment variables are expanded only when needed rather than being stored persistently.

## CLI Commands

Primary operations include:
- `npx shadcn@latest add @namespace/resource` - Installation
- `npx shadcn@latest view @namespace/resource` - Pre-installation inspection
- `npx shadcn@latest search @namespace` - Resource discovery
