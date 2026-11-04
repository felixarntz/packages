import {
  camelCaseFlagName,
  type Option,
  type OptionsInput,
  parseFlagName,
} from "./commander";
import { readTextFile } from "./fs";
import { normalizeAbsolutePath } from "./paths";

export const parseFileOptions = async (opts: {
  fileOptionNames: string[];
  optionsInput: OptionsInput;
}): Promise<OptionsInput> => {
  const { fileOptionNames, optionsInput } = opts;
  const completeOptionsInput: OptionsInput = { ...optionsInput };

  await Promise.all(
    fileOptionNames.map(async (fileOptionName) => {
      const fileOptionKey = `${fileOptionName}-file`;
      const fileKey = camelCaseFlagName(fileOptionKey);
      const valueKey = camelCaseFlagName(fileOptionName);
      if (!optionsInput[fileKey] || optionsInput[valueKey] !== undefined) {
        return;
      }

      const absolutePath = optionsInput[fileKey] as string;
      completeOptionsInput[valueKey] = await readTextFile({
        filePath: absolutePath,
      });
      delete optionsInput[fileKey];
    })
  );

  return completeOptionsInput;
};

export const parseAndValidateFileOptions = async (opts: {
  fileOptionNames: string[];
  options: Option[];
  optionsInput: OptionsInput;
}): Promise<OptionsInput> => {
  const { fileOptionNames, options, optionsInput } = opts;
  const completeOptionsInput = await parseFileOptions({
    fileOptionNames,
    optionsInput,
  });

  for (const option of options) {
    if (option.positional) {
      continue;
    }

    if (!option.required && option.defaults === undefined) {
      continue;
    }

    const argname = parseFlagName(option.argname);
    if (completeOptionsInput[camelCaseFlagName(argname)] === undefined) {
      if (option.defaults !== undefined) {
        completeOptionsInput[camelCaseFlagName(argname)] = option.defaults;
      } else if (option.required) {
        throw new Error(`Missing required option: --${argname}`);
      }
    }
  }

  return completeOptionsInput;
};

export const injectFileOptionsForCommander = (opts: {
  fileOptionNames: string[];
  options: Option[];
}): Option[] => {
  const { fileOptionNames, options } = opts;
  const fileOptionNamesMap = new Set(fileOptionNames);

  const newOptions: Option[] = [];

  for (const option of options) {
    if (
      option.positional ||
      !fileOptionNamesMap.has(parseFlagName(option.argname))
    ) {
      newOptions.push(option);
      continue;
    }

    const argname = parseFlagName(option.argname);

    const modifiedOption: Option = { ...option };
    modifiedOption.required = undefined;
    modifiedOption.defaults = undefined;
    newOptions.push(modifiedOption);

    let newDescription = "";
    if (option.description) {
      newDescription = `Path to a file containing the ${lowercaseFirstLetter(option.description)}`;
    } else {
      // Fallback, although descriptions should always be provided.
      newDescription = `Path to a file containing the value for '${argname}'`;
    }

    newOptions.push({
      argname: `--${argname}-file <path>`,
      description: newDescription,
      parse: (value: string) => normalizeAbsolutePath({ filePath: value }),
    });
  }

  return newOptions;
};

const lowercaseFirstLetter = (str: string): string => {
  // If the second character is uppercase, we assume it's an acronym and leave it as is.
  if (str.length > 1 && str.charAt(1) === str.charAt(1).toUpperCase()) {
    return str;
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
};
