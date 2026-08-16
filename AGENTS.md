# NPM Packages Monorepo

This monorepo contains various NPM packages maintained by Felix Arntz, primarily for personal use. It includes CLI tools for AI operations, WordPress plugin management, a digital business card CLI, and shared CLI utilities. The project is structured as a monorepo using pnpm workspaces.

## Workflow Commands

- `pnpm install` — install dependencies
- `pnpm check` - check code style etc.
- `pnpm fix` - auto-fix code style etc.
- `pnpm build` - build all packages
- `pnpm test` - run all tests
- `pnpm typecheck` - run TypeScript checks

To run any of these commands for a specific package, use `pnpm --filter <package> <command>`. Examples:

- `pnpm --filter felixarntz test` - Run tests only for the `felixarntz` package
- `pnpm --filter @felixarntz/wp-plugins-cli build` - Build only the `@felixarntz/wp-plugins-cli` package

## Using the CLIs

The `@felixarntz/ai-cli` and `@felixarntz/wp-plugins-cli` packages provide CLI tools to run. You can execute the locally built binaries for end-to-end verification of changes:

- `pnpm ai` - Invokes the built AI CLI
- `pnpm wp-plugins` - Invokes the built WP Plugins CLI

**Important:** If you change the TypeScript source but don't run rebuild the package, your changes won't be reflected when running the respective CLI.
