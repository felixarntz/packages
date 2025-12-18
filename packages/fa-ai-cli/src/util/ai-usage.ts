import type { LanguageModelUsage } from 'ai';
import type {
  LanguageModelV2Usage,
  SharedV2ProviderMetadata,
  ImageModelV2ProviderMetadata,
  LanguageModelV3Usage,
  SharedV3ProviderMetadata,
  ImageModelV3ProviderMetadata,
  JSONValue,
} from '@ai-sdk/provider';
import { logger } from 'fa-cli-utils';

/**
 * Logs the token usage details from a language model response.
 *
 * @param tokenUsage - The token usage object containing input, output, reasoning (optional), and total token counts.
 */
export function logTokenUsage(
  tokenUsage: LanguageModelUsage | LanguageModelV2Usage | LanguageModelV3Usage,
): void {
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let reasoningTokens: number | undefined;
  let totalTokens: number | undefined;
  if (typeof tokenUsage.inputTokens === 'object') {
    // V3 Usage.
    inputTokens = tokenUsage.inputTokens.total;
  } else {
    inputTokens = tokenUsage.inputTokens;
  }
  if (typeof tokenUsage.outputTokens === 'object') {
    // V3 Usage.
    outputTokens = tokenUsage.outputTokens.total;
    if (tokenUsage.outputTokens.reasoning !== undefined) {
      reasoningTokens = tokenUsage.outputTokens.reasoning;
    }
  } else {
    outputTokens = tokenUsage.outputTokens;

    if (
      'reasoningTokens' in tokenUsage &&
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      tokenUsage.reasoningTokens !== undefined
    ) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      reasoningTokens = tokenUsage.reasoningTokens;
    }
  }
  if (!('totalTokens' in tokenUsage) || tokenUsage.totalTokens === undefined) {
    // V3 Usage.
    totalTokens =
      inputTokens !== undefined && outputTokens !== undefined
        ? inputTokens + outputTokens
        : undefined;
  } else {
    totalTokens = tokenUsage.totalTokens;
  }

  const tokenUsageLogLines = [
    `Token usage:`,
    `  Input tokens: ${inputTokens}`,
    `  Output tokens: ${outputTokens}`,
  ];
  if (reasoningTokens !== undefined) {
    tokenUsageLogLines.push(`  Reasoning tokens: ${reasoningTokens}`);
  }
  tokenUsageLogLines.push(`  Total tokens: ${totalTokens}`);
  logger.debug(tokenUsageLogLines.join('\n'));
}

/**
 * Logs the cost from the provider metadata.
 *
 * @param providerMetadata - The shared provider metadata containing cost information.
 */
export function logCost(
  providerMetadata:
    | SharedV2ProviderMetadata
    | ImageModelV2ProviderMetadata
    | SharedV3ProviderMetadata
    | ImageModelV3ProviderMetadata
    | undefined,
): void {
  if (typeof providerMetadata?.['gateway'] !== 'object') {
    return;
  }

  const gatewayMetadata = providerMetadata['gateway'] as Record<
    string,
    JSONValue
  >;

  if (gatewayMetadata['cost'] !== undefined) {
    logger.debug(`Cost: $${gatewayMetadata['cost']}`);
  }
}
