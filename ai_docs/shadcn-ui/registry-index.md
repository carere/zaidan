# Open Source Registry Index Documentation

## Overview
The open source registry index catalogs "all the open source registries that are available to use out of the box." When developers execute `shadcn add` or `shadcn search` commands, the CLI automatically searches this registry index and updates the `components.json` file accordingly. The complete list is accessible at https://ui.shadcn.com/r/registries.json.

## Submission Process
To add a registry, contributors must:

1. Update the [`apps/v4/registry/directory.json`](https://github.com/shadcn-ui/ui/blob/main/apps/v4/registry/directory.json) file in the repository
2. Execute `pnpm registry:build` to generate the updated `registries.json`
3. Submit a pull request to https://github.com/shadcn-ui/ui
4. Await team validation and review

## Registry Requirements
Registries must meet four key criteria:

1. Be open source and publicly accessible
2. Conform to the official registry schema specification
3. Maintain a flat structure with files at the root level (e.g., `/registry.json` and `/component-name.json`)
4. Exclude `content` properties from the `files` array

These guidelines ensure consistency across the ecosystem and maintain compatibility with the shadcn CLI tooling.
