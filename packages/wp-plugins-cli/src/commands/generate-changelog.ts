import {
  getArgs,
  getOpt,
  type HandlerArgs,
  type OptionsInput,
  type Option,
  logger,
  output,
  runWithHeartbeat,
  normalizeAbsolutePath,
} from '@felixarntz/cli-utils';
import { Octokit } from '@octokit/rest';
import {
  detectGithubRepository,
  getPaginatedTags,
  getPaginatedCommits,
  getPaginatedPullRequests,
  getPaginatedPullRequestCommits,
  type GithubRepository,
  type CommitConstraints,
  type Commit,
} from '../util/github';

export const name = 'generate-changelog';
export const description =
  'Generates a changelog based on the commit history since the last tag.';

export const options: Option[] = [
  {
    argname: 'path',
    description: 'Path to the WordPress plugin folder',
    positional: true,
    parse: (value: string) => normalizeAbsolutePath(value),
  },
  {
    argname: '-r, --repository <repository>',
    description:
      'Optional git repository as "owner/repo", to override using the one from the current working directory',
  },
  {
    argname: '-t, --tag <tag>',
    description:
      'Optional tag name, to generate changelog for that specific tag',
  },
];

type CommandConfig = {
  repository?: string;
  tag?: string;
};

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {};
  if (opt['repository']) {
    config.repository = String(opt['repository']);
  }
  if (opt['tag']) {
    config.tag = String(opt['tag']);
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [path] = getArgs(handlerArgs);
  const { repository, tag } = parseOptions(getOpt(handlerArgs));

  const pluginPath = path ? path : process.cwd();

  let githubRepository: GithubRepository;
  if (repository) {
    const [owner, repo] = repository.split('/');
    githubRepository = {
      owner,
      repo,
    };
    logger.debug(`Using given repository ${owner}/${repo}`);
  } else {
    githubRepository = await detectGithubRepository(pluginPath);
    logger.debug(
      `Using detected repository ${githubRepository.owner}/${githubRepository.repo}`,
    );
  }

  const token = process.env['GITHUB_TOKEN'];
  if (!token) {
    throw new Error('GITHUB_TOKEN not found in environment variables');
  }

  const octokit = new Octokit({
    auth: token,
  });

  const commitConstraints = await getCommitConstraints(
    octokit,
    githubRepository,
    tag,
  );

  if (commitConstraints.sha && commitConstraints.since) {
    logger.info(
      `Getting commits since ${commitConstraints.since} up to ${commitConstraints.sha}...`,
    );
  } else if (commitConstraints.sha) {
    logger.info(`Getting commits up to ${commitConstraints.sha}...`);
  } else if (commitConstraints.since) {
    logger.info(`Getting commits since ${commitConstraints.since}...`);
  } else {
    logger.info('Getting all commits...');
  }
  const commits = await runWithHeartbeat(
    async () => {
      const allCommits = [];
      const commitsGenerator = getPaginatedCommits(
        octokit,
        githubRepository,
        commitConstraints,
      );
      for await (const someCommits of commitsGenerator) {
        allCommits.push(...someCommits);
      }
      return allCommits;
    },
    'Still getting commits...',
    5000,
  );

  const commitEntries = await getCommitEntries(
    octokit,
    githubRepository,
    commits,
  );

  logger.info('Amending commit entries with relevant pull requests...');
  const commitPrEntries = await runWithHeartbeat(
    async () =>
      await amendCommitEntriesWithPullRequests(
        octokit,
        githubRepository,
        commitEntries,
      ),
    'Still looking for pull requests...',
    5000,
  );

  const cleanEntries = stripEntriesToSkip(commitPrEntries);

  logger.info('Amending commit entries with relevant issues...');
  const commitPrIssueEntries = await runWithHeartbeat(
    async () =>
      await amendEntriesWithIssues(octokit, githubRepository, cleanEntries),
    'Still looking for issues...',
    5000,
  );

  logger.info('Generating changelog...');
  const changelogEntries = determineEntryTypes(commitPrIssueEntries);
  const changelog = getMarkdownChangelog(githubRepository, changelogEntries);
  output(changelog);
};

