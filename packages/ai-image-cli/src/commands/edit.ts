import {
  getOpt,
  getVariadicArgs,
  type HandlerArgs,
  injectFileOptionsForCommander,
  logger,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  parseFileOptions,
  promptMissingOptions,
  runWithHeartbeat,
  stripOptionFieldsForCommander,
} from "@felixarntz/cli-utils";
import { generateImage } from "ai";
import { logCost, logTokenUsage } from "../util/ai-usage";
import { base64ToBuffer, uint8ArrayToBuffer } from "../util/binary";
import { readImageFile, writeImageFile } from "../util/images";

export const name = "edit";
export const description =
  "Sends an input image with a prompt to generate a new image.";

const actualOptions: Option[] = [
  {
    argname: "input",
    description: "Input image file to edit",
    positional: true,
    required: true,
    variadic: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: "-p, --prompt <prompt>",
    description: "Prompt to send to the model",
    required: true,
  },
  {
    argname: "-m, --model <model>",
    description: "Model to use",
    choices: [
      "google/gemini-3.1-flash-image",
      "google/gemini-2.5-flash-image",
      "google/gemini-nano-banana-2.1",
      "openai/gpt-image-2",
    ],
    required: true,
  },
  {
    argname: "-o, --output <output>",
    description: "Output filename prefix",
    defaults: "output",
  },
];

export const options = injectFileOptionsForCommander(actualOptions, [
  "prompt",
]).map((option) => stripOptionFieldsForCommander(option));

interface CommandConfig {
  model: string;
  output: string;
  prompt: string;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    prompt: String(opt["prompt"]),
    model: String(opt["model"]),
    output: String(opt["output"] ?? "output"),
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
      await parseFileOptions(getOpt(handlerArgs), ["prompt"])
    )
  );

  const imageContents: Array<{
    type: "image";
    image: Buffer<ArrayBufferLike>;
    mediaType: string;
  }> = [];
  for (const inputImagePath of inputImagePaths) {
    const inputImage = await readImageFile(inputImagePath);
    imageContents.push({
      type: "image" as const,
      image: inputImage.buffer,
      mediaType: inputImage.mime,
    });
  }

  logger.info(
    `Prompting model ${model} to edit the ${imageContents.length > 1 ? "images" : "image"}...`
  );

  const prompt = {
    text: textPrompt,
    images: imageContents.map((imageContent) => imageContent.image),
  };

  // Stream text result, and log "heartbeat" messages every 5 seconds.
  const [result, images] = await runWithHeartbeat(async () => {
    const contentResult = await generateImage({
      model,
      prompt,
    });
    const images = contentResult.images.filter((file) =>
      file.mediaType.startsWith("image/")
    );

    return [contentResult, images];
  }, "Still editing...");

  if (images.length === 0) {
    throw new Error("No image was generated");
  }

  let outputFileBase = output;
  if (images.length > 1) {
    logger.info(`Saving ${images.length} generated images...`);
    if (!outputFileBase.includes("%%number%%")) {
      outputFileBase += "-%%number%%";
    }
  } else {
    logger.info("Saving generated image...");
    if (outputFileBase.includes("-%%number%%")) {
      outputFileBase = outputFileBase.replace("-%%number%%", "");
    }
  }
  for (const [index, image] of images.entries()) {
    let buffer: Buffer<ArrayBufferLike>;
    if (image.base64) {
      buffer = base64ToBuffer(image.base64);
    } else if (image.uint8Array) {
      buffer = uint8ArrayToBuffer(image.uint8Array);
    } else {
      throw new Error("No image data provided");
    }

    const filePath = await writeImageFile({
      fileBase: outputFileBase,
      buffer,
      mime: image.mediaType,
      index: images.length > 1 ? index : undefined,
    });

    logger.info(`Saved image to ${filePath}`);
  }

  logTokenUsage(result.usage);
  logCost(result.providerMetadata);
};
