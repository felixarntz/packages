import { input, select, confirm } from '@inquirer/prompts';
import {
  type Option,
  type OptionsInput,
  parseFlagName,
  isBooleanFlag,
  camelCaseFlagName,
} from './commander';

export const promptMissingOption = async (
  option: Option,
  inputValue?: string | boolean,
): Promise<string | boolean> => {
  if (inputValue !== undefined) {
    return inputValue;
  }

  let message = '';
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
      message,
      choices: option.choices,
      default: option.defaults,
    });
  }

  return input({
    message,
    required: option.required ?? false,
    default: option.defaults,
  });
};

export const promptMissingOptions = async (
  options: Option[],
  optionsInput: OptionsInput,
): Promise<OptionsInput> => {
  const completeOptionsInput: OptionsInput = { ...optionsInput };

  for (const option of options) {
    if (option.positional) {
      continue;
    }
    const argname = parseFlagName(option.argname);
    completeOptionsInput[argname] = await promptMissingOption(
      option,
      optionsInput[camelCaseFlagName(argname)],
    );
  }

  return completeOptionsInput;
};

export const stripOptionFieldsForCommander = (option: Option): Option => {
  if (option.positional) {
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
