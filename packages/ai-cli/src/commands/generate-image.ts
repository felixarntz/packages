import {
  generateText,
  experimental_generateImage as generateImage,
  type GeneratedFile,
} from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { fileTypeFromBuffer } from 'file-type';
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
import { normalizeAbsolutePath } from '../util/paths';
import { writeBinaryFile } from '../util/fs';
import { base64ToBuffer, uint8ArrayToBuffer } from '../util/binary';

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
  const intervalId = setInterval(() => {
    logger.info('Still generating...');
  }, 5000);

  let images: GeneratedFile[];
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
    images = contentResult.files.filter((file) =>
      file.mediaType.startsWith('image/'),
    );
  } else {
    const imageResult = await generateImage({
      model:
        providerMap[providerName as keyof typeof providerMap].image(modelName),
      prompt,
      n: number,
    });

    images = imageResult.images;
  }

  clearInterval(intervalId);

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

    let extension = 'png';
    if (image.mediaType) {
      extension =
        image.mediaType === 'image/jpeg'
          ? 'jpg'
          : image.mediaType.split('/')[1];
    } else {
      logger.debug(
        'No media type provided for image; trying to detect from buffer',
      );
      const fileType = await fileTypeFromBuffer(buffer);
      if (fileType) {
        extension = fileType.ext;
      } else {
        logger.debug(
          'Unable to detect file type from buffer; defaulting to png extension',
        );
      }
    }

    const filename = `${outputFileBase.replace('%%number%%', String(index + 1))}.${extension}`;
    const filePath = normalizeAbsolutePath(filename);

    await writeBinaryFile(filePath, buffer);
    logger.info(`Saved image to ${filePath}`);
  }
};
