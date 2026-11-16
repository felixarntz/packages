# NPM Packages Monorepo

This monorepo contains various NPM packages maintained by Felix Arntz, primarily for personal use. It includes CLI tools for AI operations, WordPress plugin management, a digital business card CLI, and shared CLI utilities. The project is structured as a monorepo using pnpm workspaces.

## Workflow Commands

- `pnpm install` — install dependencies
- `pnpm check` - check code style etc.
- `pnpm fix` - auto-fix code style etc.
- `pnpm build` - build all packages
- `pnpm test` - run all tests
- `pnpm typecheck` - run TypeScript checks
- `pnpm konsistent` - run code consistency checks

To run any of these commands for a specific package, use `pnpm --filter <package> <command>`. Examples:

- `pnpm --filter felixarntz test` - Run tests only for the `felixarntz` package
- `pnpm --filter @felixarntz/wp-plugins-cli build` - Build only the `@felixarntz/wp-plugins-cli` package

## Using the CLIs

The `@felixarntz/ai-image-cli` and `@felixarntz/wp-plugins-cli` packages provide CLI tools to run. You can execute the locally built binaries for end-to-end verification of changes:

- `pnpm ai-image` - Invokes the built AI Image CLI
- `pnpm wp-plugins` - Invokes the built WP Plugins CLI

**Important:** If you change the TypeScript source but don't run rebuild the package, your changes won't be reflected when running the respective CLI.

## Package Development Guidelines

These guidelines apply to every individual package in `packages/`.

- Files with exported symbols belong directly into the `src/` directory; files with helper code belong into a `src/util/` subdirectory for simple packages, or for a domain-specific subdirectory for more complex packages.
- A `types.ts` file must ONLY be used if the package provides exported types that are foundational for the overall package's API and do not directly belong to one specific functionality. Types that directly belong to a specific functionality, whether exported from the package or not, must be defined next to the most relevant symbols that use them (e.g. functions or classes).
- Packages must not redefine alternative versions of features or helper functions that another package in this monorepo provides. Many packages in the monorepo provide granular low-level APIs, and those should be used where they apply, across packages.
