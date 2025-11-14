import { streamText } from 'ai';
import type { SharedV2ProviderOptions } from '@ai-sdk/provider';
import {
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
} from '../util/commander';
import {
  parseFileOptions,
  injectFileOptionsForCommander,
} from '../util/file-options';
import {
  promptMissingOptions,
  stripOptionFieldsForCommander,
} from '../util/inquirer';
import { logger } from '../util/logger';
import { outputStream } from '../util/output';

export const name = 'generate-text';
export const description = 'Sends a prompt to generate text.';

const actualOptions: Option[] = [
  {
    argname: '-p, --prompt <prompt>',
    description: 'Prompt to send to the model',
    required: true,
  },
  {
    argname: '-m, --model <model>',
    description: 'Model to use',
    required: true,
  },
  {
    argname: '-t, --temperature <temperature>',
    description: 'Optional temperature to use for the model (between 0 and 1)',
  },
  {
    argname: '-s, --system <system>',
    description: 'System instruction to guide the model',
  },
  {
    argname: '--thinking',
    description:
      'Whether to explicitly opt in to model thinking / reasoning capabilities',
  },
  {
    argname: '--no-thinking',
    description:
      'Whether to explicitly opt out of model thinking / reasoning capabilities',
  },
];

export const options = injectFileOptionsForCommander(actualOptions, [
  'prompt',
  'system',
]).map((option) => stripOptionFieldsForCommander(option));

type CommandConfig = {
  prompt: string;
  model: string;
  temperature?: number;
  system?: string;
  thinking?: boolean;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    prompt: String(opt['prompt']),
    model: String(opt['model']),
  };
  if (opt['temperature'] !== undefined) {
    config.temperature = Number(opt['temperature']);
  }
  if (opt['system']) {
    config.system = String(opt['system']);
  }
  if (opt['thinking'] !== undefined) {
    config.thinking = Boolean(opt['thinking']);
  }
  if (opt['noThinking'] !== undefined) {
    config.thinking = !opt['noThinking'];
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const { prompt, model, temperature, system, thinking } = parseOptions(
    await promptMissingOptions(
      actualOptions,
      await parseFileOptions(getOpt(handlerArgs), ['prompt', 'system']),
    ),
  );

  const thinkingSuffix =
    thinking === true
      ? ' with thinking enabled'
      : thinking === false
        ? ' with thinking disabled'
        : '';
  const temperatureSuffix = temperature
    ? ` (using temperature ${temperature})`
    : '';
  logger.info(
    `Prompting model ${model} to generate text${thinkingSuffix}${temperatureSuffix}...`,
  );

  let providerOptions: SharedV2ProviderOptions | undefined;
  if (thinking === true) {
    providerOptions = {
      anthropic: {
        thinking: {
          type: 'enabled',
        },
      },
      google: {
        thinkingConfig: {
          thinkingBudget: 512,
        },
      },
      openai: {
        reasoningEffort: 'high',
      },
      xai: {
        reasoningEffort: 'high',
      },
    };
  } else if (thinking === false) {
    providerOptions = {
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

  // Stream text result.
  const streamResult = streamText({
    model,
    prompt,
    temperature,
    system,
    providerOptions,
  });
  const { textStream } = streamResult;
  await outputStream(textStream);

  // Log token usage.
  const tokenUsage = await streamResult.totalUsage;
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
  logger.info(tokenUsageLogLines.join('\n'));

  // Log cost.
  const providerMetadata = await streamResult.providerMetadata;
  if (providerMetadata?.['gateway']?.['cost'] !== undefined) {
    logger.info(`Cost: $${providerMetadata['gateway']['cost']}`);
  }
};
