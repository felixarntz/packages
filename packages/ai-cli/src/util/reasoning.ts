import type { SharedV2ProviderOptions } from '@ai-sdk/provider';

/**
 * Generates provider-specific options for reasoning based on the specified effort level and optional model.
 *
 * This function configures options for Anthropic, Google, OpenAI, and XAI providers to control reasoning behavior.
 * For 'minimal' effort, it disables or minimizes reasoning.
 *
 * @param reasoningEffort - The level of reasoning effort: 'minimal', 'low', or 'high'.
 * @param model - Optional model identifier, used specifically for Google Gemini models to adjust thinking budget.
 * @returns An object containing provider-specific options conforming to SharedV2ProviderOptions.
 */
export function getReasoningProviderOptions(
  reasoningEffort: 'minimal' | 'low' | 'high',
  model?: string,
): SharedV2ProviderOptions {
  if (reasoningEffort === 'minimal') {
    return {
      anthropic: {
        thinking: {
          type: 'disabled',
          budgetTokens: 0,
        },
      },
      google: {
        thinkingConfig: {
          // Can't disable thinking for Gemini 2.5 Pro.
          thinkingBudget: model === 'google/gemini-2.5-pro' ? 128 : 0,
        },
      },
      openai: {
        reasoningEffort: 'minimal',
      },
      xai: {
        reasoningEffort: 'low',
      },
    };
  }

  const budget = reasoningEffort === 'low' ? 1024 : 16384;

  return {
    anthropic: {
      thinking: {
        type: 'enabled',
        budgetTokens: budget,
      },
    },
    google: {
      thinkingConfig: {
        thinkingBudget: budget,
      },
    },
    openai: {
      reasoningEffort,
    },
    xai: {
      reasoningEffort,
    },
  };
}
