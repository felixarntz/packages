import { generateText, generateImage } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import {
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
  parseFileOptions,
  injectFileOptionsForCommander,
  promptMissingOptions,
  stripOptionFieldsForCommander,
  logger,
  runWithHeartbeat,
} from '@felixarntz/cli-utils';
import { writeImageFile } from '../util/images';
import { base64ToBuffer, uint8ArrayToBuffer } from '../util/binary';
import { logTokenUsage, logCost } from '../util/ai-usage';

export const name = 'generate-image';
export const description = 'Sends a prompt to generate an image.';

const actualOptions: Option[] = [
  {
    argname: '-p, --prompt <prompt>',
    description: 'Prompt to send to the model',
    required: true,
  },
  {
    argname: '-m, --model <model>',
    description: 'Model to use',
    choices: [
      'google/gemini-3-pro-image-preview',
      'google/gemini-2.5-flash-image',
      'google/imagen-4.0-generate-001',
      'google/imagen-4.0-ultra-generate-001',
      'google/imagen-4.0-fast-generate-001',
      'openai/dall-e-3',
      'openai/dall-e-2',
      'xai/grok-2-image-1212',
    ],
    required: true,
  },
  {
    argname: '-n, --number <number>',
    description: 'Optional number of images to generate',
    defaults: '1',
  },
  {
    argname: '-o, --output <output>',
    description: 'Output filename prefix',
    defaults: 'output',
  },
];

export const options = injectFileOptionsForCommander(actualOptions, [
  'prompt',
]).map((option) => stripOptionFieldsForCommander(option));

type CommandConfig = {
  prompt: string;
  model: string;
  number: number;
  output: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    prompt: String(opt['prompt']),
    model: String(opt['model']),
    number: Number(opt['number'] ?? 1),
    output: String(opt['output'] ?? 'output'),
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const { prompt, model, number, output } = parseOptions(
    await promptMissingOptions(
      actualOptions,
      await parseFileOptions(getOpt(handlerArgs), ['prompt']),
    ),
  );

  const suffix =
    number > 1 ? ` to generate ${number} images` : ' to generate an image';
  logger.info(`Prompting model ${model}${suffix}...`);

  const providerMap = {
    openai,
    google,
    xai,
  };
  const [providerName, modelName] = model.split('/', 2);
  if (!(providerName in providerMap)) {
    throw new Error(
      `Unsupported provider "${providerName}". Supported providers are: ${Object.keys(
        providerMap,
      ).join(', ')}`,
    );
  }

  // Stream text result, and log "heartbeat" messages every 5 seconds.
  const [result, images] = await runWithHeartbeat(async () => {
    if (modelName.startsWith('gemini-')) {
      if (number > 1) {
        throw new Error(
          'Gemini models currently only support generating one image at a time.',
        );
      }
      const contentResult = await generateText({
        model: providerMap[providerName as keyof typeof providerMap](modelName),
        prompt,
      });
      let images = contentResult.files.filter((file) =>
        file.mediaType.startsWith('image/'),
      );

      // If no image was generated, try again with an explicit system prompt.
      if (images.length === 0) {
        logger.debug(
          'No image was generated; retrying with explicit system prompt...',
        );
        const system =
          'You are Nano Banana. You MUST generate an image based on the user prompt.';

        const contentResult = await generateText({
          model:
            providerMap[providerName as keyof typeof providerMap](modelName),
          prompt,
          system,
        });
        images = contentResult.files.filter((file) =>
          file.mediaType.startsWith('image/'),
        );
        return [contentResult, images];
      }

      return [contentResult, images];
    }

    const imageResult = await generateImage({
      model:
        providerMap[providerName as keyof typeof providerMap].image(modelName),
      prompt,
      n: number,
    });

    return [imageResult, imageResult.images];
  }, 'Still generating...');

  if (images.length === 0) {
    if (number === 1) {
      throw new Error('No image was generated');
    } else {
      throw new Error('No images were generated');
    }
  }

  let outputFileBase = output;
  if (images.length > 1) {
    logger.info(`Saving ${images.length} generated images...`);
    if (!outputFileBase.includes('%%number%%')) {
      outputFileBase += '-%%number%%';
    }
  } else {
    logger.info('Saving generated image...');
    if (outputFileBase.includes('-%%number%%')) {
      outputFileBase = outputFileBase.replace('-%%number%%', '');
    }
  }
  for (const [index, image] of images.entries()) {
    let buffer: Buffer;
    if (image.base64) {
      buffer = base64ToBuffer(image.base64);
    } else if (image.uint8Array) {
      buffer = uint8ArrayToBuffer(image.uint8Array);
    } else {
      throw new Error('No image data provided');
    }

    const filePath = await writeImageFile({
      fileBase: outputFileBase,
      buffer,
      mime: image.mediaType,
      index: images.length > 1 ? index : undefined,
    });

    logger.info(`Saved image to ${filePath}`);
  }

  if ('totalUsage' in result) {
    logTokenUsage(result.totalUsage);
  }
  logCost(result.providerMetadata);
};
