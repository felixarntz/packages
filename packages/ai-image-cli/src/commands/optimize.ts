import {
  getArgs,
  getOpt,
  type HandlerArgs,
  logger,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  promptMissingOptions,
  stripOptionFieldsForCommander,
} from "@felixarntz/cli-utils";
import { readImageFile, sharp, writeImageFile } from "../util/images";

export const name = "optimize";
export const description = "Optimizes an image for web delivery.";

const actualOptions: Option[] = [
  {
    argname: "input",
    description: "Input image file to optimize",
    parse: (value: string) => normalizeAbsolutePath(value),
    positional: true,
    required: true,
  },
  {
    argname: "-f, --format <format>",
    choices: ["jpeg", "webp", "avif", "png"],
    defaults: "jpeg",
    description: "Output format",
    required: false,
  },
  {
    argname: "-o, --output <output>",
    description: "Output filename prefix, to place the output file elsewhere",
  },
];

export const options = actualOptions.map((option) =>
  stripOptionFieldsForCommander(option)
);

interface CommandConfig {
  format: "jpeg" | "webp" | "avif" | "png";
  output?: string;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const formatOption = opt["format"] as CommandConfig["format"] | undefined;
  const config: CommandConfig = {
    format: formatOption ?? "jpeg",
    output: opt["output"] ? String(opt["output"]) : undefined,
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [inputImagePath] = getArgs(handlerArgs);
  const { format, output } = parseOptions(
    await promptMissingOptions(actualOptions, getOpt(handlerArgs))
  );

  const inputImage = await readImageFile(inputImagePath);

  logger.info(`Optimizing image to ${format} format...`);

  let sharpInstance = sharp(inputImage.buffer);
  let ext: string;
  let mime: string;

  switch (format) {
    case "jpeg":
      sharpInstance = sharpInstance.jpeg({ progressive: true, quality: 80 });
      ext = "jpg";
      mime = "image/jpeg";
      break;
    case "png":
      sharpInstance = sharpInstance.png({ compressionLevel: 6 });
      ext = "png";
      mime = "image/png";
      break;
    case "webp":
      sharpInstance = sharpInstance.webp({ quality: 80 });
      ext = "webp";
      mime = "image/webp";
      break;
    case "avif":
      sharpInstance = sharpInstance.avif({ quality: 50 });
      ext = "avif";
      mime = "image/avif";
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const optimizedBuffer = await sharpInstance.toBuffer();

  let fileBase = output;
  if (!fileBase) {
    const inputPathParts = inputImagePath.split(".");
    inputPathParts.pop();
    fileBase = `${inputPathParts.join(".")}-optimized`;
  }
  const filePath = await writeImageFile({
    buffer: optimizedBuffer,
    ext,
    fileBase,
    mime,
  });

  logger.info(`Optimized image saved to ${filePath}`);
};
