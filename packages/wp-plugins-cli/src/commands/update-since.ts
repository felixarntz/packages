import path from 'node:path';
import {
  getArgs,
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
  logger,
  readTextFile,
  writeTextFile,
  normalizeAbsolutePath,
} from '@felixarntz/cli-utils';
import glob from 'fast-glob';
import { getReadmeFilePath } from '../util/readme';

export const name = 'update-since';
export const description =
  'Updates "n.e.x.t" tags with the current release version.';

export const options: Option[] = [
  {
    argname: 'path',
    description: 'Path to the WordPress plugin folder',
    positional: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-v, --version <version>',
    description:
      'Optional version number; if not provided, it will be read from the readme.txt file',
  },
];

type CommandConfig = {
  version?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {};
  if (opt['version']) {
    config.version = String(opt['version']);
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [path] = getArgs(handlerArgs);
  const { version } = parseOptions(getOpt(handlerArgs));

  const pluginPath = path ? path : process.cwd();

  let pluginVersion: string;
  if (version) {
    pluginVersion = version;
    logger.debug(`Using given version ${pluginVersion}`);
  } else {
    pluginVersion = await detectVersion(pluginPath);
    logger.debug(`Using detected version ${pluginVersion}`);
  }

  const replacementCount = await replaceSince(pluginPath, pluginVersion);

  if (replacementCount > 0) {
    logger.success(
      replacementCount === 1
        ? '1 replacement'
        : `${replacementCount} replacements`,
    );
  } else {
    logger.warn('No replacements');
  }
};

const detectVersion = async (pluginPath: string) => {
  const readmeFilePath = await getReadmeFilePath(pluginPath);
  const readmeFileContents = await readTextFile(readmeFilePath);

  const stableTagVersionMatches = readmeFileContents.match(
    /^Stable tag:\s*(\d+\.\d+\.\d+(?:-\w+)?)$/m,
  );
  if (!stableTagVersionMatches) {
    throw new Error(`Unable to locate version in ${readmeFilePath}`);
  }
  return stableTagVersionMatches[1];
};

const replaceSince = async (pluginPath: string, version: string) => {
  const patterns = [
    path.join(pluginPath, '**/*.php'),
    path.join(pluginPath, '**/*.js'),
    path.join(pluginPath, '**/*.jsx'),
    path.join(pluginPath, '**/*.ts'),
    path.join(pluginPath, '**/*.tsx'),
  ];
  const ignore = [
    '**/node_modules',
    '**/vendor',
    '**/third-party',
    '**/bin',
    '**/build',
    '**/dist',
  ];

  const files = await glob(patterns, {
    ignore,
  });

  const regexps = [/(@since\s+)n\.e\.x\.t/g, /('[^']*?)n\.e\.x\.t(?=')/g];

  let replacementCount = 0;
  await Promise.all(
    files.map(async (file) => {
      let content = await readTextFile(file);
      let fileReplacementCount = 0;
      for (const regexp of regexps) {
        if (regexp.test(content)) {
          content = content.replace(regexp, (_matches, sinceTag: string) => {
            replacementCount++;
            fileReplacementCount++;
            return sinceTag + version;
          });
        }
      }
      if (fileReplacementCount > 0) {
        await writeTextFile(file, content);
      }
    }),
  );
  return replacementCount;
};
