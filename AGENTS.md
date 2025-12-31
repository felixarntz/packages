# NPM Packages Monorepo - Coding Agent Guide

## Project Overview

This monorepo contains various NPM packages maintained by Felix Arntz, primarily for personal use. It includes CLI tools for AI operations, WordPress plugin management, a personal card CLI, and shared CLI utilities. The project is structured as a monorepo using pnpm workspaces.

## Commands & Scripts

*   `pnpm install` - Install dependencies.
*   `pnpm build` - Build all packages.
*   `pnpm test` - Run all tests.
*   `pnpm lint` - Check code style.
*   `pnpm lint:fix` - Auto-fix linting issues.
*   `pnpm format` - Check formatting.
*   `pnpm format:fix` - Auto-fix formatting.
*   `pnpm typecheck` - Run TypeScript type checking.

For a comprehensive list and more details, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## Coding Standards & Compatibility Constraints

*   **Node.js:** Version 20.0.0 or higher is required.
*   **Package Manager:** `pnpm` is required. Do not use `npm` or `yarn`.
*   **Language:** All code is written in TypeScript (`pnpm typecheck`).
*   **Linting:** Code must pass ESLint checks (`pnpm lint`).
*   **Formatting:** Code must be formatted with Prettier (`pnpm format`).

For more details on contribution guidelines, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## Core Principles

*   **Monorepo Structure:** The project uses `pnpm` workspaces to manage multiple packages within a single repository. Dependencies are installed at the root.
*   **TypeScript:** All packages are written in TypeScript. Type safety is a priority.
*   **Testing:** `vitest` is used for testing. All new features and bug fixes must include tests.
*   **Linting & Formatting:** `eslint` and `prettier` are used to enforce code style and quality.
*   **Modern Node.js:** The project targets modern Node.js environments (>=20.0.0) and uses ESM.

## Project Architecture Overview

The project is a collection of independent packages that may share common utilities.
*   **CLI Tools:** `ai-cli`, `felixarntz`, and `wp-plugins-cli` are executable CLI applications.
*   **Shared Libraries:** `cli-utils` provides common functionality used by the CLI tools, such as logging, file system operations, and command-line interface helpers.

## Directory Structure

*   `packages/` - Contains all the packages in the monorepo.
    *   `packages/ai-cli/` - CLI tool for AI-related tasks (image generation, text generation, etc.).
    *   `packages/cli-utils/` - Shared utilities for building CLI applications.
    *   `packages/felixarntz/` - Personal card CLI tool that displays bio and social links.
    *   `packages/wp-plugins-cli/` - CLI tool for managing WordPress plugins.
*   `CONTRIBUTING.md` - Guidelines for contributing to the project.
*   `package.json` - Root configuration and scripts.
*   `pnpm-workspace.yaml` - Workspace configuration.

## Git Repo

The main branch for this project is called "main".

## Agent Guidelines

*   **DO:**
    *   Run `pnpm build` after making changes to ensure the `dist` files are updated, especially before running the CLIs.
    *   Run `pnpm test` to verify changes.
    *   Use `pnpm` for all package management tasks.
    *   Follow the existing directory structure and naming conventions within each package.
    *   Check `package.json` in each package for specific dependencies and scripts.

*   **DON'T:**
    *   Use `npm` or `yarn`. This project relies on `pnpm`.
    *   Commit code that fails linting or type checking.
    *   Introduce circular dependencies between packages.

## Common Pitfalls

*   **Running CLIs without building:** The CLI scripts (e.g., `pnpm ai`, `pnpm wp-plugins`) run the compiled code from the `dist` directory. If you change the TypeScript source but don't run `pnpm build`, your changes won't be reflected when running the CLI.
*   **Dependency Management:** Remember to add dependencies to the specific package's `package.json`, not just the root `package.json`, unless it's a dev dependency used globally.
