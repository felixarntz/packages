import type { Octokit } from "@octokit/rest";
import { git } from "./git";

const GITHUB_REMOTE_REGEX =
  /github\.com[:/](?<owner>.+?)\/(?<repo>.+?)(?:\.git)?$/u;

export interface GithubRepository {
  owner: string;
  repo: string;
}

export interface CommitConstraints {
  sha?: string;
  since?: string;
  until?: string;
}

export interface PullRequestConstraints {
  base?: string;
  head?: string;
  state?: "open" | "closed" | "all";
}

export type Commit = Awaited<
  ReturnType<Octokit["repos"]["listCommits"]>
>["data"][number];

export type PullRequest = Awaited<
  ReturnType<Octokit["pulls"]["list"]>
>["data"][number];

/**
 * Detects the GitHub repository from the git remotes.
 *
 * @param baseDir - Optional base directory for the git instance. Defaults to the current working directory.
 * @returns The GitHub repository details.
 * @throws If no GitHub repository could be detected.
 */
export async function detectGithubRepository(
  baseDir?: string
): Promise<GithubRepository> {
  const remotes = await git(baseDir).getRemotes(true);
  for (const remote of remotes) {
    if (remote.name !== "origin") {
      continue;
    }
    const match = remote.refs.fetch.match(GITHUB_REMOTE_REGEX);
    if (!match) {
      continue;
    }
    const [, owner, repo] = match;
    return {
      owner,
      repo,
    };
  }
  throw new Error("Could not detect GitHub repository from git remotes");
}

/**
 * Generator function to paginate through tags in a GitHub repository.
 *
 * @param octokit - The Octokit instance.
 * @param repository - The GitHub repository details.
 * @param perPage - Number of items per page.
 * @returns An async generator yielding pages of tags.
 */
export async function* getPaginatedTags(
  octokit: Octokit,
  repository: GithubRepository,
  perPage = 100
) {
  const requestArgs = {
    ...repository,
    per_page: perPage,
  };

  let page = 1;
  let hasMore = true;
  while (hasMore) {
    // biome-ignore lint/performance/noAwaitInLoops: GitHub tag pages must be requested in order
    const tags = await octokit.repos.listTags({
      ...requestArgs,
      page,
    });
    if (!tags.data) {
      throw new Error("No tags found");
    }
    yield tags.data;
    hasMore = tags.data.length >= perPage;
    page += 1;
  }
}

/**
 * Generator function to paginate through commits in a GitHub repository.
 *
 * @param octokit - The Octokit instance.
 * @param repository - The GitHub repository details.
 * @param constraints - Constraints for filtering commits.
 * @param perPage - Number of items per page.
 * @returns An async generator yielding pages of commits.
 */
export async function* getPaginatedCommits(
  octokit: Octokit,
  repository: GithubRepository,
  constraints: CommitConstraints,
  perPage = 100
) {
  const requestArgs = {
    ...repository,
    ...constraints,
    per_page: perPage,
  };

  let page = 1;
  let hasMore = true;
  while (hasMore) {
    // biome-ignore lint/performance/noAwaitInLoops: GitHub commit pages must be requested in order
    const commits = await octokit.repos.listCommits({
      ...requestArgs,
      page,
    });
    if (!commits.data) {
      throw new Error("No commits found");
    }
    yield commits.data;
    hasMore = commits.data.length >= perPage;
    page += 1;
  }
}

/**
 * Generator function to paginate through pull requests in a GitHub repository.
 *
 * @param octokit - The Octokit instance.
 * @param repository - The GitHub repository details.
 * @param constraints - Constraints for filtering pull requests.
 * @param perPage - Number of items per page.
 * @returns An async generator yielding pages of pull requests.
 */
export async function* getPaginatedPullRequests(
  octokit: Octokit,
  repository: GithubRepository,
  constraints: PullRequestConstraints,
  perPage = 100
) {
  const requestArgs = {
    ...repository,
    ...constraints,
    per_page: perPage,
  };

  let page = 1;
  let hasMore = true;
  while (hasMore) {
    // biome-ignore lint/performance/noAwaitInLoops: GitHub pull request pages must be requested in order
    const pullRequests = await octokit.pulls.list({
      ...requestArgs,
      page,
    });
    if (!pullRequests.data) {
      throw new Error("No pull requests found");
    }
    yield pullRequests.data;
    hasMore = pullRequests.data.length >= perPage;
    page += 1;
  }
}

/**
 * Generator function to paginate through commits of a specific pull request in a GitHub repository.
 *
 * @param octokit - The Octokit instance.
 * @param repository - The GitHub repository details.
 * @param pullRequestNumber - The pull request number.
 * @param perPage - Number of items per page.
 * @returns An async generator yielding pages of pull request commits.
 */
export async function* getPaginatedPullRequestCommits(
  octokit: Octokit,
  repository: GithubRepository,
  pullRequestNumber: number,
  perPage = 100
) {
  const requestArgs = {
    ...repository,
    per_page: perPage,
    pull_number: pullRequestNumber,
  };

  let page = 1;
  let hasMore = true;
  while (hasMore) {
    // biome-ignore lint/performance/noAwaitInLoops: GitHub pull request commit pages must be requested in order
    const commits = await octokit.pulls.listCommits({
      ...requestArgs,
      page,
    });
    if (!commits.data) {
      throw new Error("No commits found");
    }
    yield commits.data;
    hasMore = commits.data.length >= perPage;
    page += 1;
  }
}
