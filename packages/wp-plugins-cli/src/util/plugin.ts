import path from "node:path";
import { fileExists, readTextFile } from "@felixarntz/cli-utils";
import glob from "fast-glob";

const PLUGIN_NAME_REGEX = /Plugin Name:\s+.+/;

/**
 * Checks whether the given directory is a WordPress plugin.
 *
 * @param directoryPath - Absolute path to the directory to check.
 * @returns True if the directory is a WordPress plugin, false otherwise.
 */
export async function isWordPressPlugin(
  directoryPath: string
): Promise<boolean> {
  // Check for readme.txt (most common for WP plugins)
  if (await fileExists(path.join(directoryPath, "readme.txt"))) {
    return true;
  }

  // Check for main plugin file
  const phpFiles = await glob("*.php", {
    cwd: directoryPath,
    absolute: true,
    deep: 1,
  });

  for (const file of phpFiles) {
    const content = await readTextFile(file);
    if (content.match(PLUGIN_NAME_REGEX)) {
      return true;
    }
  }

  return false;
}
