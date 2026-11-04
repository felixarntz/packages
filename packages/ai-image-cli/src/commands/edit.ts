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
import { type FilePart, generateText, type ModelMessage } from "ai";
import { logCost, logTokenUsage } from "../util/ai-usage";
import { base64ToBuffer, uint8ArrayToBuffer } from "../util/binary";
import {
  ensureCorrectOrientation,
  readImageFile,
  writeImageFile,
} from "../util/images";

export const name = "edit";
export const description =
  "Sends an input image with a prompt to generate a new image.";

const actualOptions: Option[] = [
  {
    argname: "input",
    description: "Input image file to edit",
    parse: (value: string) => normalizeAbsolutePath(value),
    positional: true,
    required: true,
    variadic: true,
  },
  {
    argname: "-p, --prompt <prompt>",
    description: "Prompt to send to the model",
    required: true,
  },
  {
    argname: "-m, --model <model>",
    choices: [
      // Due to the use of multimodal output models in this command, only Google models are supported.
      "google/gemini-3.1-flash-image",
      "google/gemini-2.5-flash-image",
      "google/gemini-nano-banana-2.1",
    ],
    description: "Model to use",
    required: true,
  },
  {
    argname: "-o, --output <output>",
    defaults: "output",
    description: "Output filename prefix",
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
  const outputOption: string | boolean | undefined = opt["output"];
  const config: CommandConfig = {
    model: String(opt["model"]),
    output: String(outputOption ?? "output"),
    prompt: String(opt["prompt"]),
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

  const imageContents: FilePart[] = await Promise.all(
    inputImagePaths.map(async (inputImagePath) => {
      const inputImage = await ensureCorrectOrientation(
        await readImageFile(inputImagePath)
      );
      return {
        data: { data: inputImage.buffer, type: "data" as const },
        mediaType: inputImage.mime,
        type: "file" as const,
      };
    })
  );

  logger.info(
    `Prompting model ${model} to edit the ${imageContents.length > 1 ? "images" : "image"}...`
  );

  const prompt: ModelMessage[] = [
    {
      content: [
        {
          text: textPrompt,
          type: "text" as const,
        },
        ...imageContents,
      ],
      role: "user" as const,
    },
  ];

  // Stream text result, and log "heartbeat" messages every 5 seconds.
  const [result, images] = await runWithHeartbeat(async () => {
    const contentResult = await generateText({
      model,
      prompt,
      providerOptions: {
        google: {
          responseModalities: ["IMAGE"],
        },
      },
    });
    const generatedImages = contentResult.files.filter((file) =>
      file.mediaType.startsWith("image/")
    );

    return [contentResult, generatedImages];
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
  const filePaths = await Promise.all(
    images.map(async (image, index) => {
      let buffer: Buffer<ArrayBufferLike>;
      if (image.base64) {
        buffer = base64ToBuffer(image.base64);
      } else if (image.uint8Array) {
        buffer = uint8ArrayToBuffer(image.uint8Array);
      } else {
        throw new Error("No image data provided");
      }

      return await writeImageFile({
        buffer,
        fileBase: outputFileBase,
        index: images.length > 1 ? index : undefined,
        mime: image.mediaType,
      });
    })
  );

  for (const filePath of filePaths) {
    logger.info(`Saved image to ${filePath}`);
  }

  logTokenUsage(result.usage);
  logCost(result.providerMetadata);
};
