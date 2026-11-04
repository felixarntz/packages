import { confirm, input, select } from "@inquirer/prompts";
import {
  camelCaseFlagName,
  isBooleanFlag,
  type Option,
  type OptionsInput,
  parseFlagName,
} from "./commander";

export const promptMissingOption = (opts: {
  inputValue?: string | boolean;
  option: Option;
}): Promise<string | boolean> => {
  const { inputValue, option } = opts;
  if (inputValue !== undefined) {
    return Promise.resolve(inputValue);
  }

  let message = "";
  if (option.description) {
    if (isBooleanFlag(option.argname)) {
      message = `Set ${lowercaseFirstLetter(option.description)}`;
    } else if (option.choices) {
      message = `Select the ${lowercaseFirstLetter(option.description)}`;
    } else {
      message = `Enter the ${lowercaseFirstLetter(option.description)}`;
    }
  } else {
    // Not-so-great fallback. Always provide descriptions!
    const argname = option.positional
      ? option.argname
      : parseFlagName(option.argname);
    if (isBooleanFlag(option.argname)) {
      message = `Set whether to enable '${argname}'`;
    } else if (option.choices) {
      message = `Select the value for '${argname}'`;
    } else {
      message = `Enter the value for '${argname}'`;
    }
  }

  if (isBooleanFlag(option.argname)) {
    return confirm({
      message,
    });
  }

  if (option.choices) {
    return select({
      choices: option.choices,
      default: option.defaults,
      message,
    });
  }

  return input({
    default: option.defaults,
    message,
    required: option.required ?? false,
  });
};

export const promptMissingOptions = async (opts: {
  inquireBooleanFlags?: boolean;
  options: Option[];
  optionsInput: OptionsInput;
}): Promise<OptionsInput> => {
  const { inquireBooleanFlags, options, optionsInput } = opts;
  const completeOptionsInput: OptionsInput = { ...optionsInput };

  for (const option of options) {
    if (option.positional) {
      continue;
    }
    if (!inquireBooleanFlags && isBooleanFlag(option.argname)) {
      continue;
    }
    const flagName = camelCaseFlagName(parseFlagName(option.argname));
    // biome-ignore lint/performance/noAwaitInLoops: prompts must be answered one at a time
    completeOptionsInput[flagName] = await promptMissingOption({
      inputValue: optionsInput[flagName],
      option,
    });
  }

  return completeOptionsInput;
};

export const stripOptionFieldsForCommander = (opts: {
  inquireBooleanFlags?: boolean;
  option: Option;
}): Option => {
  const { inquireBooleanFlags, option } = opts;
  if (option.positional) {
    return option;
  }
  if (!inquireBooleanFlags && isBooleanFlag(option.argname)) {
    return option;
  }
  const { required: _, defaults: __, ...rest } = option;
  return rest;
};

const lowercaseFirstLetter = (str: string): string => {
  // If the second character is uppercase, we assume it's an acronym and leave it as is.
  if (str.length > 1 && str.charAt(1) === str.charAt(1).toUpperCase()) {
    return str;
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
};
