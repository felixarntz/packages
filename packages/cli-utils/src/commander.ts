import type {
  CommandUnknownOpts,
  OptionValues,
} from "@commander-js/extra-typings";
import { logger } from "./logger";

const FLAG_NAME_REGEX = /--(?<flag>[a-zA-Z0-9-]+)/u;

export type HandlerArgs = [...unknown[], OptionValues, CommandUnknownOpts];

export type Handler = (...handlerArgs: HandlerArgs) => void | Promise<void>;

export type OptionsInput = Record<string, string | boolean>;

export const getArgs = (handlerArgs: HandlerArgs): string[] => {
  if (handlerArgs.length <= 2) {
    return [];
  }
  return handlerArgs.slice(0, -2).map(String);
};

export const getVariadicArgs = (opts: {
  handlerArgs: HandlerArgs;
  index: number;
}): string[] => {
  const { handlerArgs, index } = opts;
  if (handlerArgs.length <= index) {
    return [];
  }
  return handlerArgs[index] as string[];
};

export const getOpt = (handlerArgs: HandlerArgs): OptionsInput => {
  if (handlerArgs.length <= 1) {
    return {};
  }
  return handlerArgs.at(-2) as OptionsInput;
};

export interface Option {
  argname: string;
  choices?: string[];
  defaults?: string;
  description: string;
  parse?: (value: string) => string;
  positional?: boolean;
  required?: boolean;
  variadic?: boolean; // For now, only supported for positional arguments.
}

const addPositionalArgument = (opts: {
  command: CommandUnknownOpts;
  option: Option;
}): void => {
  const {
    command,
    option: {
      argname,
      required,
      defaults,
      parse,
      variadic,
      choices,
      description,
    },
  } = opts;
  const variadicSuffix = variadic ? "..." : "";
  const argument = command.createArgument(
    required
      ? `<${argname}${variadicSuffix}>`
      : `[${argname}${variadicSuffix}]`,
    description
  );
  if (defaults) {
    argument.default(defaults);
  }
  if (typeof parse === "function") {
    if (variadic) {
      argument.argParser((value: string, previous?: string[]) => {
        if (!Array.isArray(previous)) {
          return [parse(value)];
        }
        return [...previous, parse(value)];
      });
    } else {
      argument.argParser(parse);
    }
  }
  if (choices) {
    argument.choices(choices);
  }
  command.addArgument(argument);
};

export const withOptions = (opts: {
  command: CommandUnknownOpts;
  options: Option[];
}): CommandUnknownOpts => {
  const { command, options } = opts;
  for (const opt of options) {
    if (opt.positional) {
      addPositionalArgument({ command, option: opt });
      continue;
    }
    const option = command.createOption(opt.argname, opt.description);
    if (opt.required) {
      option.makeOptionMandatory(true);
    }
    if (opt.defaults) {
      option.default(opt.defaults);
    }
    if (typeof opt.parse === "function") {
      option.argParser(opt.parse);
    }
    if (opt.choices) {
      option.choices(opt.choices);
    }
    command.addOption(option);
  }
  return command;
};

export const withErrorHandling =
  (handler: Handler): Handler =>
  async (...handlerArgs: [...unknown[], OptionValues, CommandUnknownOpts]) => {
    try {
      const result = handler(...handlerArgs);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      }
      process.exitCode = 1;
    }
  };

export const parseFlagName = (argname: string): string => {
  const match = argname.match(FLAG_NAME_REGEX);
  if (match) {
    return match[1];
  }
  throw new Error(`Could not parse argument name from "${argname}"`);
};

export const isBooleanFlag = (argname: string): boolean =>
  argname.includes("--") && !argname.includes("<") && !argname.includes("[");

export const camelCaseFlagName = (flagName: string): string =>
  flagName.replace(/-(?<letter>[a-z])/gu, (_, letter) => letter.toUpperCase());
