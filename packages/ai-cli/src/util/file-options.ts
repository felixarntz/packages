import { type Option, type OptionsInput, parseFlagName, camelCaseFlagName } from './commander';
import { readTextFile } from './fs';
import { normalizeAbsolutePath } from './paths';

export const parseFileOptions = async (
  optionsInput: OptionsInput,
  fileOptionNames: string[],
): Promise<OptionsInput> => {
  const completeOptionsInput: OptionsInput = { ...optionsInput };

  for (const fileOptionName of fileOptionNames) {
    const fileOptionKey = `${fileOptionName}-file`;
    if (!optionsInput[camelCaseFlagName(fileOptionKey)] || optionsInput[camelCaseFlagName(fileOptionName)] !== undefined) {
      continue;
    }
    
    const absolutePath = optionsInput[camelCaseFlagName(fileOptionKey)] as string;
    completeOptionsInput[camelCaseFlagName(fileOptionName)] = await readTextFile(absolutePath);
    delete optionsInput[camelCaseFlagName(fileOptionKey)];
  }

  return completeOptionsInput;
}

export const parseAndValidateFileOptions = async (
  options: Option[],
  optionsInput: OptionsInput,
  fileOptionNames: string[],
): Promise<OptionsInput> => {
  const completeOptionsInput = await parseFileOptions(optionsInput, fileOptionNames);

  options.forEach((option) => {
    if (option.positional) {
      return;
    }

    if (!option.required && option.defaults === undefined) {
      return;
    }
    
    const argname = parseFlagName(option.argname);
    if (completeOptionsInput[camelCaseFlagName(argname)] === undefined) {
      if (option.defaults !== undefined) {
        completeOptionsInput[camelCaseFlagName(argname)] = option.defaults;
      } else if (option.required) {
        throw new Error(`Missing required option: --${argname}`);
      }
    }
  });

  return completeOptionsInput;
};

export const injectFileOptionsForCommander = (options: Option[], fileOptionNames: string[]): Option[] => {
  const fileOptionNamesMap = new Set(fileOptionNames);

  const newOptions: Option[] = [];

  options.forEach((option) => {
    if (option.positional || ! fileOptionNamesMap.has(parseFlagName(option.argname))) {
      newOptions.push(option);
      return;
    }

    const argname = parseFlagName(option.argname);

    const modifiedOption: Option = { ...option };
    delete modifiedOption.required;
    delete modifiedOption.defaults;
    newOptions.push(modifiedOption);

    let newDescription = '';
    if (option.description) {
      newDescription = `Path to a file containing the ${lowercaseFirstLetter(option.description)}`;
    } else {
      // Fallback, although descriptions should always be provided.
      newDescription = `Path to a file containing the value for '${argname}'`;
    }

    newOptions.push({
      argname: `--${argname}-file <path>`,
      description: newDescription,
      parse: (value: string) => normalizeAbsolutePath(value),
    });
  });

  return newOptions;
};

const lowercaseFirstLetter = (str: string): string => {
  // If the second character is uppercase, we assume it's an acronym and leave it as is.
  if (str.length > 1 && str.charAt(1) === str.charAt(1).toUpperCase()) {
    return str;
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
};
