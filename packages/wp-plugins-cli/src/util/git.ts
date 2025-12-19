import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';

let gitInstance: SimpleGit | undefined;

/**
 * Returns a singleton instance of SimpleGit.
 *
 * @returns The SimpleGit instance.
 */
export function git(): SimpleGit {
  if (!gitInstance) {
    const options: Partial<SimpleGitOptions> = {
      baseDir: process.cwd(),
      binary: 'git',
    };
    gitInstance = simpleGit(options);
  }

  return gitInstance;
}
