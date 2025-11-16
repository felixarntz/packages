import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import {
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
import { readBinaryFile, writeBinaryFile } from '../util/fs';

export const name = 'optimize-image';
export const description = 'Optimizes an image for web delivery.';

const actualOptions: Option[] = [
  {
    argname: '-i, --input <input>',
    description: 'Input image file to optimize',
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
  input: string;
  format: 'png' | 'jpeg' | 'webp' | 'avif';
  output?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    input: String(opt['input']),
    format: (opt['format'] as 'png' | 'jpeg' | 'webp' | 'avif') || 'jpeg',
    output: opt['output'] ? String(opt['output']) : undefined,
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const {
    input: inputImagePath,
    format,
    output,
  } = parseOptions(
    await promptMissingOptions(actualOptions, getOpt(handlerArgs)),
  );

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

  logger.info(`Optimizing image to ${format} format...`);

  // Create sharp instance and apply optimization based on format
  let sharpInstance = sharp(inputImageBuffer);

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
