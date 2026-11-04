import path from "node:path";
import {
  getArgs,
  getOpt,
  type HandlerArgs,
  logger,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  readTextFile,
  writeTextFile,
} from "@felixarntz/cli-utils";
import glob from "fast-glob";
import { getReadmeFilePath } from "../util/readme";

export const name = "update-since";
export const description =
  'Updates "n.e.x.t" tags with the current release version.';

const STABLE_TAG_REGEX = /^Stable tag:\s*(?<version>\d+\.\d+\.\d+(?:-\w+)?)$/mu;
const SINCE_TAG_REGEX = /(?<since>@since\s+)n\.e\.x\.t/gu;
const SINCE_STRING_REGEX = /(?<since>'[^']*?)n\.e\.x\.t(?=')/gu;

export const options: Option[] = [
  {
    argname: "path",
    description: "Path to the WordPress plugin folder",
    parse: (value: string) => normalizeAbsolutePath({ filePath: value }),
    positional: true,
  },
  {
    argname: "-v, --version <version>",
    description:
      "Optional version number; if not provided, it will be read from the readme.txt file",
  },
];

interface CommandConfig {
  version?: string;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {};
  if (opt["version"]) {
    config.version = String(opt["version"]);
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [pluginPathArg] = getArgs(handlerArgs);
  const { version } = parseOptions(getOpt(handlerArgs));

  const pluginPath = pluginPathArg ? pluginPathArg : process.cwd();

  let pluginVersion: string;
  if (version) {
    pluginVersion = version;
    logger.debug(`Using given version ${pluginVersion}`);
  } else {
    pluginVersion = await detectVersion(pluginPath);
    logger.debug(`Using detected version ${pluginVersion}`);
  }

  const replacementCount = await replaceSince({
    pluginPath,
    version: pluginVersion,
  });

  if (replacementCount > 0) {
    logger.success(
      replacementCount === 1
        ? "1 replacement"
        : `${replacementCount} replacements`
    );
  } else {
    logger.warn("No replacements");
  }
};

const detectVersion = async (pluginPath: string) => {
  const readmeFilePath = await getReadmeFilePath(pluginPath);
  const readmeFileContents = await readTextFile({ filePath: readmeFilePath });

  const stableTagVersionMatches = readmeFileContents.match(STABLE_TAG_REGEX);
  if (!stableTagVersionMatches) {
    throw new Error(`Unable to locate version in ${readmeFilePath}`);
  }
  return stableTagVersionMatches[1];
};

const replaceSince = async (opts: { pluginPath: string; version: string }) => {
  const { pluginPath, version } = opts;
  const patterns = [
    path.join(pluginPath, "**/*.php"),
    path.join(pluginPath, "**/*.js"),
    path.join(pluginPath, "**/*.jsx"),
    path.join(pluginPath, "**/*.ts"),
    path.join(pluginPath, "**/*.tsx"),
  ];
  const ignore = [
    "**/node_modules",
    "**/vendor",
    "**/third-party",
    "**/bin",
    "**/build",
    "**/dist",
  ];

  const files = await glob(patterns, {
    ignore,
  });

  const regexps = [SINCE_TAG_REGEX, SINCE_STRING_REGEX];

  let replacementCount = 0;
  await Promise.all(
    files.map(async (file) => {
      let content = await readTextFile({ filePath: file });
      let fileReplacementCount = 0;
      for (const regexp of regexps) {
        const matches = content.match(regexp);
        if (matches) {
          replacementCount += matches.length;
          fileReplacementCount += matches.length;
          content = content.replace(
            regexp,
            (_matches, sinceTag: string) => sinceTag + version
          );
        }
      }
      if (fileReplacementCount > 0) {
        await writeTextFile({ content, filePath: file });
      }
    })
  );
  return replacementCount;
};
