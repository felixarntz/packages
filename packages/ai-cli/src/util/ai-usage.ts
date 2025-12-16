import type { LanguageModelUsage } from 'ai';
import type {
  LanguageModelV2Usage,
  SharedV2ProviderMetadata,
  ImageModelV2ProviderMetadata,
  SharedV3ProviderMetadata,
  ImageModelV3ProviderMetadata,
  JSONValue,
} from '@ai-sdk/provider';
import { logger } from './logger';

/**
 * Logs the token usage details from a language model response.
 *
 * @param tokenUsage - The token usage object containing input, output, reasoning (optional), and total token counts.
 */
export function logTokenUsage(
  tokenUsage: LanguageModelUsage | LanguageModelV2Usage,
): void {
  const tokenUsageLogLines = [
    `Token usage:`,
    `  Input tokens: ${tokenUsage.inputTokens}`,
    `  Output tokens: ${tokenUsage.outputTokens}`,
  ];
  if (tokenUsage.reasoningTokens !== undefined) {
    tokenUsageLogLines.push(
      `  Reasoning tokens: ${tokenUsage.reasoningTokens}`,
    );
  }
  tokenUsageLogLines.push(`  Total tokens: ${tokenUsage.totalTokens}`);
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
