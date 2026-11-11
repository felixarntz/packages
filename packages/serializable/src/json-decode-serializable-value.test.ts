import { describe, expect, it } from "vitest";
import { jsonDecodeSerializableValue } from "./json-decode-serializable-value";

describe("jsonDecodeSerializableValue", () => {
  it("rejects a tag whose type is not recognized", () => {
    expect(() =>
      jsonDecodeSerializableValue({
        // biome-ignore lint/style/useNamingConvention: wire-format tag key
        __felixarntz_serializable__: "unknown",
      })
    ).toThrow("Invalid serialized SerializableValue.");
  });
});
