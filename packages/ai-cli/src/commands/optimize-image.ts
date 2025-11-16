import sharp from 'sharp';
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

export const name = 'optimize-image';
export const description = 'Optimizes an image for web delivery.';

const actualOptions: Option[] = [
  {
    argname: 'input',
    description: 'Input image file to optimize',
    positional: true,
    required: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-f, --format <format>',
    description: 'Output format',
    required: false,
    defaults: 'jpeg',
    choices: ['png', 'jpeg', 'webp', 'avif'],
  },
  {
    argname: '-o, --output <output>',
    description: 'Output filename (optional)',
    required: false,
  },
];

export const options = actualOptions.map((option) =>
  stripOptionFieldsForCommander(option),
);

type CommandConfig = {
  format: 'png' | 'jpeg' | 'webp' | 'avif';
  output?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    format: (opt['format'] as 'png' | 'jpeg' | 'webp' | 'avif') ?? 'jpeg',
    output: opt['output'] ? String(opt['output']) : undefined,
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [inputImagePath] = getArgs(handlerArgs);
  const { format, output } = parseOptions(
    await promptMissingOptions(actualOptions, getOpt(handlerArgs)),
  );

  const inputImage = await readImageFile(inputImagePath);

  logger.info(`Optimizing image to ${format} format...`);

  // Create sharp instance and apply optimization based on format
  let sharpInstance = sharp(inputImage.buffer);

  switch (format) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ quality: 80, progressive: true });
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ compressionLevel: 6 });
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ quality: 80 });
      break;
    case 'avif':
      sharpInstance = sharpInstance.avif({ quality: 50 });
      break;
  }

  const optimizedBuffer = await sharpInstance.toBuffer();

  // Determine output path
  let outputPath: string;
  if (output) {
    outputPath = normalizeAbsolutePath(output);
  } else {
    const extension = format === 'jpeg' ? 'jpg' : format;
    const inputPathParts = inputImagePath.split('.');
    inputPathParts.pop(); // Remove extension
    const baseName = inputPathParts.join('.');
    outputPath = `${baseName}-optimized.${extension}`;
  }

  await writeBinaryFile(outputPath, optimizedBuffer);
  logger.info(`Optimized image saved to ${outputPath}`);
};
