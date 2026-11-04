import {
  logger,
  normalizeAbsolutePath,
  readBinaryFile,
  writeBinaryFile,
} from "@felixarntz/cli-utils";
import { fileTypeFromBuffer } from "file-type";
import sharpLib from "sharp";

export interface ImageData {
  buffer: Buffer<ArrayBufferLike>;
  ext: string;
  mime: string;
}

interface ImageOutputData {
  buffer: Buffer<ArrayBufferLike>;
  ext?: string;
  fileBase: string;
  index?: number;
  mime?: string;
}

/**
 * Opens an image buffer and applies its EXIF orientation.
 *
 * The sharp library leaves stored pixels untouched and drops the orientation
 * tag when writing a new file. Viewers apply that tag, so a photo stored
 * upside down would otherwise be written upside down.
 */
export function sharp(
  buffer: Buffer<ArrayBufferLike>
): ReturnType<typeof sharpLib> {
  return sharpLib(buffer).rotate();
}

/**
 * Returns the image with pixels matching how a viewer displays it.
 *
 * An upright photo is returned unchanged. A photo that needs rotating is
 * rewritten at maximum quality, because a later save compresses it again.
 */
export async function ensureCorrectOrientation(
  image: ImageData
): Promise<ImageData> {
  const metadata = await sharpLib(image.buffer).metadata();
  if (metadata.orientation === undefined || metadata.orientation === 1) {
    return image;
  }

  let pipeline = sharp(image.buffer);
  switch (metadata.format) {
    case "jpeg":
      pipeline = pipeline.jpeg({ chromaSubsampling: "4:4:4", quality: 100 });
      break;
    case "webp":
      pipeline = pipeline.webp({ lossless: true });
      break;
    case "heif":
      pipeline = pipeline.heif({ lossless: true });
      break;
    default:
      break;
  }

  return {
    ...image,
    buffer: await pipeline.toBuffer(),
  };
}

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
  if (!fileType.mime.startsWith("image/")) {
    throw new Error(
      `File ${filePath} is not an image (detected type: ${fileType.mime})`
    );
  }

  return {
    buffer,
    ext: fileType.ext,
    mime: fileType.mime,
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
  outputData: ImageOutputData
): Promise<string> {
  let extension = "png";
  if (outputData.ext) {
    extension = outputData.ext;
  } else if (outputData.mime) {
    extension =
      outputData.mime === "image/jpeg" ? "jpg" : outputData.mime.split("/")[1];
  } else {
    logger.debug(
      "No MIME type or extension provided for image; trying to detect from buffer"
    );
    const fileType = await fileTypeFromBuffer(outputData.buffer);
    if (fileType) {
      extension = fileType.ext;
    } else {
      logger.debug(
        "Unable to detect file type from buffer; defaulting to png extension"
      );
    }
  }

  let filename: string;
  if (outputData.index === undefined) {
    filename = `${outputData.fileBase}.${extension}`;
  } else {
    filename = `${outputData.fileBase.replace("%%number%%", String(outputData.index + 1))}.${extension}`;
  }

  const filePath = normalizeAbsolutePath(filename);
  await writeBinaryFile(filePath, outputData.buffer);
  return filePath;
}