type ChangelogEntryReference = {
  type: 'commit' | 'issue' | 'pull';
  id: string;
};

type ChangelogEntry = {
  summary: string;
  type: string;
  props: string[];
  references: ChangelogEntryReference[];
};

type IndexLookup = {
  [key: string]: number;
};

const TYPE_LABELS: Record<string, string> = {
  feature: 'feature',
  enhancement: 'enhancement',
  bug: 'bug',
  documentation: 'documentation',
};

const TYPE_REGEXPS = [
  {
    type: 'bug',
    regexp: /^(?:Fix|Resolve)\s/i,
  },
  {
    type: 'documentation',
    regexp: /(?:^Document\s)|(?:docs?)/i,
  },
  {
    type: 'feature',
    regexp: /^(?:Introduce|Add)\s/i,
  },
];

const TYPE_HEADINGS = [
  {
    type: 'feature',
    heading: 'Features',
  },
  {
    type: 'enhancement',
    heading: 'Enhancements',
  },
  {
    type: 'bug',
    heading: 'Bug Fixes',
  },
  {
    type: 'documentation',
    heading: 'Documentation',
  },
];

const add1SecondToISOString = (isoString: string) => {
  const date = new Date(isoString);

  // The slice is to remove the milliseconds.
  return new Date(date.valueOf() + 1000).toISOString().slice(0, -5) + 'Z';
};

const getCommitConstraints = async (
  octokit: Octokit,
  githubRepository: GithubRepository,
  tag: string | undefined,
) => {
  const constraints: CommitConstraints = {};

  if (!tag) {
    // If no tag name is specified, contrain commits to those since the last release.
    const releases = await octokit.repos.listReleases({
      ...githubRepository,
      per_page: 1,
    });
    if (!releases?.data?.[0]) {
      // If there are no releases, return nothing to consider all commits.
      return constraints;
    }
    if (!releases.data[0].published_at) {
      throw new Error('Latest release has no published date');
    }
    constraints.since = add1SecondToISOString(releases.data[0].published_at);
    logger.debug(`Using latest release tag ${releases.data[0].tag_name}`);
    return constraints;
  }

  logger.debug(`Using given release tag ${tag}`);

  // Iterate through the tags to find the given one, plus the one before it.
  const tagsGenerator = getPaginatedTags(octokit, githubRepository);
  for await (const tags of tagsGenerator) {
    for (const t of tags) {
      if (t.name === tag) {
        constraints.sha = t.commit.sha;
        continue;
      }
      if (constraints.sha) {
        const release = await octokit.repos.getReleaseByTag({
          ...githubRepository,
          tag: t.name,
        });
        if (!release.data) {
          throw new Error(`No release found for tag ${t.name}`);
        }
        if (!release.data.published_at) {
          throw new Error(`Release for tag ${t.name} has no published date`);
        }
        constraints.since = add1SecondToISOString(release.data.published_at);
        break;
      }
    }

    // Stop the generator if we have found both relevant tags.
    if (constraints.sha && constraints.since) {
      await tagsGenerator.return();
    }
  }

  return constraints;
};

const getCommitEntries = async (
  octokit: Octokit,
  githubRepository: GithubRepository,
  commits: Commit[],
) => {
  const entries: ChangelogEntry[] = [];

  const { owner } = githubRepository;

  for (const commit of commits) {
    // If the commit message has multiple lines, only use the first line.
    const lines = commit.commit.message.split('\n');
    const summary = lines[0];

    const props = [];
    if (commit.author?.login && commit.author.login !== owner) {
      props.push(commit.author.login);
    }
    if (
      commit.committer?.login &&
      commit.committer.login !== owner &&
      commit.committer.login !== 'web-flow' &&
      commit.committer.login !== commit.author?.login
    ) {
      props.push(commit.committer.login);
    }

    entries.push({
      summary,
      type: '',
      props,
      references: [
        {
          type: 'commit',
          id: commit.sha,
        },
      ],
    });
  }

  return entries;
};

