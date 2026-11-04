import path from "node:path";

/**
 * Normalizes the given path to be an absolute path.
 *
 * @param opts.filePath - The path to normalize.
 * @param opts.rootDir - Optional. The root directory to use as the base for the path.
 * @returns The normalized path.
 */
export function normalizeAbsolutePath(opts: {
  filePath: string;
  rootDir?: string;
}): string {
  const { filePath, rootDir } = opts;
  const resolvedRootDir = rootDir ?? process.cwd();
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(resolvedRootDir, filePath);
}
