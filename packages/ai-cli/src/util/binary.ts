import { fileTypeFromBuffer } from 'file-type';

/**
 * Converts a base64-encoded string to a Buffer.
 *
 * @param base64Data - The base64-encoded binary data.
 * @returns The Buffer containing the binary data.
 * @throws Error if decoding fails.
 */
export function base64ToBuffer(base64Data: string): Buffer {
  try {
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    throw new Error(
      `Failed to convert base64 to Buffer: ${(error as Error).message}`,
    );
  }
}

/**
 * Converts a Buffer to a base64-encoded string.
 *
 * @param buffer - The Buffer containing the binary data.
 * @returns The base64-encoded string.
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Converts a Uint8Array to a Buffer.
 *
 * @param uint8ArrayData - The Uint8Array containing the binary data.
 * @returns The Buffer containing the binary data.
 */
export function uint8ArrayToBuffer(uint8ArrayData: Uint8Array): Buffer {
  return Buffer.from(uint8ArrayData);
}

/**
 * Converts a Buffer to a Uint8Array.
 *
 * @param buffer - The Buffer containing the binary data.
 * @returns The Uint8Array containing the binary data.
 */
export function bufferToUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * Converts a base64-encoded string to a data URI.
 *
 * @param base64Data - The base64-encoded binary data.
 * @param mime - Optional. The MIME type to use. If not provided, it will be detected automatically.
 * @returns A promise that resolves to the data URI string.
 * @throws Error if the file type cannot be detected when not provided.
 */
export async function base64ToDataUri(
  base64Data: string,
  mime?: string,
): Promise<string> {
  if (mime) {
    return `data:${mime};base64,${base64Data}`;
  }
  const buffer = base64ToBuffer(base64Data);
  const type = await fileTypeFromBuffer(buffer);
  if (!type) {
    throw new Error('Unable to detect file type from base64 data');
  }
  return `data:${type.mime};base64,${base64Data}`;
}

/**
 * Converts a data URI to a base64-encoded string.
 *
 * @param dataUri - The data URI string.
 * @returns The base64-encoded binary data.
 * @throws Error if the data URI is invalid.
 */
export function dataUriToBase64(dataUri: string): string {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid data URI format');
  }
  return match[1];
}
