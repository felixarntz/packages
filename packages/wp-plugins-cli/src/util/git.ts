import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';

const gitInstances: Record<string, SimpleGit> = {};

/**
 * Returns a singleton instance of SimpleGit.
 *
 * @param baseDir - Optional base directory for the git instance. Defaults to the current working directory.
 * @returns The SimpleGit instance.
 */
export function git(baseDir?: string): SimpleGit {
  const gitBaseDir = baseDir || process.cwd();

  if (!gitInstances[gitBaseDir]) {
    const options: Partial<SimpleGitOptions> = {
      baseDir: gitBaseDir,
      binary: 'git',
    };
    gitInstances[gitBaseDir] = simpleGit(options);
  }

  return gitInstances[gitBaseDir];
}
