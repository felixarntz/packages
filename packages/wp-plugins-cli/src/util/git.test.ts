import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simpleGit } from 'simple-git';

import { git } from './git';

// Mock simple-git to return a mock object
vi.mock('simple-git', () => ({
  simpleGit: vi.fn(() => ({ mockSimpleGit: true })),
}));

describe('git', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a SimpleGit instance', () => {
    const uniqueDir = Math.random().toString();
    vi.spyOn(process, 'cwd').mockReturnValue(uniqueDir);
    const instance = git();
    expect(instance).toEqual({ mockSimpleGit: true });
    expect(simpleGit).toHaveBeenCalledWith({
      baseDir: uniqueDir,
      binary: 'git',
    });
  });

  it('should return the same instance for the same baseDir and call simpleGit only once', () => {
    const baseDir = Math.random().toString();
    const instance1 = git(baseDir);
    expect(simpleGit).toHaveBeenCalledTimes(1);
    expect(simpleGit).toHaveBeenCalledWith({ baseDir, binary: 'git' });

    const instance2 = git(baseDir);
    expect(simpleGit).toHaveBeenCalledTimes(1);
    expect(instance1).toBe(instance2);
  });

  it('should return different instances for different baseDir and call simpleGit for each', () => {
    const baseDir1 = Math.random().toString();
    const baseDir2 = Math.random().toString();
    const instance1 = git(baseDir1);
    expect(simpleGit).toHaveBeenCalledTimes(1);
    expect(simpleGit).toHaveBeenCalledWith({
      baseDir: baseDir1,
      binary: 'git',
    });

    const instance2 = git(baseDir2);
    expect(simpleGit).toHaveBeenCalledTimes(2);
    expect(simpleGit).toHaveBeenLastCalledWith({
      baseDir: baseDir2,
      binary: 'git',
    });
    expect(instance1).not.toBe(instance2);
  });

  it('should default to process.cwd() when no baseDir is provided', () => {
    const uniqueCwd = Math.random().toString();
    vi.spyOn(process, 'cwd').mockReturnValue(uniqueCwd);
    git();
    expect(simpleGit).toHaveBeenCalledWith({
      baseDir: uniqueCwd,
      binary: 'git',
    });
  });

  it('should fall back to process.cwd() for empty string baseDir', () => {
    const uniqueCwd = Math.random().toString();
    vi.spyOn(process, 'cwd').mockReturnValue(uniqueCwd);
    git('');
    expect(simpleGit).toHaveBeenCalledWith({
      baseDir: uniqueCwd,
      binary: 'git',
    });
  });
});
