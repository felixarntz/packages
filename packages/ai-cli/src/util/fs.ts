import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Checks if a file exists.
 *
 * @param filePath - The path to the file.
 * @returns A promise that resolves to true if the file exists, false otherwise.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (_) {
    return false;
  }
}

/**
 * Check if a directory exists.
 *
 * @param dirPath - The path to the directory.
 * @returns A promise that resolves to true if the directory exists, false otherwise.
 */
export async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (_) {
    return false;
  }
}

/**
 * Reads a file as text.
 *
 * @param filePath - The path to the file.
 * @param encoding - Optional. The encoding to use when reading the file. Default "utf-8".
 * @returns A promise that resolves to the file content as a string.
 */
export async function readTextFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8',
): Promise<string> {
  try {
    return await fs.readFile(filePath, { encoding });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }

    throw new Error(`Failed to read file: ${filePath}`);
  }
}

/**
 * Writes text to a file.
 *
 * @param filePath - The path to the file.
 * @param content - The content to write to the file.
 * @param encoding - Optional. The encoding to use when writing the file. Default "utf-8".
 * @param createDir - Optional. Whether to create the directory if it doesn't exist. Default true.
 * @param overwrite - Optional. Whether to overwrite the file if it already exists. Default true.
 * @returns A promise that resolves when the file is written.
 */
export async function writeTextFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8',
  createDir: boolean = true,
  overwrite: boolean = true,
): Promise<void> {
  // Ensure directory exists if createDir is true.
  if (createDir) {
    const dirPath = path.dirname(filePath);
    await ensureDirectory(dirPath);
  }

  // If overwrite is false, check if file exists.
  if (!overwrite) {
    const exists = await fileExists(filePath);
    if (exists) {
      throw new Error(`File already exists: ${filePath}`);
    }
  }

  try {
    // Write the file.
    await fs.writeFile(filePath, content, { encoding });
  } catch (_) {
    throw new Error(`Failed to write file: ${filePath}`);
  }
}

/**
 * Creates a directory if it doesn't exist.
 *
 * @param dirPath - The path to the directory.
 * @returns A promise that resolves when the directory is created.
 */
async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    if (!(await directoryExists(dirPath))) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  } catch (_) {
    throw new Error(`Failed to create directory: ${dirPath}`);
  }
}
