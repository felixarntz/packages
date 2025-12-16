import { describe, it, expect } from 'vitest';
import { getReasoningProviderOptions } from './reasoning';

describe('getReasoningProviderOptions', () => {
  describe('when reasoningEffort is "minimal"', () => {
    it('should return correct options without model', () => {
      const result = getReasoningProviderOptions('minimal');
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'disabled',
            budgetTokens: 0,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
        openai: {
          reasoningEffort: 'minimal',
        },
        xai: {
          reasoningEffort: 'low',
        },
      });
    });

    it('should return correct options with non-Gemini model', () => {
      const result = getReasoningProviderOptions('minimal', 'openai/gpt-4');
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'disabled',
            budgetTokens: 0,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
        openai: {
          reasoningEffort: 'minimal',
        },
        xai: {
          reasoningEffort: 'low',
        },
      });
    });

    it('should return correct options with Gemini 2.5 Pro model', () => {
      const result = getReasoningProviderOptions(
        'minimal',
        'google/gemini-2.5-pro',
      );
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'disabled',
            budgetTokens: 0,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 128,
          },
        },
        openai: {
          reasoningEffort: 'minimal',
        },
        xai: {
          reasoningEffort: 'low',
        },
      });
    });
  });

  describe('when reasoningEffort is "low"', () => {
    it('should return correct options without model', () => {
      const result = getReasoningProviderOptions('low');
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 1024,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 1024,
          },
        },
        openai: {
          reasoningEffort: 'low',
        },
        xai: {
          reasoningEffort: 'low',
        },
      });
    });

    it('should return correct options with model', () => {
      const result = getReasoningProviderOptions('low', 'some-model');
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 1024,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 1024,
          },
        },
        openai: {
          reasoningEffort: 'low',
        },
        xai: {
          reasoningEffort: 'low',
        },
      });
    });
  });

  describe('when reasoningEffort is "high"', () => {
    it('should return correct options without model', () => {
      const result = getReasoningProviderOptions('high');
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 16384,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 16384,
          },
        },
        openai: {
          reasoningEffort: 'high',
        },
        xai: {
          reasoningEffort: 'high',
        },
      });
    });

    it('should return correct options with model', () => {
      const result = getReasoningProviderOptions('high', 'another-model');
      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 16384,
          },
        },
        google: {
          thinkingConfig: {
            thinkingBudget: 16384,
          },
        },
        openai: {
          reasoningEffort: 'high',
        },
        xai: {
          reasoningEffort: 'high',
        },
      });
    });
  });
});
