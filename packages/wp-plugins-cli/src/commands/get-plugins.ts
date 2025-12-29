import {
  getArgs,
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
  output,
  normalizeAbsolutePath,
} from '@felixarntz/cli-utils';
import glob from 'fast-glob';

import { isWordPressPlugin } from '../util/plugin';
import { git } from '../util/git';

export const name = 'get-plugins';
export const description =
  'Gets the directories of all plugins within the directory.';

export const options: Option[] = [
  {
    argname: 'path',
    description: 'Path in which to look for WordPress plugins',
    positional: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-n, --nesting <nesting>',
    description:
      'Optional nesting level, to look deeper than a single directory',
  },
  {
    argname: '-v, --vendor <vendor>',
    description:
      'Optional GitHub vendor name, to only include plugins from that vendor',
  },
];

type CommandConfig = {
  nesting: number;
  vendor?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    nesting: opt['nesting'] ? parseInt(String(opt['nesting']), 10) : 1,
  };
  if (opt['vendor']) {
    config.vendor = String(opt['vendor']);
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [path] = getArgs(handlerArgs);
  const { nesting, vendor } = parseOptions(getOpt(handlerArgs));

  const searchPath = path ? path : process.cwd();

  const entries = await glob('**', {
    cwd: searchPath,
    onlyDirectories: true,
    deep: nesting,
    absolute: true,
  });

  if (vendor) {
    for (const entry of entries) {
      if (await isWordPressPlugin(entry)) {
        try {
          const gitInstance = git(entry);
          const remotes = await gitInstance.getRemotes(true);
          const origin = remotes.find((r) => r.name === 'origin');
          if (
            origin &&
            (origin.refs.fetch.includes(`/${vendor}/`) ||
              origin.refs.fetch.includes(`:${vendor}/`) ||
              origin.refs.push.includes(`/${vendor}/`) ||
              origin.refs.push.includes(`:${vendor}/`))
          ) {
            output(entry);
          }
        } catch {
          // Ignore errors (e.g. not a git repo)
        }
      }
    }
  } else {
    for (const entry of entries) {
      if (await isWordPressPlugin(entry)) {
        output(entry);
      }
    }
  }
};