const amendEntryWithIssue = async (
  octokit: Octokit,
  githubRepository: GithubRepository,
  entry: ChangelogEntry,
  issueNumber: number,
) => {
  const issue = await octokit.issues.get({
    ...githubRepository,
    issue_number: issueNumber,
  });

  if (!issue.data) {
    return entry;
  }

  if (issue.data.pull_request) {
    return entry;
  }

  const amendedEntry = {
    ...entry,
    props: [...entry.props],
    references: [
      ...entry.references,
      {
        type: 'issue' as ChangelogEntryReference['type'],
        id: `${issueNumber}`,
      },
    ],
  };
  if (!amendedEntry.type) {
    for (const label of issue.data.labels) {
      if (typeof label === 'string' || !label.name) {
        continue;
      }
      if (TYPE_LABELS[label.name]) {
        amendedEntry.type = TYPE_LABELS[label.name];
      }
    }
  }
  if (
    issue.data.user?.login &&
    issue.data.user.login !== githubRepository.owner &&
    amendedEntry.props.indexOf(issue.data.user.login) < 0
  ) {
    amendedEntry.props.push(issue.data.user.login);
  }
  return amendedEntry;
};

const amendCommitEntriesWithPullRequests = async (
  octokit: Octokit,
  githubRepository: GithubRepository,
  commitEntries: ChangelogEntry[],
) => {
  const commitShaLookup: IndexLookup = commitEntries.reduce(
    (lookup: IndexLookup, entry, index) => {
      if (entry.references[0].type !== 'commit') {
        // Sanity check.
        return lookup;
      }
      lookup[entry.references[0].id] = index;
      return lookup;
    },
    {},
  );

  const entriesWithPrs: Array<ChangelogEntry | null> = [...commitEntries];

  const prsGenerator = getPaginatedPullRequests(octokit, githubRepository, {
    state: 'closed',
    base: 'main',
  });
  for await (const prs of prsGenerator) {
    for (const pr of prs) {
      if (!pr.merged_at || !pr.merge_commit_sha) {
        continue;
      }

      const commitIndex = commitShaLookup[pr.merge_commit_sha];
      if (commitIndex === undefined) {
        continue;
      }

      let type = '';
      for (const label of pr.labels) {
        if (TYPE_LABELS[label.name]) {
          type = TYPE_LABELS[label.name];
        }
      }

      const props = [];
      if (pr.user?.login && pr.user.login !== githubRepository.owner) {
        props.push(pr.user.login);
      }

      entriesWithPrs[commitIndex] = {
        summary: pr.title,
        type,
        props,
        references: [
          {
            type: 'pull' as ChangelogEntryReference['type'],
            id: `${pr.number}`,
          },
        ],
      };

      const matches = pr.body && pr.body.match(/Fix(es)? #(\d+)/i);
      if (matches) {
        const issueNumber = parseInt(matches[2], 10);
        entriesWithPrs[commitIndex] = await amendEntryWithIssue(
          octokit,
          githubRepository,
          entriesWithPrs[commitIndex],
          issueNumber,
        );
      }

      // Remove any entries for commits that are part of the pull request.
      const prCommitsGenerator = getPaginatedPullRequestCommits(
        octokit,
        githubRepository,
        pr.number,
      );
      for await (const prCommits of prCommitsGenerator) {
        for (const prCommit of prCommits) {
          const prCommitIndex = commitShaLookup[prCommit.sha];
          if (prCommitIndex === undefined) {
            continue;
          }

          entriesWithPrs[prCommitIndex] = null;
        }
      }
    }

    // TODO: Stop the generator only if the last PR is older than the oldest commit.
    await prsGenerator.return();
  }

  const amendedEntries: ChangelogEntry[] = entriesWithPrs.filter(
    (entry) => entry !== null,
  );
  return amendedEntries;
};

const amendEntriesWithIssues = async (
  octokit: Octokit,
  githubRepository: GithubRepository,
  entries: ChangelogEntry[],
) =>
  await Promise.all(
    entries.map(async (entry) => {
      const matches = entry.summary.match(/\s\((fix(es)?|see) #(\d+)\)/i);
      if (matches) {
        const issueNumber = parseInt(matches[3], 10);
        return await amendEntryWithIssue(
          octokit,
          githubRepository,
          {
            ...entry,
            summary: entry.summary.replace(matches[0], ''),
          },
          issueNumber,
        );
      }
      const matches2 = entry.summary.match(/(fix(es)?|see) #(\d+)/i);
      if (matches2) {
        const issueNumber = parseInt(matches2[3], 10);
        return await amendEntryWithIssue(
          octokit,
          githubRepository,
          entry,
          issueNumber,
        );
      }
      return entry;
    }),
  );

const stripEntriesToSkip = (entries: ChangelogEntry[]) => {
  // Skip entries that relate to development files.
  const fileRegexp = new RegExp(
    '( .(dist|env|eslint|git|npm|nvm|prettier))|(config.js|.dist|.json|.xml|.yml)|(lint )|(readme)',
    'i',
  );

  // Skip entries that relate to GitHub Actions.
  const actionsRegexp = new RegExp(
    '(GitHub)|(GitHub action)|(GH action)|(GitHub workflow)|(GH workflow)|(actions/)|(Plugin Check)',
    'i',
  );

  // Skip entries for dependency updates or tests.
  const dependencyRegexp = new RegExp(
    '(dependency)|(dependencies)|(versions)|(test)|(tests)',
    'i',
  );

  // Skip entries for merge commits.
  const mergeRegexp = new RegExp('^Merge( remote-tracking)? branch', 'i');

  // Skip entries for bumping versions.
  const versionRegexp = new RegExp('(^Bump )|(since annotation)', 'i');

  return entries.filter((entry) => {
    if (fileRegexp.test(entry.summary)) {
      return false;
    }
    if (actionsRegexp.test(entry.summary)) {
      return false;
    }
    if (dependencyRegexp.test(entry.summary)) {
      return false;
    }
    if (mergeRegexp.test(entry.summary)) {
      return false;
    }
    if (versionRegexp.test(entry.summary)) {
      return false;
    }
    return true;
  });
};

const determineEntryTypes = (entries: ChangelogEntry[]) =>
  entries.map((entry) => {
    if (entry.type) {
      return entry;
    }
    for (const t of TYPE_REGEXPS) {
      if (t.regexp.test(entry.summary)) {
        return {
          ...entry,
          type: t.type,
        };
      }
    }
    // Fall back to enhancement as it is the most generic type.
    return {
      ...entry,
      type: 'enhancement',
    };
  });

const getMarkdownChangelog = (
  githubRepository: GithubRepository,
  changelogEntries: ChangelogEntry[],
) => {
  const groupedEntries = changelogEntries.reduce(
    (grouped, entry) => {
      if (!grouped[entry.type]) {
        grouped[entry.type] = [];
      }
      grouped[entry.type].push(entry);
      return grouped;
    },
    {} as Record<string, ChangelogEntry[]>,
  );

  const { owner, repo } = githubRepository;

  const getReferenceMarkdownLink = (reference: ChangelogEntryReference) => {
    switch (reference.type) {
      case 'commit':
        return `[${reference.id.substring(
          0,
          7,
        )}](https://github.com/${owner}/${repo}/commit/${reference.id})`;
      case 'pull':
        return `[#${reference.id}](https://github.com/${owner}/${repo}/pull/${reference.id})`;
      case 'issue':
        return `[#${reference.id}](https://github.com/${owner}/${repo}/issues/${reference.id})`;
    }
  };

  const usernameLink = (username: string) =>
    `[${username}](https://github.com/${username})`;

  let changelog = '';
  for (const heading of TYPE_HEADINGS) {
    if (!groupedEntries[heading.type]) {
      continue;
    }

    changelog += `**${heading.heading}:**\n\n`;

    for (const entry of groupedEntries[heading.type]) {
      changelog += `* ${
        entry.summary.endsWith('.') ? entry.summary : entry.summary + '.'
      }`;
      if (entry.props.length) {
        changelog += ` Props ${entry.props.map(usernameLink).join(', ')}.`;
      }
      if (entry.references.length) {
        changelog += ` (${entry.references
          .map(getReferenceMarkdownLink)
          .join(', ')})`;
      }
      changelog += '\n';
    }

    changelog += '\n';
  }

  return changelog;
};
