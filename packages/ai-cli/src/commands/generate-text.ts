import {
  getOpt,
  type HandlerArgs,
  injectFileOptionsForCommander,
  logger,
  type Option,
  type OptionsInput,
  outputStream,
  parseFileOptions,
  promptMissingOptions,
  stripOptionFieldsForCommander,
} from "@felixarntz/cli-utils";
import { streamText } from "ai";
import { logCost, logTokenUsage } from "../util/ai-usage";
import { getReasoningProviderOptions } from "../util/reasoning";

export const name = "generate-text";
export const description = "Sends a prompt to generate text.";

const actualOptions: Option[] = [
  {
    argname: "-p, --prompt <prompt>",
    description: "Prompt to send to the model",
    required: true,
  },
  {
    argname: "-m, --model <model>",
    description: "Model to use",
    required: true,
  },
  {
    argname: "-t, --temperature <temperature>",
    description: "Optional temperature to use for the model (between 0 and 1)",
  },
  {
    argname: "-s, --system <system>",
    description: "System instruction to guide the model",
  },
  {
    argname: "--thinking",
    description:
      "Whether to explicitly opt in to model thinking / reasoning capabilities",
  },
  {
    argname: "--no-thinking",
    description:
      "Whether to explicitly opt out of model thinking / reasoning capabilities",
  },
];

export const options = injectFileOptionsForCommander(actualOptions, [
  "prompt",
  "system",
]).map((option) => stripOptionFieldsForCommander(option));

interface CommandConfig {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  thinking?: boolean;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    prompt: String(opt.prompt),
    model: String(opt.model),
  };
  if (opt.temperature !== undefined) {
    config.temperature = Number(opt.temperature);
  }
  if (opt.system) {
    config.system = String(opt.system);
  }
  if (opt.thinking !== undefined) {
    config.thinking = Boolean(opt.thinking);
  }
  if (opt.noThinking !== undefined) {
    config.thinking = !opt.noThinking;
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const { prompt, model, temperature, system, thinking } = parseOptions(
    await promptMissingOptions(
      actualOptions,
      await parseFileOptions(getOpt(handlerArgs), ["prompt", "system"])
    )
  );

  let thinkingSuffix = "";
  if (thinking === true) {
    thinkingSuffix = " with thinking enabled";
  } else if (thinking === false) {
    thinkingSuffix = " with thinking disabled";
  }
  const temperatureSuffix = temperature
    ? ` (using temperature ${temperature})`
    : "";
  logger.info(
    `Prompting model ${model} to generate text${thinkingSuffix}${temperatureSuffix}...`
  );

  // Stream text result.
  const streamResult = streamText({
    model,
    prompt,
    temperature,
    system,
    providerOptions:
      thinking === undefined
        ? undefined
        : getReasoningProviderOptions(thinking ? "high" : "minimal", model),
  });
  const { textStream } = streamResult;
  await outputStream(textStream);

  logTokenUsage(await streamResult.totalUsage);
  logCost(await streamResult.providerMetadata);
};
