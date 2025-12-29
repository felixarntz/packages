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
import { getReadmeFilePath } from '../util/readme';
import { git } from '../util/git';

export const name = 'bump-tested-wp';
export const description =
  'Bumps the Tested Up To WordPress version in the plugin readme and commits the change.';

export const options: Option[] = [
  {
    argname: 'path',
    description: 'Path to the WordPress plugin folder',
    positional: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-v, --version <version>',
    description: 'WordPress version number to specify in Tested Up To',
    required: true,
  },
];

type CommandConfig = {
  version: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    version: String(opt['version']),
  };
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [path] = getArgs(handlerArgs);
  const { version } = parseOptions(getOpt(handlerArgs));

  const pluginPath = path ? path : process.cwd();

  const readmeFilePath = await getReadmeFilePath(pluginPath);
  const readmeFileContents = await readTextFile(readmeFilePath);

  const testedUpToRegex = /^Tested up to:(\s+)(.*)$/m;
  const match = readmeFileContents.match(testedUpToRegex);

  if (!match) {
    logger.error('Could not find "Tested up to" tag in readme file.');
    return;
  }

  const [, separator, oldVersion] = match;

  if (oldVersion.trim() === version) {
    logger.info(`Tested Up To version is already up to date (${version}).`);
    return;
  }

  logger.info(
    `Replacing Tested Up To version from ${oldVersion.trim()} to ${version}...`,
  );

  const gitInstance = git(pluginPath);
  const status = await gitInstance.raw([
    'status',
    '--porcelain',
    readmeFilePath,
  ]);
  if (status.trim() !== '') {
    logger.error(`Readme file has uncommitted changes: ${readmeFilePath}`);
    return;
  }

  const newReadmeFileContents = readmeFileContents.replace(
    testedUpToRegex,
    `Tested up to:${separator}${version}`,
  );

  await writeTextFile(readmeFilePath, newReadmeFileContents);

  await gitInstance.add(readmeFilePath);
  await gitInstance.commit(`Bump tested WordPress version to ${version}.`);
  await gitInstance.push();

  logger.success(
    `Updated Tested Up To version from ${oldVersion.trim()} to ${version}, committed and pushed the change.`,
  );
};
