import {
  getArgs,
  getOpt,
  type HandlerArgs,
  logger,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  promptMissingOptions,
  runWithHeartbeat,
  stripOptionFieldsForCommander,
} from "@felixarntz/cli-utils";
import { generateText, type ModelMessage } from "ai";
import { logCost, logTokenUsage } from "../util/ai-usage";
import { base64ToBuffer, uint8ArrayToBuffer } from "../util/binary";
import {
  ensureCorrectOrientation,
  readImageFile,
  sharp,
  writeImageFile,
} from "../util/images";

export const name = "upscale";
export const description = "Upscales an input image.";

const actualOptions: Option[] = [
  {
    argname: "input",
    description: "Input image file to upscale",
    parse: (value: string) => normalizeAbsolutePath({ filePath: value }),
    positional: true,
    required: true,
  },
  {
    argname: "-s, --size <size>",
    choices: ["2K", "4K"],
    description: "Size to upscale to",
    required: true,
  },
  {
    argname: "-m, --model <model>",
    choices: [
      // Due to the use of multimodal output models in this command, only Google models are supported.
      "google/gemini-nano-banana-2.1",
      "google/gemini-3.1-flash-image",
    ],
    description: "Model to use for upscaling",
    required: true,
  },
  {
    argname: "-o, --output <output>",
    description: "Output filename prefix, to place the output file elsewhere",
  },
];

export const options = actualOptions.map((option) =>
  stripOptionFieldsForCommander({ option })
);

interface CommandConfig {
  model: string;
  output?: string;
  size: "2K" | "4K";
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    model: String(opt["model"]),
    output: opt["output"] ? String(opt["output"]) : undefined,
    size: opt["size"] === "4K" ? "4K" : "2K",
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [inputImagePath] = getArgs(handlerArgs);
  const { model, output, size } = parseOptions(
    await promptMissingOptions({
      options: actualOptions,
      optionsInput: getOpt(handlerArgs),
    })
  );

  const inputImage = await ensureCorrectOrientation(
    await readImageFile(inputImagePath)
  );
  const metadata = await sharp(inputImage.buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width === 0 || height === 0) {
    throw new Error("Unable to determine image dimensions");
  }
  const maxDimension = size === "4K" ? 4096 : 2048;
  if (width > maxDimension || height > maxDimension) {
    throw new Error(
      `Image is ${width}x${height}, so upscaling to ${size} would be pointless`
    );
  }

  logger.info(`Upscaling image using model ${model}...`);

  const prompt: ModelMessage[] = [
    {
      content: [
        {
          text: `Upscale the image to ${size}. You MUST NOT modify the contents of the image at all. I am only providing it for it to be upscaled.`,
          type: "text" as const,
        },
        {
          data: { data: inputImage.buffer, type: "data" as const },
          mediaType: inputImage.mime,
          type: "file" as const,
        },
      ],
      role: "user" as const,
    },
  ];

  // Stream text result, and log "heartbeat" messages every 5 seconds.
  const [result, images] = await runWithHeartbeat({
    action: async () => {
      const contentResult = await generateText({
        model,
        prompt,
        providerOptions: {
          google: {
            imageConfig: {
              imageSize: size,
            },
            responseModalities: ["IMAGE"],
          },
        },
      });
      const generatedImages = contentResult.files.filter((file) =>
        file.mediaType.startsWith("image/")
      );

      return [contentResult, generatedImages];
    },
    heartbeatMessage: "Still editing...",
  });

  if (images.length === 0) {
    throw new Error("No upscaled image found");
  }

  const [image] = images;

  logger.info("Saving upscaled image...");

  let fileBase = output;
  if (!fileBase) {
    const inputPathParts = inputImagePath.split(".");
    inputPathParts.pop();
    fileBase = `${inputPathParts.join(".")}-upscaled`;
  }

  let buffer: Buffer<ArrayBufferLike>;
  if (image.base64) {
    buffer = base64ToBuffer(image.base64);
  } else if (image.uint8Array) {
    buffer = uint8ArrayToBuffer(image.uint8Array);
  } else {
    throw new Error("No image data provided");
  }

  const filePath = await writeImageFile({
    buffer,
    fileBase,
    mime: image.mediaType,
  });

  logger.info(`Saved image to ${filePath}`);

  logTokenUsage(result.usage);
  logCost(result.providerMetadata);
};
