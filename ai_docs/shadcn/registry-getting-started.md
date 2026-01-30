# Getting Started with Component Registries

## Overview

This documentation explains how to establish your own component registry. The process assumes you have existing components and want to convert them into a registry format.

## Core Requirements

The fundamental requirement is straightforward: "registry items must be valid JSON files that conform to the registry-item schema specification." A template project is available to accelerate the setup process.

## Essential Files and Structure

### registry.json
The entry point for any registry is a `registry.json` file located at the root. This file contains metadata including the registry's name, homepage URL, and an inventory of all registry items. The shadcn CLI automatically generates this during the build process.

### File Organization
Components should follow this directory pattern: `registry/[STYLE]/[NAME]`. For example, a component might live at `registry/new-york/hello-world/hello-world.tsx`.

## Setup Process

**Installation:** Begin by installing the latest shadcn CLI via npm.

**Configuration:** Add a build script (`"registry:build": "shadcn build"`) to your package.json.

**Execution:** Run the build script to generate JSON files, which are output to `public/r` by default.

**Serving:** Deploy your project to make registry items accessible at URLs like `http://localhost:3000/r/[NAME].json`.

## Best Practices

- Assign meaningful names and descriptions to components
- Document all registry and package dependencies explicitly
- Use the `@/registry` path for all imports
- Organize component files into `components`, `hooks`, or `lib` directories
- Ensure all required properties (`name`, `description`, `type`, `files`) are included in item definitions

## Installation

Users can install registry items using: `npx shadcn@latest add [REGISTRY_URL]`
