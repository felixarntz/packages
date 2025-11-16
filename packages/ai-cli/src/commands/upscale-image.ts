import { GoogleGenAI } from '@google/genai';
import {
  getArgs,
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
} from '../util/commander';
import {
  promptMissingOptions,
  stripOptionFieldsForCommander,
} from '../util/inquirer';
import { logger } from '../util/logger';
import { normalizeAbsolutePath } from '../util/paths';
import { writeBinaryFile } from '../util/fs';
import { readImageFile } from '../util/images';
import { bufferToBase64, base64ToBuffer } from '../util/binary';

export const name = 'upscale-image';
export const description = 'Upscales an input image.';

const actualOptions: Option[] = [
  {
    argname: 'input',
    description: 'Input image file to upscale',
    positional: true,
    required: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-m, --model <model>',
    description: 'Model to use for upscaling',
    choices: [
      'google/imagen-4.0-generate-001',
      'google/imagen-4.0-ultra-generate-001',
      'google/imagen-4.0-fast-generate-001',
      'google/imagen-3.0-generate-002',
      'google/imagen-3.0-fast-generate-001',
    ],
    required: true,
  },
  {
    argname: '-o, --output <output>',
    description: 'Output filename (optional)',
  },
];

export const options = actualOptions.map((option) =>
  stripOptionFieldsForCommander(option),
);

type CommandConfig = {
  model: string;
  output?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    model: String(opt['model']),
    output: opt['output'] ? String(opt['output']) : undefined,
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [inputImagePath] = getArgs(handlerArgs);
  const { model, output } = parseOptions(
    await promptMissingOptions(actualOptions, getOpt(handlerArgs)),
  );

  if (!model.startsWith('google/')) {
    throw new Error(
      'Upscaling is only supported for Google models. The model must start with "google/".',
    );
  }

  const inputImage = await readImageFile(inputImagePath);

  logger.info(`Upscaling image using model ${model}...`);

  const client = new GoogleGenAI({
    vertexai: true,
  });

  const [, modelName] = model.split('/', 2);

  const response = await client.models.upscaleImage({
    model: modelName,
    image: {
      imageBytes: bufferToBase64(inputImage.buffer),
    },
    upscaleFactor: 'x2',
    config: {
      enhanceInputImage: true,
      includeRaiReason: true,
    },
  });

  if (!response.generatedImages || response.generatedImages.length === 0) {
    throw new Error('No upscaled image was generated.');
  }

  const upscaledImageBase64 = response.generatedImages[0].image?.imageBytes;
  if (!upscaledImageBase64) {
    throw new Error('Upscaled image data is missing.');
  }

  // Determine output path
  let outputPath: string;
  if (output) {
    outputPath = normalizeAbsolutePath(output);
  } else {
    const inputPathParts = inputImagePath.split('.');
    const extension = inputPathParts.pop();
    const baseName = inputPathParts.join('.');
    outputPath = `${baseName}-upscaled.${extension}`;
  }

  await writeBinaryFile(outputPath, base64ToBuffer(upscaledImageBase64));
  logger.info(`Upscaled image saved to ${outputPath}`);
};
