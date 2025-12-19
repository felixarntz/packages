import type { Octokit } from '@octokit/rest';
import { git } from './git';

export type GithubRepository = {
  owner: string;
  repo: string;
};

export type CommitConstraints = {
  sha?: string;
  since?: string;
  until?: string;
};

export type PullRequestConstraints = {
  state?: 'open' | 'closed' | 'all';
  base?: string;
  head?: string;
};

export type Commit = Awaited<
  ReturnType<Octokit['repos']['listCommits']>
>['data'][number];

/**
 * Detects the GitHub repository from the git remotes.
 *
 * @returns The GitHub repository details.
 * @throws If no GitHub repository could be detected.
 */
export async function detectGithubRepository(): Promise<GithubRepository> {
  const remotes = await git().getRemotes(true);
  for (const remote of remotes) {
    if (remote.name !== 'origin') {
      continue;
    }
    const match = remote.refs.fetch.match(
      /github\.com[:/](.+?)\/(.+?)(?:\.git)?$/,
    );
    if (!match) {
      continue;
    }
    const [, owner, repo] = match;
    return {
      owner,
      repo,
    };
  }
  throw new Error('Could not detect GitHub repository from git remotes');
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
  perPage: number = 100,
) {
  const requestArgs = {
    ...repository,
    per_page: perPage,
  };

  let page = 1;
  let tags;
  do {
    tags = await octokit.repos.listTags({
      ...requestArgs,
      page,
    });
    if (!tags.data) {
      throw new Error('No tags found');
    }
    yield tags.data;
    page++;
  } while (tags.data.length === perPage);
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
  perPage: number = 100,
) {
  const requestArgs = {
    ...repository,
    ...constraints,
    per_page: perPage,
  };

  let page = 1;
  let commits;
  do {
    commits = await octokit.repos.listCommits({
      ...requestArgs,
      page,
    });
    if (!commits.data) {
      throw new Error('No commits found');
    }
    yield commits.data;
    page++;
  } while (commits.data.length === perPage);
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
  perPage: number = 100,
) {
  const requestArgs = {
    ...repository,
    ...constraints,
    per_page: perPage,
  };

  let page = 1;
  let pullRequests;
  do {
    pullRequests = await octokit.pulls.list({
      ...requestArgs,
      page,
    });
    if (!pullRequests.data) {
      throw new Error('No pull requests found');
    }
    yield pullRequests.data;
    page++;
  } while (pullRequests.data.length === perPage);
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
  perPage: number = 100,
) {
  const requestArgs = {
    ...repository,
    pull_number: pullRequestNumber,
    per_page: perPage,
  };

  let page = 1;
  let commits;
  do {
    commits = await octokit.pulls.listCommits({
      ...requestArgs,
      page,
    });
    if (!commits.data) {
      throw new Error('No commits found');
    }
    yield commits.data;
    page++;
  } while (commits.data.length === perPage);
}
