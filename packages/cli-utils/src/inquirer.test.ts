import { input } from "@inquirer/prompts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { promptMissingOptions } from "./inquirer";

vi.mock("@inquirer/prompts", () => ({
  confirm: vi.fn(),
  input: vi.fn(),
  select: vi.fn(),
}));

const aspectRatioOption = {
  argname: "-a, --aspect-ratio <aspectRatio>",
  description: "Aspect ratio to crop to (e.g. 16:9, 4:3)",
  required: true,
};

describe("promptMissingOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a prompted hyphenated flag under its camelCase name", async () => {
    vi.mocked(input).mockResolvedValue("1:1");

    const result = await promptMissingOptions([aspectRatioOption], {});

    expect(result["aspectRatio"]).toBe("1:1");
    expect(result["aspect-ratio"]).toBeUndefined();
  });

  it("keeps a camelCase value already provided by the CLI", async () => {
    const result = await promptMissingOptions([aspectRatioOption], {
      aspectRatio: "16:9",
    });

    expect(input).not.toHaveBeenCalled();
    expect(result["aspectRatio"]).toBe("16:9");
  });
});
