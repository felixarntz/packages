# NPM Packages Monorepo - Coding Agent Guide

## Project Overview

This monorepo contains various NPM packages maintained by Felix Arntz, primarily for personal use. It includes CLI tools for AI operations, WordPress plugin management, a digital business card CLI, and shared CLI utilities. The project is structured as a monorepo using pnpm workspaces.

## Commands & Scripts

*   `pnpm install` - Install dependencies.
*   `pnpm build` - Build all packages.
*   `pnpm test` - Run all tests.
*   `pnpm check` - Check code style.
*   `pnpm fix` - Auto-fix linting issues.
*   `pnpm typecheck` - Run TypeScript type checking.

To run any of these commands for a specific package, use `pnpm --filter <package> <command>`. Examples:

- `pnpm --filter felixarntz test` - Run tests only for the `felixarntz` package
- `pnpm --filter @felixarntz/wp-plugins-cli build` - Build only the `@felixarntz/wp-plugins-cli` package

For a comprehensive list and more details, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## Coding Standards & Compatibility Constraints

*   **Node.js:** Version 22.12.0 or higher is required.
*   **Package Manager:** `pnpm` is required. Do not use `npm` or `yarn`.
*   **Language:** All code is written in TypeScript (`pnpm typecheck`).
*   **Linting:** Code must pass lint checks (`pnpm check`).

For more details on contribution guidelines, please refer to [CONTRIBUTING.md](./CONTRIBUTING.md).

## Core Principles

*   **Monorepo Structure:** The project uses `pnpm` workspaces to manage multiple packages within a single repository. Dependencies are installed at the root.
*   **TypeScript:** All packages are written in TypeScript. Type safety is a priority.
*   **Testing:** `vitest` is used for testing. All new features and bug fixes must include tests.
*   **Linting & Formatting:** `eslint` and `prettier` are used to enforce code style and quality.
*   **Modern Node.js:** The project targets modern Node.js environments (>=22.12.0) and uses ESM.

## Project Architecture Overview

The project is a collection of independent packages that may share common utilities.
*   **CLI Tools:** `ai-cli`, `felixarntz`, and `wp-plugins-cli` are executable CLI applications.
*   **Shared Libraries:** `cli-utils` provides common functionality used by the CLI tools, such as logging, file system operations, and command-line interface helpers.

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


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
