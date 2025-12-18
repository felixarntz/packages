import {
  readBinaryFile,
  writeBinaryFile,
  normalizeAbsolutePath,
  logger,
} from 'fa-cli-utils';
import { fileTypeFromBuffer } from 'file-type';

export type ImageData = {
  buffer: Buffer<ArrayBufferLike>;
  mime: string;
  ext: string;
};

type ImageOutputData = {
  fileBase: string;
  buffer: Buffer<ArrayBufferLike>;
  mime?: string;
  ext?: string;
  index?: number;
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

/**
 * Writes an image file to disk based on the provided output data.
 *
 * Determines the file extension from the output data's extension, MIME type, or by detecting from the buffer.
 * Constructs the filename using the base name and index if provided.
 *
 * @param outputData - The image output data containing buffer, file base name, optional index, extension, and MIME type.
 * @returns A promise that resolves to the absolute file path of the written image file.
 */
export async function writeImageFile(
  outputData: ImageOutputData,
): Promise<string> {
  let extension = 'png';
  if (outputData.ext) {
    extension = outputData.ext;
  } else if (outputData.mime) {
    extension =
      outputData.mime === 'image/jpeg' ? 'jpg' : outputData.mime.split('/')[1];
  } else {
    logger.debug(
      'No MIME type or extension provided for image; trying to detect from buffer',
    );
    const fileType = await fileTypeFromBuffer(outputData.buffer);
    if (fileType) {
      extension = fileType.ext;
    } else {
      logger.debug(
        'Unable to detect file type from buffer; defaulting to png extension',
      );
    }
  }

  let filename: string;
  if (outputData.index !== undefined) {
    filename = `${outputData.fileBase.replace('%%number%%', String(outputData.index + 1))}.${extension}`;
  } else {
    filename = `${outputData.fileBase}.${extension}`;
  }

  const filePath = normalizeAbsolutePath(filename);
  await writeBinaryFile(filePath, outputData.buffer);
  return filePath;
}
