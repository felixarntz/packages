import path from "node:path";
import { fileExists, readTextFile } from "@felixarntz/cli-utils";
import glob from "fast-glob";

const PLUGIN_NAME_REGEX = /Plugin Name:\s+.+/u;

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
    absolute: true,
    cwd: directoryPath,
    deep: 1,
  });

  const contents = await Promise.all(
    phpFiles.map((file) => readTextFile(file))
  );
  return contents.some((content) => content.match(PLUGIN_NAME_REGEX));
}
