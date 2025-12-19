import path from 'node:path';
import { logger, fileExists, readTextFile } from '@felixarntz/cli-utils';
import glob from 'fast-glob';

export const name = 'verify-versions';
export const description = 'Verifies consistency of versions in a plugin.';

export const options = [];

export const handler = async (): Promise<void> => {
  const allVersions = {
    ...(await getReadmeVersions()),
    ...(await getPhpFileVersions()),
  };

  const version = Object.values(allVersions)[0];
  if (
    !Object.values(allVersions).every(
      (anotherVersion) => anotherVersion === version,
    )
  ) {
    throw new Error(
      `Version mismatch: ${JSON.stringify(allVersions, null, 2)}`,
    );
  }

  if (version.includes('-')) {
    logger.warn(`${version} (pre-release identifier is present)`);
  } else {
    logger.success(`${version}`);
  }
};

const getReadmeVersions = async () => {
  let readmeFilePath: string;
  if (await fileExists(path.join(process.cwd(), 'readme.txt'))) {
    readmeFilePath = path.join(process.cwd(), 'readme.txt');
  } else if (await fileExists(path.join(process.cwd(), 'readme.md'))) {
    readmeFilePath = path.join(process.cwd(), 'readme.md');
  } else if (await fileExists(path.join(process.cwd(), 'README.md'))) {
    readmeFilePath = path.join(process.cwd(), 'README.md');
  } else {
    throw new Error(
      'No readme.txt or readme.md file found in the current directory.',
    );
  }
  const readmeFileContents = await readTextFile(readmeFilePath);

  const stableTagVersionMatches = readmeFileContents.match(
    /^Stable tag:\s*(\d+\.\d+\.\d+(?:-\w+)?)$/m,
  );
  if (!stableTagVersionMatches) {
    throw new Error(`Unable to locate stable tag in ${readmeFilePath}`);
  }
  const stableTagVersion = stableTagVersionMatches[1];

  const latestChangelogMatches = readmeFileContents.match(
    /^== Changelog ==\n+= (\d+\.\d+\.\d+(?:-\w+)?) =$/m,
  );
  if (!latestChangelogMatches) {
    throw new Error(
      `Unable to locate latest version entry in changelog in ${readmeFilePath}.`,
    );
  }
  const latestChangelogVersion = latestChangelogMatches[1];

  return {
    stableTagVersion,
    latestChangelogVersion,
  };
};

const getPhpFileVersions = async () => {
  const pluginSlug = path.basename(process.cwd());

  const mainFilePath = path.join(process.cwd(), `${pluginSlug}.php`);
  if (!(await fileExists(mainFilePath))) {
    throw new Error(`Main plugin file not found at ${mainFilePath}`);
  }

  const mainFileContents = await readTextFile(mainFilePath);

  const headerVersionMatches = mainFileContents.match(
    /^ \* Version:\s+(\d+\.\d+\.\d+(?:-\w+)?)$/m,
  );
  if (!headerVersionMatches) {
    throw new Error(
      `Unable to locate version in PHP header in ${mainFilePath}.`,
    );
  }
  const headerVersion = headerVersionMatches[1];

  const constantName = `${hyphenCaseToConstantCase(pluginSlug)}_VERSION`;
  const constantRegexp = new RegExp(
    `define\\(\\s*'${constantName}',\\s*'(.+?)'\\s*\\);`,
  );

  let constantVersion = null;
  for (const phpFile of await glob(path.join(process.cwd(), '*.php'))) {
    const phpFileContents = await readTextFile(phpFile);
    const constantVersionMatches = phpFileContents.match(constantRegexp);
    if (constantVersionMatches) {
      constantVersion = constantVersionMatches[1];
      break;
    }
  }

  if (constantVersion) {
    return {
      headerVersion,
      constantVersion,
    };
  }

  logger.warn(`No PHP version constant ${constantName} found`);

  return {
    headerVersion,
  };
};

const hyphenCaseToConstantCase = (str: string): string =>
  str
    .split('-')
    .map((part) => part.toUpperCase())
    .join('_');
