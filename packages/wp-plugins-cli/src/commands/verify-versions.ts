import path from "node:path";
import {
  fileExists,
  getArgs,
  type HandlerArgs,
  logger,
  normalizeAbsolutePath,
  type Option,
  readTextFile,
} from "@felixarntz/cli-utils";
import glob from "fast-glob";
import { getReadmeFilePath } from "../util/readme";

export const name = "verify-versions";
export const description = "Verifies consistency of versions in a plugin.";

const STABLE_TAG_REGEX = /^Stable tag:\s*(?<version>\d+\.\d+\.\d+(?:-\w+)?)$/mu;
const CHANGELOG_VERSION_REGEX =
  /^== Changelog ==\n+= (?<version>\d+\.\d+\.\d+(?:-\w+)?) =$/mu;
const HEADER_VERSION_REGEX =
  /^ \* Version:\s+(?<version>\d+\.\d+\.\d+(?:-\w+)?)$/mu;

export const options: Option[] = [
  {
    argname: "path",
    description: "Path to the WordPress plugin folder",
    parse: (value: string) => normalizeAbsolutePath(value),
    positional: true,
  },
];

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [pluginPathArg] = getArgs(handlerArgs);
  const pluginPath = pluginPathArg ? pluginPathArg : process.cwd();

  const allVersions = {
    ...(await getReadmeVersions(pluginPath)),
    ...(await getPhpFileVersions(pluginPath)),
  };

  const [version] = Object.values(allVersions);
  if (
    !Object.values(allVersions).every(
      (anotherVersion) => anotherVersion === version
    )
  ) {
    throw new Error(
      `Version mismatch: ${JSON.stringify(allVersions, null, 2)}`
    );
  }

  if (version.includes("-")) {
    logger.warn(`${version} (pre-release identifier is present)`);
  } else {
    logger.success(`${version}`);
  }
};

const getReadmeVersions = async (pluginPath: string) => {
  const readmeFilePath = await getReadmeFilePath(pluginPath);
  const readmeFileContents = await readTextFile(readmeFilePath);

  const stableTagVersionMatches = readmeFileContents.match(STABLE_TAG_REGEX);
  if (!stableTagVersionMatches) {
    throw new Error(`Unable to locate stable tag in ${readmeFilePath}`);
  }
  const [, stableTagVersion] = stableTagVersionMatches;

  const latestChangelogMatches = readmeFileContents.match(
    CHANGELOG_VERSION_REGEX
  );
  if (!latestChangelogMatches) {
    throw new Error(
      `Unable to locate latest version entry in changelog in ${readmeFilePath}.`
    );
  }
  const [, latestChangelogVersion] = latestChangelogMatches;

  return {
    latestChangelogVersion,
    stableTagVersion,
  };
};

const getPhpFileVersions = async (pluginPath: string) => {
  const pluginSlug = path.basename(pluginPath);

  const mainFilePath = path.join(pluginPath, `${pluginSlug}.php`);
  if (!(await fileExists(mainFilePath))) {
    throw new Error(`Main plugin file not found at ${mainFilePath}`);
  }

  const mainFileContents = await readTextFile(mainFilePath);

  const headerVersionMatches = mainFileContents.match(HEADER_VERSION_REGEX);
  if (!headerVersionMatches) {
    throw new Error(
      `Unable to locate version in PHP header in ${mainFilePath}.`
    );
  }
  const [, headerVersion] = headerVersionMatches;

  const constantName = `${hyphenCaseToConstantCase(pluginSlug)}_VERSION`;
  const constantRegexp = new RegExp(
    `define\\(\\s*'${constantName}',\\s*'(?<version>.+?)'\\s*\\);`,
    "u"
  );

  const phpFiles = await glob(path.join(pluginPath, "*.php"));
  const constantVersionMatches = (
    await Promise.all(
      phpFiles.map(async (phpFile) => {
        const phpFileContents = await readTextFile(phpFile);
        return phpFileContents.match(constantRegexp);
      })
    )
  ).find((match) => match !== null);
  const constantVersion = constantVersionMatches?.[1];

  if (constantVersion) {
    return {
      constantVersion,
      headerVersion,
    };
  }

  logger.warn(`No PHP version constant ${constantName} found`);

  return {
    headerVersion,
  };
};

const hyphenCaseToConstantCase = (str: string): string =>
  str
    .split("-")
    .map((part) => part.toUpperCase())
    .join("_");
