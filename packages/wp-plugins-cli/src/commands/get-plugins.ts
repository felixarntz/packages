import {
  getArgs,
  getOpt,
  type HandlerArgs,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  output,
} from "@felixarntz/cli-utils";
import glob from "fast-glob";
import { git } from "../util/git";
import { isWordPressPlugin } from "../util/plugin";

export const name = "get-plugins";
export const description =
  "Gets the directories of all plugins within the directory.";

export const options: Option[] = [
  {
    argname: "path",
    description: "Path in which to look for WordPress plugins",
    positional: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: "-n, --nesting <nesting>",
    description:
      "Optional nesting level, to look deeper than a single directory",
  },
  {
    argname: "-v, --vendor <vendor>",
    description:
      "Optional GitHub vendor name, to only include plugins from that vendor",
  },
];

interface CommandConfig {
  nesting: number;
  vendor?: string;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {
    nesting: opt.nesting ? Number.parseInt(String(opt.nesting), 10) : 1,
  };
  if (opt.vendor) {
    config.vendor = String(opt.vendor);
  }
  return config;
};

const isPluginFromVendor = async (
  entry: string,
  vendor: string
): Promise<boolean> => {
  try {
    const gitInstance = git(entry);
    const remotes = await gitInstance.getRemotes(true);
    const origin = remotes.find((r) => r.name === "origin");
    return !!(
      origin &&
      (origin.refs.fetch.includes(`/${vendor}/`) ||
        origin.refs.fetch.includes(`:${vendor}/`) ||
        origin.refs.push.includes(`/${vendor}/`) ||
        origin.refs.push.includes(`:${vendor}/`))
    );
  } catch {
    return false;
  }
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [path] = getArgs(handlerArgs);
  const { nesting, vendor } = parseOptions(getOpt(handlerArgs));

  const searchPath = path ? path : process.cwd();

  const entries = await glob("**", {
    cwd: searchPath,
    onlyDirectories: true,
    deep: nesting,
    absolute: true,
  });

  for (const entry of entries) {
    if (!(await isWordPressPlugin(entry))) {
      continue;
    }
    if (!vendor || (await isPluginFromVendor(entry, vendor))) {
      output(entry);
    }
  }
};
