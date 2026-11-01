import { describe, expect, it, vi } from "vitest";

import {
  base64ToBuffer,
  base64ToDataUri,
  bufferToBase64,
  bufferToUint8Array,
  dataUriToBase64,
  uint8ArrayToBuffer,
} from "./binary";

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("base64ToBuffer", () => {
  it("decodes a base64 string into the original bytes", () => {
    const buffer = base64ToBuffer(Buffer.from("hello").toString("base64"));

    expect(buffer.toString("utf8")).toBe("hello");
  });

  it("wraps decoder failures", () => {
    vi.spyOn(Buffer, "from").mockImplementation(() => {
      throw new Error("bad encoding");
    });

    expect(() => base64ToBuffer("aaaa")).toThrow(
      "Failed to convert base64 to Buffer: bad encoding"
    );

    vi.restoreAllMocks();
  });
});

describe("bufferToBase64", () => {
  it("encodes a buffer as base64", () => {
    expect(bufferToBase64(Buffer.from("hello"))).toBe(
      Buffer.from("hello").toString("base64")
    );
  });
});

describe("uint8ArrayToBuffer", () => {
  it("copies uint8 array bytes into a buffer", () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);

    expect(uint8ArrayToBuffer(bytes)).toEqual(Buffer.from([1, 2, 3, 4]));
  });
});

describe("bufferToUint8Array", () => {
  it("copies buffer bytes into a uint8 array", () => {
    const bytes = bufferToUint8Array(Buffer.from([9, 8, 7]));

    expect(Array.from(bytes)).toEqual([9, 8, 7]);
  });
});

describe("base64ToDataUri", () => {
  it("uses the provided MIME type", async () => {
    await expect(base64ToDataUri("abc", "image/png")).resolves.toBe(
      "data:image/png;base64,abc"
    );
  });

  it("detects the MIME type from the payload", async () => {
    await expect(base64ToDataUri(PNG_BASE64)).resolves.toBe(
      `data:image/png;base64,${PNG_BASE64}`
    );
  });

  it("rejects a payload whose type cannot be detected", async () => {
    const base64Data = Buffer.from("not an image").toString("base64");

    await expect(base64ToDataUri(base64Data)).rejects.toThrow(
      "Unable to detect file type from base64 data"
    );
  });
});

describe("dataUriToBase64", () => {
  it("returns the base64 payload", () => {
    expect(dataUriToBase64("data:image/png;base64,abc123")).toBe("abc123");
  });

  it("rejects a data URI that is not base64", () => {
    expect(() => dataUriToBase64("https://example.com/image.png")).toThrow(
      "Invalid data URI format"
    );
  });
});
