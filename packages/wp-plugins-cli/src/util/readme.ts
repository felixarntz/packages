import path from 'node:path';
import { fileExists } from '@felixarntz/cli-utils';

/**
 * Gets the path to the plugin readme file.
 *
 * @param pluginPath - Absolute path to the plugin directory.
 * @returns The plugin readme file path.
 */
export async function getReadmeFilePath(pluginPath: string): Promise<string> {
  if (await fileExists(path.join(pluginPath, 'readme.txt'))) {
    return path.join(pluginPath, 'readme.txt');
  }
  if (await fileExists(path.join(pluginPath, 'readme.md'))) {
    return path.join(pluginPath, 'readme.md');
  }
  if (await fileExists(path.join(pluginPath, 'README.md'))) {
    return path.join(pluginPath, 'README.md');
  }
  throw new Error(
    'No readme.txt or readme.md file found in the plugin directory.',
  );
}
