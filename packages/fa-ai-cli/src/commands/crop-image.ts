import sharp from 'sharp';
import { generateText, Output } from 'ai';
import { z } from 'zod';
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
  runWithHeartbeat,
} from 'fa-cli-utils';
import { readImageFile, writeImageFile } from '../util/images';
import { getReasoningProviderOptions } from '../util/reasoning';
import { logTokenUsage, logCost } from '../util/ai-usage';

export const name = 'crop-image';
export const description = 'Crops an input image to a given aspect ratio.';

const actualOptions: Option[] = [
  {
    argname: 'input',
    description: 'Input image file to crop',
    positional: true,
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
    choices: [
      'google/gemini-3-pro-preview',
      'google/gemini-3-flash-preview',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-lite',
      'openai/gpt-5',
      'openai/gpt-5-mini',
      'openai/gpt-5-nano',
    ],
    required: true,
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
  aspectRatio: string;
  model: string;
  output?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    aspectRatio: String(opt['aspectRatio']),
    model: String(opt['model']),
    output: opt['output'] ? String(opt['output']) : undefined,
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [inputImagePath] = getArgs(handlerArgs);
  const { aspectRatio, model, output } = parseOptions(
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

  const inputImage = await readImageFile(inputImagePath);

  // Get image metadata
  const metadata = await sharp(inputImage.buffer).metadata();
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

  const system = `You are an expert image analyst. Given an image and a target crop size, you will determine the optimal ${cropDirection === 'horizontal' ? 'left' : 'top'} offset (in pixels) to crop the image to the target size while keeping the primary subject as visible as possible.
ALWAYS review the contents of the image carefully before providing your answer.
NEVER simply return an offset to get a center crop; instead, analyze the image content to find the best offset where the primary subject is best preserved.
If there is a person in the image or a small group of people, PRIORITIZE keeping their faces fully visible in the cropped area. DO NOT cut off their heads.
If the primary is subject is almost impossible to keep fully visible due to the aspect ratio, provide the offset that preserves as much of the subject as possible.
`;

  const cropPrompt = `Analyze this image and determine the optimal ${cropDirection === 'horizontal' ? 'left' : 'top'} offset (in pixels) to crop it to ${cropWidth}x${cropHeight} while keeping the primary subject as visible as possible.
The image is ${originalWidth}x${originalHeight} and we're cropping to aspect ratio ${targetWidth}:${targetHeight}.
Return only the pixel offset value.`;

  const prompt = [
    {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: cropPrompt,
        },
        {
          type: 'image' as const,
          image: inputImage.buffer,
          mediaType: inputImage.mime,
        },
      ],
    },
  ];

  const result = await runWithHeartbeat(
    async () =>
      await generateText({
        model,
        output: Output.object({ schema }),
        system,
        prompt,
        providerOptions: getReasoningProviderOptions('low', model),
      }),
    'Still analyzing image...',
  );

  if (cropDirection === 'horizontal') {
    left = result.output['left'];
  } else {
    top = result.output['top'];
  }

  logger.info(
    `Cropping image from ${originalWidth}x${originalHeight} to ${cropWidth}x${cropHeight} with ${cropDirection === 'horizontal' ? 'left' : 'top'} offset ${cropDirection === 'horizontal' ? left : top}...`,
  );

  // Crop the image.
  const croppedBuffer = await sharp(inputImage.buffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .toBuffer();

  let fileBase = output;
  if (!fileBase) {
    const inputPathParts = inputImagePath.split('.');
    inputPathParts.pop();
    fileBase = `${inputPathParts.join('.')}-cropped`;
  }
  const filePath = await writeImageFile({
    fileBase,
    buffer: croppedBuffer,
    ext: inputImage.ext,
    mime: inputImage.mime,
  });

  logger.info(`Cropped image saved to ${filePath}`);

  logTokenUsage(result.usage);
  logCost(result.providerMetadata);
};
