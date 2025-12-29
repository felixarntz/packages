# @felixarntz/cli-utils

Utility functions for TypeScript CLI tools, using Commander and Inquirer.

## Features

- **Commander helpers:** Utilities to simplify working with [Commander](https://www.npmjs.com/package/commander), such as extracting arguments and options from action handlers.
- **Inquirer helpers:** Utilities to simplify working with [Inquirer](https://www.npmjs.com/package/inquirer), such as prompting for missing command options.
- **File system:** Async wrappers for common file system operations like checking if a file exists, reading/writing text files, etc.
- **Logger:** A simple logger with support for different log levels (debug, info, success, warn, error) and colored output, logging to stderr.
- **Output:** Utilities for printing command output to stdout.
- **Paths:** Utilities for working with file paths, such as normalizing absolute paths.
- **Heartbeat:** A utility to run a long-running task with a periodic "heartbeat" log message.
