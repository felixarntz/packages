# @felixarntz/wp-plugins-cli

CLI with various tools for WordPress plugin maintenance.

## Available commands

### `bump-tested-wp`

Bumps the Tested Up To WordPress version in the plugin readme and commits the change.

```bash
wp-plugins bump-tested-wp /path/to/plugin -version 7.0
```

### `generate-changelog`

Generates a changelog based on the commit history since the last tag.

```bash
wp-plugins generate-changelog /path/to/plugin --tag 1.2.3
```

### `get-plugins`

Gets the directories of all plugins within the directory.

```bash
wp-plugins get-plugins /path/to/plugins --vendor felixarntz
```

Combine the output with `xargs` to act on all the plugins in bulk. For example:

```bash
wp-plugins get-plugins /path/to/plugins -v felixarntz | xargs -I {} wp-plugins bump-tested-wp {} -v 7.0
```

### `update-since`

Updates "n.e.x.t" tags with the current release version.

```bash
wp-plugins update-since /path/to/plugin -version 1.2.0
```

### `verify-versions`

Verifies consistency of versions in a plugin.

```bash
wp-plugins verify-versions /path/to/plugin
```
