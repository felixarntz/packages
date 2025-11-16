import sharp from 'sharp';
import { generateObject } from 'ai';
import { fileTypeFromBuffer } from 'file-type';
import { z } from 'zod';
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
import { getReasoningProviderOptions } from '../util/reasoning';

export const name = 'crop-image';
export const description = 'Crops an image to a given aspect ratio.';

const actualOptions: Option[] = [
  {
    argname: '-i, --input <input>',
    description: 'Input image file to crop',
    required: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-a, --aspect-ratio <aspectRatio>',
    description: 'Aspect ratio to crop to (e.g. 16:9, 4:3)',
    required: true,
  },
  {
    argname: '-m, --model <model>',
    description: 'Model to use for determining optimal crop position',
    required: true,
    defaults: 'google/gemini-2.5-flash-image',
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
  input: string;
  aspectRatio: string;
  model: string;
  output?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    input: String(opt['input']),
    aspectRatio: String(opt['aspectRatio']),
    model: String(opt['model']),
    output: opt['output'] ? String(opt['output']) : undefined,
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const {
    input: inputImagePath,
    aspectRatio,
    model,
    output,
  } = parseOptions(
    await promptMissingOptions(actualOptions, getOpt(handlerArgs)),
  );

  // Parse aspect ratio
  const ratioParts = aspectRatio.split(':');
  if (ratioParts.length !== 2) {
    throw new Error('Aspect ratio must be in format width:height (e.g. 16:9)');
  }
  const targetWidth = parseInt(ratioParts[0], 10);
  const targetHeight = parseInt(ratioParts[1], 10);
  if (
    isNaN(targetWidth) ||
    isNaN(targetHeight) ||
    targetWidth <= 0 ||
    targetHeight <= 0
  ) {
    throw new Error('Aspect ratio values must be positive integers');
  }

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

  // Get image metadata
  const metadata = await sharp(inputImageBuffer).metadata();
  const originalWidth = metadata.width!;
  const originalHeight = metadata.height!;

  // Calculate target dimensions
  const targetAspectRatio = targetWidth / targetHeight;
  const originalAspectRatio = originalWidth / originalHeight;

  let cropWidth: number;
  let cropHeight: number;
  let left = 0;
  let top = 0;
  let cropDirection: 'horizontal' | 'vertical';

  if (originalAspectRatio > targetAspectRatio) {
    // Image is wider, crop sides
    cropHeight = originalHeight;
    cropWidth = Math.round(originalHeight * targetAspectRatio);
    cropDirection = 'horizontal';
  } else {
    // Image is taller, crop top/bottom
    cropWidth = originalWidth;
    cropHeight = Math.round(originalWidth / targetAspectRatio);
    cropDirection = 'vertical';
  }

  // Use AI to determine optimal crop offset
  logger.info(`Using model ${model} to determine optimal crop position...`);

  const schema = z.object({
    [cropDirection === 'horizontal' ? 'left' : 'top']: z.number().int().min(0),
  });

  const prompt = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: `Analyze this image and determine the optimal ${cropDirection === 'horizontal' ? 'left' : 'top'} offset (in pixels) to crop it to ${cropWidth}x${cropHeight} while keeping the primary subject as visible as possible. The image is ${originalWidth}x${originalHeight} and we're cropping to aspect ratio ${targetWidth}:${targetHeight}. Return only the pixel offset value.`,
        },
        {
          type: 'image' as const,
          image: inputImageBuffer,
          mediaType: inputImageFileType.mime,
        },
      ],
    },
  ];

  const result = await generateObject({
    model,
    schema,
    prompt,
    providerOptions: getReasoningProviderOptions('low', model),
  });

  if (cropDirection === 'horizontal') {
    left = result.object['left'];
  } else {
    top = result.object['top'];
  }

  logger.info(
    `Cropping image from ${originalWidth}x${originalHeight} to ${cropWidth}x${cropHeight} with ${cropDirection === 'horizontal' ? 'left' : 'top'} offset ${cropDirection === 'horizontal' ? left : top}...`,
  );

  // Crop the image
  const croppedBuffer = await sharp(inputImageBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .toBuffer();

  // Determine output path
  let outputPath: string;
  if (output) {
    outputPath = normalizeAbsolutePath(output);
  } else {
    const inputPathParts = inputImagePath.split('.');
    const extension = inputPathParts.pop();
    const baseName = inputPathParts.join('.');
    outputPath = `${baseName}-cropped.${extension}`;
  }

  await writeBinaryFile(outputPath, croppedBuffer);
  logger.info(`Cropped image saved to ${outputPath}`);
};
