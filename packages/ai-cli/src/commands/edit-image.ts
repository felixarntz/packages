import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { fileTypeFromBuffer } from 'file-type';
import {
  getVariadicArgs,
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
import { runWithHeartbeat } from '../util/heartbeat';
import { normalizeAbsolutePath } from '../util/paths';
import { readBinaryFile, writeBinaryFile } from '../util/fs';
import { base64ToBuffer, uint8ArrayToBuffer } from '../util/binary';
import { logTokenUsage, logCost } from '../util/ai-usage';

export const name = 'edit-image';
export const description =
  'Sends an input image with a prompt to generate a new image.';

const actualOptions: Option[] = [
  {
    argname: 'input',
    description: 'Input image file to edit',
    positional: true,
    required: true,
    variadic: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-p, --prompt <prompt>',
    description: 'Prompt to send to the model',
    required: true,
  },
  {
    argname: '-m, --model <model>',
    description: 'Model to use',
    required: true,
    defaults: 'google/gemini-2.5-flash-image',
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
  output: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    prompt: String(opt['prompt']),
    model: String(opt['model']),
    output: String(opt['output'] ?? 'output'),
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const inputImagePaths = getVariadicArgs(handlerArgs, 0);
  const {
    prompt: textPrompt,
    model,
    output,
  } = parseOptions(
    await promptMissingOptions(
      actualOptions,
      await parseFileOptions(getOpt(handlerArgs), ['prompt']),
    ),
  );

  const imageContents = [];
  for (const inputImagePath of inputImagePaths) {
    const inputImageBuffer = await readBinaryFile(inputImagePath);
    const inputImageFileType = await fileTypeFromBuffer(inputImageBuffer);
    if (!inputImageFileType) {
      throw new Error(
        `Unable to determine file type of input image ${inputImagePath}`,
      );
    }
    if (!inputImageFileType.mime.startsWith('image/')) {
      throw new Error(
        `Input file ${inputImagePath} is not an image (detected type: ${inputImageFileType.mime})`,
      );
    }

    imageContents.push({
      type: 'image' as const,
      image: inputImageBuffer,
      mediaType: inputImageFileType.mime,
    });
  }

  logger.info(
    `Prompting model ${model} to edit the ${imageContents.length > 1 ? 'images' : 'image'}...`,
  );

  const providerMap = { google };
  const [providerName, modelName] = model.split('/', 2);
  if (!(providerName in providerMap)) {
    throw new Error(
      `Unsupported provider "${providerName}". Supported providers are: ${Object.keys(
        providerMap,
      ).join(', ')}`,
    );
  }

  const prompt = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: textPrompt,
        },
        ...imageContents,
      ],
    },
  ];

  // Stream text result, and log "heartbeat" messages every 5 seconds.
  const [result, images] = await runWithHeartbeat(async () => {
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
      const system = `You are Nano Banana. You MUST generate a new image based on the input ${imageContents.length > 1 ? 'images' : 'image'} and user prompt.`;

      const contentResult = await generateText({
        model: providerMap[providerName as keyof typeof providerMap](modelName),
        prompt,
        system,
      });
      images = contentResult.files.filter((file) =>
        file.mediaType.startsWith('image/'),
      );
    }

    return [contentResult, images];
  }, 'Still editing...');

  if (images.length === 0) {
    throw new Error('No image was generated');
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

  logTokenUsage(result.totalUsage);
  logCost(result.providerMetadata);
};
