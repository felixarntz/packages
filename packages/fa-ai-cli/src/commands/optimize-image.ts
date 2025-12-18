import sharp from 'sharp';
import {
  getArgs,
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
  promptMissingOptions,
  stripOptionFieldsForCommander,
  logger,
  normalizeAbsolutePath,
} from 'fa-cli-utils';
import { readImageFile, writeImageFile } from '../util/images';

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
    choices: ['jpeg', 'webp', 'avif', 'png'],
  },
  {
    argname: '-o, --output <output>',
    description: 'Output filename prefix, to place the output file elsewhere',
  },
];

export const options = actualOptions.map((option) =>
  stripOptionFieldsForCommander(option),
);

type CommandConfig = {
  format: 'jpeg' | 'webp' | 'avif' | 'png';
  output?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    format: (opt['format'] as 'jpeg' | 'webp' | 'avif' | 'png') ?? 'jpeg',
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
  let ext: string;
  let mime: string;

  switch (format) {
    case 'jpeg':
      sharpInstance = sharpInstance.jpeg({ quality: 80, progressive: true });
      ext = 'jpg';
      mime = 'image/jpeg';
      break;
    case 'png':
      sharpInstance = sharpInstance.png({ compressionLevel: 6 });
      ext = 'png';
      mime = 'image/png';
      break;
    case 'webp':
      sharpInstance = sharpInstance.webp({ quality: 80 });
      ext = 'webp';
      mime = 'image/webp';
      break;
    case 'avif':
      sharpInstance = sharpInstance.avif({ quality: 50 });
      ext = 'avif';
      mime = 'image/avif';
      break;
  }

  const optimizedBuffer = await sharpInstance.toBuffer();

  let fileBase = output;
  if (!fileBase) {
    const inputPathParts = inputImagePath.split('.');
    inputPathParts.pop();
    fileBase = `${inputPathParts.join('.')}-optimized`;
  }
  const filePath = await writeImageFile({
    fileBase,
    buffer: optimizedBuffer,
    ext,
    mime,
  });

  logger.info(`Optimized image saved to ${filePath}`);
};
