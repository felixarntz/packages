import type {
  LanguageModelV2Usage,
  LanguageModelV3Usage,
  SharedV2ProviderMetadata,
} from "@ai-sdk/provider";
import { logger } from "@felixarntz/cli-utils";
import type { LanguageModelUsage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logCost, logTokenUsage } from "./ai-usage";

describe("logTokenUsage", () => {
  beforeEach(() => {
    vi.spyOn(logger, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs flat token counts, including reasoning tokens", () => {
    const tokenUsage: LanguageModelV2Usage = {
      inputTokens: 3,
      outputTokens: 4,
      reasoningTokens: 2,
      totalTokens: 10,
    };

    logTokenUsage(tokenUsage);

    expect(logger.debug).toHaveBeenCalledWith(
      [
        "Token usage:",
        "  Input tokens: 3",
        "  Output tokens: 4",
        "  Reasoning tokens: 2",
        "  Total tokens: 10",
      ].join("\n")
    );
  });

  it("logs current language model usage without a reasoning line", () => {
    const tokenUsage: LanguageModelUsage = {
      inputTokenDetails: {
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
        noCacheTokens: 10,
      },
      inputTokens: 10,
      outputTokenDetails: {
        reasoningTokens: undefined,
        textTokens: 5,
      },
      outputTokens: 5,
      totalTokens: 15,
    };

    logTokenUsage(tokenUsage);

    expect(logger.debug).toHaveBeenCalledWith(
      [
        "Token usage:",
        "  Input tokens: 10",
        "  Output tokens: 5",
        "  Total tokens: 15",
      ].join("\n")
    );
  });

  it("sums numeric input and output tokens when total tokens are omitted", () => {
    logTokenUsage({
      inputTokens: 2,
      outputTokens: 3,
    } as LanguageModelV2Usage);

    expect(logger.debug).toHaveBeenCalledWith(
      [
        "Token usage:",
        "  Input tokens: 2",
        "  Output tokens: 3",
        "  Total tokens: 5",
      ].join("\n")
    );
  });

  it("sums input and output when total tokens are undefined", () => {
    const tokenUsage: LanguageModelV2Usage = {
      inputTokens: 2,
      outputTokens: 3,
      totalTokens: undefined,
    };

    logTokenUsage(tokenUsage);

    expect(logger.debug).toHaveBeenCalledWith(
      [
        "Token usage:",
        "  Input tokens: 2",
        "  Output tokens: 3",
        "  Total tokens: 5",
      ].join("\n")
    );
  });

  it("reads nested usage and includes reasoning tokens", () => {
    const tokenUsage: LanguageModelV3Usage = {
      inputTokens: {
        cacheRead: 0,
        cacheWrite: 0,
        noCache: 8,
        total: 8,
      },
      outputTokens: {
        reasoning: 2,
        text: 1,
        total: 3,
      },
    };

    logTokenUsage(tokenUsage);

    expect(logger.debug).toHaveBeenCalledWith(
      [
        "Token usage:",
        "  Input tokens: 8",
        "  Output tokens: 3",
        "  Reasoning tokens: 2",
        "  Total tokens: 11",
      ].join("\n")
    );
  });

  it("leaves the total unset when a nested count is missing", () => {
    const tokenUsage: LanguageModelV3Usage = {
      inputTokens: {
        cacheRead: undefined,
        cacheWrite: undefined,
        noCache: undefined,
        total: undefined,
      },
      outputTokens: {
        reasoning: undefined,
        text: 4,
        total: 4,
      },
    };

    logTokenUsage(tokenUsage);

    expect(logger.debug).toHaveBeenCalledWith(
      [
        "Token usage:",
        "  Input tokens: undefined",
        "  Output tokens: 4",
        "  Total tokens: undefined",
      ].join("\n")
    );
  });
});

describe("logCost", () => {
  beforeEach(() => {
    vi.spyOn(logger, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the gateway cost", () => {
    const providerMetadata: SharedV2ProviderMetadata = {
      gateway: { cost: "0.02" },
    };

    logCost(providerMetadata);

    expect(logger.debug).toHaveBeenCalledWith("Cost: $0.02");
  });

  it("does nothing when metadata or gateway cost is absent", () => {
    logCost(undefined);
    logCost({});
    logCost({ gateway: {} });
    logCost({ other: { cost: "1" } });

    expect(logger.debug).not.toHaveBeenCalled();
  });
});
