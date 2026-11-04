import fs from "node:fs/promises";
import path from "node:path";

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
  } catch {
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
  } catch {
    return false;
  }
}

/**
 * Reads a file as text.
 *
 * @param opts.filePath - The path to the file.
 * @param opts.encoding - Optional. The encoding to use when reading the file. Default "utf-8".
 * @returns A promise that resolves to the file content as a string.
 */
export async function readTextFile(opts: {
  encoding?: BufferEncoding;
  filePath: string;
}): Promise<string> {
  const { encoding = "utf-8", filePath } = opts;
  try {
    return await fs.readFile(filePath, { encoding });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`, { cause: error });
    }

    throw new Error(`Failed to read file: ${filePath}`, { cause: error });
  }
}

/**
 * Writes text to a file.
 *
 * @param opts.filePath - The path to the file.
 * @param opts.content - The content to write to the file.
 * @param opts.encoding - Optional. The encoding to use when writing the file. Default "utf-8".
 * @param opts.createDir - Optional. Whether to create the directory if it doesn't exist. Default true.
 * @param opts.overwrite - Optional. Whether to overwrite the file if it already exists. Default true.
 * @returns A promise that resolves when the file is written.
 */
export async function writeTextFile(opts: {
  content: string;
  createDir?: boolean;
  encoding?: BufferEncoding;
  filePath: string;
  overwrite?: boolean;
}): Promise<void> {
  const {
    content,
    createDir = true,
    encoding = "utf-8",
    filePath,
    overwrite = true,
  } = opts;
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
  } catch (error) {
    throw new Error(`Failed to write file: ${filePath}`, { cause: error });
  }
}

/**
 * Reads a file as binary data.
 *
 * @param filePath - The path to the file.
 * @returns A promise that resolves to the file content as a Buffer.
 */
export async function readBinaryFile(filePath: string): Promise<Buffer> {
  try {
    return await fs.readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`File not found: ${filePath}`, { cause: error });
    }

    throw new Error(`Failed to read file: ${filePath}`, { cause: error });
  }
}

/**
 * Writes binary data to a file.
 *
 * @param opts.filePath - The path to the file.
 * @param opts.content - The content to write to the file as a Buffer.
 * @param opts.createDir - Optional. Whether to create the directory if it doesn't exist. Default true.
 * @param opts.overwrite - Optional. Whether to overwrite the file if it already exists. Default true.
 * @returns A promise that resolves when the file is written.
 */
export async function writeBinaryFile(opts: {
  content: Buffer;
  createDir?: boolean;
  filePath: string;
  overwrite?: boolean;
}): Promise<void> {
  const { content, createDir = true, filePath, overwrite = true } = opts;
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
    await fs.writeFile(filePath, content);
  } catch (error) {
    throw new Error(`Failed to write file: ${filePath}`, { cause: error });
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
  } catch (error) {
    throw new Error(`Failed to create directory: ${dirPath}`, { cause: error });
  }
}
