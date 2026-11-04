import path from "node:path";

import {
  logger,
  normalizeAbsolutePath,
  readBinaryFile,
  writeBinaryFile,
} from "@felixarntz/cli-utils";
import sharpLib from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ensureCorrectOrientation,
  type ImageData,
  readImageFile,
  sharp,
  writeImageFile,
} from "./images";

vi.mock("@felixarntz/cli-utils", async () => {
  const actual = await vi.importActual<typeof import("@felixarntz/cli-utils")>(
    "@felixarntz/cli-utils"
  );

  return {
    ...actual,
    normalizeAbsolutePath: vi.fn((opts: { filePath: string }) =>
      path.join("/out", opts.filePath)
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
      ext: "png",
      mime: "image/png",
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

    expect(normalizeAbsolutePath).toHaveBeenCalledWith({
      filePath: "edited.webp",
    });
    expect(writeBinaryFile).toHaveBeenCalledWith({
      content: buffer,
      filePath: path.join("/out", "edited.webp"),
    });
  });

  it("maps a JPEG MIME type to a jpg extension", async () => {
    await expect(
      writeImageFile({
        buffer: Buffer.from("jpeg-bytes"),
        fileBase: "edited",
        mime: "image/jpeg",
      })
    ).resolves.toBe(path.join("/out", "edited.jpg"));
  });

  it("derives other extensions from the MIME subtype", async () => {
    await expect(
      writeImageFile({
        buffer: Buffer.from("png-bytes"),
        fileBase: "edited",
        mime: "image/png",
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

const paintRaw = (opts: { width: number; height: number }): Buffer => {
  const { width, height } = opts;
  const raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 3;
      raw[offset] = y;
      raw[offset + 1] = x;
      raw[offset + 2] = 7;
    }
  }
  return raw;
};

const rotate180 = (opts: {
  raw: Buffer;
  width: number;
  height: number;
}): Buffer => {
  const { raw, width, height } = opts;
  const rotated = Buffer.alloc(raw.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * 3;
      const dst = ((height - 1 - y) * width + (width - 1 - x)) * 3;
      raw.copy(rotated, dst, src, src + 3);
    }
  }
  return rotated;
};

const pngWithOrientation = (opts: {
  width: number;
  height: number;
  orientation?: number;
}): Promise<Buffer> => {
  const { width, height, orientation } = opts;
  let pipeline = sharpLib(paintRaw({ height, width }), {
    raw: { channels: 3, height, width },
  }).png();
  if (orientation !== undefined) {
    pipeline = pipeline.withMetadata({ orientation });
  }
  return pipeline.toBuffer();
};

const imageFromBuffer = (buffer: Buffer): ImageData => ({
  buffer,
  ext: "png",
  mime: "image/png",
});

describe("ensureCorrectOrientation", () => {
  it("returns an upright image unchanged", async () => {
    const image = imageFromBuffer(
      await pngWithOrientation({ height: 2, width: 4 })
    );

    await expect(ensureCorrectOrientation(image)).resolves.toBe(image);
  });

  it("turns a 180 degree photo upright and keeps its type", async () => {
    const width = 4;
    const height = 2;
    const buffer = await pngWithOrientation({ height, orientation: 3, width });
    const image = imageFromBuffer(buffer);

    const result = await ensureCorrectOrientation(image);
    const stored = await sharpLib(buffer).raw().toBuffer();
    const oriented = await sharpLib(result.buffer).raw().toBuffer();
    const metadata = await sharpLib(result.buffer).metadata();

    expect(result).not.toBe(image);
    expect(result.ext).toBe("png");
    expect(result.mime).toBe("image/png");
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.width).toBe(width);
    expect(metadata.height).toBe(height);
    expect(oriented.equals(rotate180({ height, raw: stored, width }))).toBe(
      true
    );
  });

  it("swaps dimensions when the photo was stored on its side", async () => {
    const image = imageFromBuffer(
      await pngWithOrientation({ height: 2, orientation: 6, width: 4 })
    );

    const result = await ensureCorrectOrientation(image);
    const metadata = await sharpLib(result.buffer).metadata();

    expect(metadata.width).toBe(2);
    expect(metadata.height).toBe(4);
    expect(metadata.orientation).toBeUndefined();
  });

  it("keeps a JPEG as a JPEG", async () => {
    const raw = paintRaw({ height: 2, width: 4 });
    const buffer = await sharpLib(raw, {
      raw: { channels: 3, height: 2, width: 4 },
    })
      .jpeg()
      .withMetadata({ orientation: 3 })
      .toBuffer();
    const image: ImageData = {
      buffer,
      ext: "jpg",
      mime: "image/jpeg",
    };

    const result = await ensureCorrectOrientation(image);
    const metadata = await sharpLib(result.buffer).metadata();

    expect(result.ext).toBe("jpg");
    expect(result.mime).toBe("image/jpeg");
    expect(metadata.format).toBe("jpeg");
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.width).toBe(4);
    expect(metadata.height).toBe(2);
  });
});

describe("sharp", () => {
  it("leaves pixels unchanged when no orientation tag is present", async () => {
    const buffer = await pngWithOrientation({ height: 2, width: 4 });
    const stored = await sharpLib(buffer).raw().toBuffer();
    const oriented = await sharp(buffer).raw().toBuffer();

    expect(oriented.equals(stored)).toBe(true);
  });

  it("rotates stored pixels 180 degrees before a crop", async () => {
    const width = 4;
    const height = 2;
    const buffer = await pngWithOrientation({ height, orientation: 3, width });
    const stored = await sharpLib(buffer).raw().toBuffer();
    const oriented = await sharp(buffer).raw().toBuffer();
    const extracted = await sharp(buffer)
      .extract({ height, left: 0, top: 0, width })
      .raw()
      .toBuffer();

    expect(oriented.equals(rotate180({ height, raw: stored, width }))).toBe(
      true
    );
    expect(extracted.equals(oriented)).toBe(true);
  });
});
