import { fileTypeFromBuffer } from 'file-type';
import { readBinaryFile } from './fs';

export type ImageData = {
  buffer: Buffer<ArrayBufferLike>;
  mime: string;
  ext: string;
};

/**
 * Reads an image file from the specified file path and returns its data.
 *
 * @param filePath - The path to the image file to read.
 * @returns A promise that resolves to an object containing the file's buffer, MIME type, and extension.
 */
export async function readImageFile(filePath: string): Promise<ImageData> {
  const buffer = await readBinaryFile(filePath);

  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) {
    throw new Error(`Unable to determine file type of ${filePath}`);
  }
  if (!fileType.mime.startsWith('image/')) {
    throw new Error(
      `File ${filePath} is not an image (detected type: ${fileType.mime})`,
    );
  }

  return {
    buffer,
    mime: fileType.mime,
    ext: fileType.ext,
  };
}
