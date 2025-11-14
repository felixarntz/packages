import { streamText } from 'ai';
import {
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
} from '../util/commander';
import { parseFileOptions, injectFileOptionsForCommander } from '../util/file-options';
import { promptMissingOptions, stripOptionFieldsForCommander } from '../util/inquirer';
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
    description:
      'Optional temperature to use for the model (between 0 and 1)',
  },
  {
    argname: '-s, --system <system>',
    description: 'System instruction to guide the model',
  },
];

export const options = injectFileOptionsForCommander(actualOptions, ['prompt', 'system']).map(stripOptionFieldsForCommander);

type CommandConfig = {
  prompt: string;
  model: string;
  temperature?: number;
  system?: string;
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
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const { prompt, model, temperature, system } =
    parseOptions(
      await promptMissingOptions(
        actualOptions,
        await parseFileOptions(
          getOpt(handlerArgs),
          ['system'],
        ),
      ),
    );

  const temperatureSuffix = temperature ? ` (using temperature ${temperature})` : '';
  logger.debug(
    `Prompting model ${model}${temperatureSuffix}...`,
  );

  // Stream text result.
  const streamResult = streamText({
    model,
    prompt,
    temperature,
    system,
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
    tokenUsageLogLines.push(`  Reasoning tokens: ${tokenUsage.reasoningTokens}`);
  }
  tokenUsageLogLines.push(`  Total tokens: ${tokenUsage.totalTokens}`);
  logger.info(tokenUsageLogLines.join('\n'));

  // Log cost.
  const providerMetadata = await streamResult.providerMetadata;
  if (providerMetadata?.['gateway']?.['cost'] !== undefined) {
    logger.info(`Cost: $${providerMetadata['gateway']['cost']}`);
  }
};
