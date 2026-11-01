import path from "node:path";

import {
  logger,
  normalizeAbsolutePath,
  readBinaryFile,
  writeBinaryFile,
} from "@felixarntz/cli-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readImageFile, writeImageFile } from "./images";

vi.mock("@felixarntz/cli-utils", async () => {
  const actual = await vi.importActual<typeof import("@felixarntz/cli-utils")>(
    "@felixarntz/cli-utils"
  );

  return {
    ...actual,
    normalizeAbsolutePath: vi.fn((filename: string) =>
      path.join("/out", filename)
    ),
    readBinaryFile: vi.fn(),
    writeBinaryFile: vi.fn(),
  };
});

const PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const PDF_BUFFER = Buffer.from("%PDF-1.4\n");

describe("readImageFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the buffer, MIME type, and extension of an image", async () => {
    vi.mocked(readBinaryFile).mockResolvedValue(PNG_BUFFER);

    await expect(readImageFile("photo.png")).resolves.toEqual({
      buffer: PNG_BUFFER,
      mime: "image/png",
      ext: "png",
    });
    expect(readBinaryFile).toHaveBeenCalledWith("photo.png");
  });

  it("rejects a file whose type cannot be detected", async () => {
    vi.mocked(readBinaryFile).mockResolvedValue(Buffer.from([0, 1, 2, 3]));

    await expect(readImageFile("mystery.bin")).rejects.toThrow(
      "Unable to determine file type of mystery.bin"
    );
  });

  it("rejects a file that is not an image", async () => {
    vi.mocked(readBinaryFile).mockResolvedValue(PDF_BUFFER);

    await expect(readImageFile("notes.pdf")).rejects.toThrow(
      "File notes.pdf is not an image (detected type: application/pdf)"
    );
  });
});

describe("writeImageFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(logger, "debug").mockImplementation(() => undefined);
  });

  it("uses the provided extension", async () => {
    const buffer = Buffer.from("webp-bytes");

    await expect(
      writeImageFile({
        buffer,
        ext: "webp",
        fileBase: "edited",
      })
    ).resolves.toBe(path.join("/out", "edited.webp"));

    expect(normalizeAbsolutePath).toHaveBeenCalledWith("edited.webp");
    expect(writeBinaryFile).toHaveBeenCalledWith(
      path.join("/out", "edited.webp"),
      buffer
    );
  });

  it("maps a JPEG MIME type to a jpg extension", async () => {
    await expect(
      writeImageFile({
        buffer: Buffer.from("jpeg-bytes"),
        mime: "image/jpeg",
        fileBase: "edited",
      })
    ).resolves.toBe(path.join("/out", "edited.jpg"));
  });

  it("derives other extensions from the MIME subtype", async () => {
    await expect(
      writeImageFile({
        buffer: Buffer.from("png-bytes"),
        mime: "image/png",
        fileBase: "edited",
      })
    ).resolves.toBe(path.join("/out", "edited.png"));
  });

  it("numbers the file when an index is provided", async () => {
    await expect(
      writeImageFile({
        buffer: PNG_BUFFER,
        ext: "png",
        fileBase: "frame-%%number%%",
        index: 0,
      })
    ).resolves.toBe(path.join("/out", "frame-1.png"));
  });

  it("detects the extension from the buffer", async () => {
    await expect(
      writeImageFile({
        buffer: PNG_BUFFER,
        fileBase: "detected",
      })
    ).resolves.toBe(path.join("/out", "detected.png"));

    expect(logger.debug).toHaveBeenCalledWith(
      "No MIME type or extension provided for image; trying to detect from buffer"
    );
  });

  it("defaults to png when the buffer type cannot be detected", async () => {
    await expect(
      writeImageFile({
        buffer: Buffer.from("not an image"),
        fileBase: "fallback",
      })
    ).resolves.toBe(path.join("/out", "fallback.png"));

    expect(logger.debug).toHaveBeenCalledWith(
      "Unable to detect file type from buffer; defaulting to png extension"
    );
  });
});
