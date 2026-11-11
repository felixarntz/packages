import {
  getArgs,
  getOpt,
  type HandlerArgs,
  logger,
  normalizeAbsolutePath,
  type Option,
  type OptionsInput,
  output,
  runWithHeartbeat,
} from "@felixarntz/cli-utils";
import { Octokit } from "@octokit/rest";
import {
  type Commit,
  type CommitConstraints,
  detectGithubRepository,
  type GithubRepository,
  getPaginatedCommits,
  getPaginatedPullRequestCommits,
  getPaginatedPullRequests,
  getPaginatedTags,
  type PullRequest,
} from "../util/github";

export const name = "generate-changelog";
export const description =
  "Generates a changelog based on the commit history since the last tag.";

const ISSUE_WITH_PARENS_REGEX = /\s\((?:fix(?:es)?|see) #(?<issue>\d+)\)/iu;
const ISSUE_REGEX = /(?:fix(?:es)?|see) #(?<issue>\d+)/iu;
const FILE_ENTRY_REGEX =
  /(?: .(?:dist|env|eslint|git|npm|nvm|prettier))|(?:config.js|.dist|.json|.xml|.yml)|(?:lint )|(?:readme)/iu;
const ACTIONS_ENTRY_REGEX =
  /(?:GitHub)|(?:GitHub action)|(?:GH action)|(?:GitHub workflow)|(?:GH workflow)|(?:actions\/)|(?:Plugin Check)/iu;
const DEPENDENCY_ENTRY_REGEX =
  /(?:dependency)|(?:dependencies)|(?:versions)|(?:test)|(?:tests)/iu;
const MERGE_ENTRY_REGEX = /^Merge(?: remote-tracking)? branch/iu;
const VERSION_ENTRY_REGEX = /(?:^Bump )|(?:since annotation)/iu;
const FIX_ISSUE_REGEX = /Fix(?:es)? #(?<issue>\d+)/iu;

export const options: Option[] = [
  {
    argname: "path",
    description: "Path to the WordPress plugin folder",
    parse: (value: string) => normalizeAbsolutePath({ filePath: value }),
    positional: true,
  },
  {
    argname: "-r, --repository <repository>",
    description:
      'Optional git repository as "owner/repo", to override using the one from the current working directory',
  },
  {
    argname: "-t, --tag <tag>",
    description:
      "Optional tag name, to generate changelog for that specific tag",
  },
];

interface CommandConfig {
  repository?: string;
  tag?: string;
}

const parseOptions = (opt: OptionsInput): CommandConfig => {
  const config: CommandConfig = {};
  if (opt["repository"]) {
    config.repository = String(opt["repository"]);
  }
  if (opt["tag"]) {
    config.tag = String(opt["tag"]);
  }
  return config;
};

export const handler = async (...handlerArgs: HandlerArgs): Promise<void> => {
  const [path] = getArgs(handlerArgs);
  const { repository, tag } = parseOptions(getOpt(handlerArgs));

  const pluginPath = path ? path : process.cwd();

  let githubRepository: GithubRepository;
  if (repository) {
    const [owner, repo] = repository.split("/");
    githubRepository = {
      owner,
      repo,
    };
    logger.debug(`Using given repository ${owner}/${repo}`);
  } else {
    githubRepository = await detectGithubRepository(pluginPath);
    logger.debug(
      `Using detected repository ${githubRepository.owner}/${githubRepository.repo}`
    );
  }

  const token = process.env["GITHUB_TOKEN"];
  if (!token) {
    throw new Error("GITHUB_TOKEN not found in environment variables");
  }

  const octokit = new Octokit({
    auth: token,
  });

  const commitConstraints = await getCommitConstraints({
    githubRepository,
    octokit,
    tag,
  });

  if (commitConstraints.sha && commitConstraints.since) {
    logger.info(
      `Getting commits since ${commitConstraints.since} up to ${commitConstraints.sha}...`
    );
  } else if (commitConstraints.sha) {
    logger.info(`Getting commits up to ${commitConstraints.sha}...`);
  } else if (commitConstraints.since) {
    logger.info(`Getting commits since ${commitConstraints.since}...`);
  } else {
    logger.info("Getting all commits...");
  }
  const commits = await runWithHeartbeat({
    action: async () => {
      const allCommits: Commit[] = [];
      const commitsGenerator = getPaginatedCommits({
        constraints: commitConstraints,
        octokit,
        repository: githubRepository,
      });
      for await (const someCommits of commitsGenerator) {
        allCommits.push(...someCommits);
      }
      return allCommits;
    },
    heartbeatMessage: "Still getting commits...",
    intervalMs: 5000,
  });

  const commitEntries = getCommitEntries({
    commits,
    githubRepository,
  });

  logger.info("Amending commit entries with relevant pull requests...");
  const commitPrEntries = await runWithHeartbeat({
    action: async () =>
      await amendCommitEntriesWithPullRequests({
        commitEntries,
        githubRepository,
        octokit,
      }),
    heartbeatMessage: "Still looking for pull requests...",
    intervalMs: 5000,
  });

  const cleanEntries = stripEntriesToSkip(commitPrEntries);

  logger.info("Amending commit entries with relevant issues...");
  const commitPrIssueEntries = await runWithHeartbeat({
    action: async () =>
      await amendEntriesWithIssues({
        entries: cleanEntries,
        githubRepository,
        octokit,
      }),
    heartbeatMessage: "Still looking for issues...",
    intervalMs: 5000,
  });

  logger.info("Generating changelog...");
  const changelogEntries = determineEntryTypes(commitPrIssueEntries);
  const changelog = getMarkdownChangelog({
    changelogEntries,
    githubRepository,
  });
  output(changelog);
};

interface ChangelogEntryReference {
  id: string;
  type: "commit" | "issue" | "pull";
}

interface ChangelogEntry {
  props: string[];
  references: ChangelogEntryReference[];
  summary: string;
  type: string;
}

interface IndexLookup {
  [key: string]: number;
}

const TYPE_LABELS: Record<string, string> = Object.assign(Object.create(null), {
  bug: "bug",
  documentation: "documentation",
  enhancement: "enhancement",
  feature: "feature",
});

const TYPE_REGEXPS = [
  {
    regexp: /^(?:Fix|Resolve)\s/iu,
    type: "bug",
  },
  {
    regexp: /(?:^Document\s)|(?:docs?)/iu,
    type: "documentation",
  },
  {
    regexp: /^(?:Introduce|Add)\s/iu,
    type: "feature",
  },
];

const TYPE_HEADINGS = [
  {
    heading: "Features",
    type: "feature",
  },
  {
    heading: "Enhancements",
    type: "enhancement",
  },
  {
    heading: "Bug Fixes",
    type: "bug",
  },
  {
    heading: "Documentation",
    type: "documentation",
  },
];

const add1SecondToIsoString = (isoString: string) => {
  const date = new Date(isoString);

  // The slice is to remove the milliseconds.
  return `${new Date(date.valueOf() + 1000).toISOString().slice(0, -5)}Z`;
};

const findTagConstraints = async (opts: {
  constraints: CommitConstraints;
  githubRepository: GithubRepository;
  octokit: Octokit;
  tag: string;
}): Promise<void> => {
  const { constraints, githubRepository, octokit, tag } = opts;
  const tagsGenerator = getPaginatedTags({
    octokit,
    repository: githubRepository,
  });
  for await (const tags of tagsGenerator) {
    for (const t of tags) {
      if (t.name === tag) {
        constraints.sha = t.commit.sha;
        continue;
      }
      if (constraints.sha) {
        // biome-ignore lint/performance/noAwaitInLoops: the next tag's release date depends on finding the requested tag first
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
        constraints.since = add1SecondToIsoString(release.data.published_at);
        break;
      }
    }

    if (constraints.sha && constraints.since) {
      await tagsGenerator.return();
    }
  }
};

const getCommitConstraints = async (opts: {
  githubRepository: GithubRepository;
  octokit: Octokit;
  tag?: string;
}) => {
  const { githubRepository, octokit, tag } = opts;
  const constraints: CommitConstraints = {};

  if (!tag) {
    // If no tag name is specified, contrain commits to those since the last release.
    const releases = await octokit.repos.listReleases({
      ...githubRepository,
      // biome-ignore lint/style/useNamingConvention: GitHub API field name
      per_page: 1,
    });
    if (!releases?.data?.[0]) {
      // If there are no releases, return nothing to consider all commits.
      return constraints;
    }
    if (!releases.data[0].published_at) {
      throw new Error("Latest release has no published date");
    }
    constraints.since = add1SecondToIsoString(releases.data[0].published_at);
    logger.debug(`Using latest release tag ${releases.data[0].tag_name}`);
    return constraints;
  }

  logger.debug(`Using given release tag ${tag}`);
  await findTagConstraints({ constraints, githubRepository, octokit, tag });
  return constraints;
};

const getCommitEntries = (opts: {
  commits: Commit[];
  githubRepository: GithubRepository;
}) => {
  const { commits, githubRepository } = opts;
  const entries: ChangelogEntry[] = [];

  const { owner } = githubRepository;

  for (const commit of commits) {
    // If the commit message has multiple lines, only use the first line.
    const [summary] = commit.commit.message.split("\n");

    const props: string[] = [];
    if (commit.author?.login && commit.author.login !== owner) {
      props.push(commit.author.login);
    }
    if (
      commit.committer?.login &&
      commit.committer.login !== owner &&
      commit.committer.login !== "web-flow" &&
      commit.committer.login !== commit.author?.login
    ) {
      props.push(commit.committer.login);
    }

    entries.push({
      props,
      references: [
        {
          id: commit.sha,
          type: "commit",
        },
      ],
      summary,
      type: "",
    });
  }

  return entries;
};

const amendEntryWithIssue = async (opts: {
  entry: ChangelogEntry;
  githubRepository: GithubRepository;
  issueNumber: number;
  octokit: Octokit;
}) => {
  const { entry, githubRepository, issueNumber, octokit } = opts;
  const issue = await octokit.issues.get({
    ...githubRepository,
    // biome-ignore lint/style/useNamingConvention: GitHub API field name
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
        id: `${issueNumber}`,
        type: "issue" as ChangelogEntryReference["type"],
      },
    ],
  };
  if (!amendedEntry.type) {
    for (const label of issue.data.labels) {
      if (typeof label === "string" || !label.name) {
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

const removePrCommitsFromEntries = async (opts: {
  commitShaLookup: IndexLookup;
  entriesWithPrs: Array<ChangelogEntry | null>;
  githubRepository: GithubRepository;
  octokit: Octokit;
  prNumber: number;
}): Promise<void> => {
  const {
    commitShaLookup,
    entriesWithPrs,
    githubRepository,
    octokit,
    prNumber,
  } = opts;
  const prCommitsGenerator = getPaginatedPullRequestCommits({
    octokit,
    pullRequestNumber: prNumber,
    repository: githubRepository,
  });
  for await (const prCommits of prCommitsGenerator) {
    for (const prCommit of prCommits) {
      const prCommitIndex = commitShaLookup[prCommit.sha];
      if (prCommitIndex !== undefined) {
        entriesWithPrs[prCommitIndex] = null;
      }
    }
  }
};

const applyPullRequestToEntries = async (opts: {
  commitShaLookup: IndexLookup;
  entriesWithPrs: Array<ChangelogEntry | null>;
  githubRepository: GithubRepository;
  octokit: Octokit;
  pr: PullRequest;
}): Promise<void> => {
  const { commitShaLookup, entriesWithPrs, githubRepository, octokit, pr } =
    opts;
  if (!(pr.merged_at && pr.merge_commit_sha)) {
    return;
  }

  const commitIndex = commitShaLookup[pr.merge_commit_sha];
  if (commitIndex === undefined) {
    return;
  }

  let type = "";
  for (const label of pr.labels) {
    if (TYPE_LABELS[label.name]) {
      type = TYPE_LABELS[label.name];
    }
  }

  const props: string[] = [];
  if (pr.user?.login && pr.user.login !== githubRepository.owner) {
    props.push(pr.user.login);
  }

  entriesWithPrs[commitIndex] = {
    props,
    references: [
      {
        id: `${pr.number}`,
        type: "pull" as ChangelogEntryReference["type"],
      },
    ],
    summary: pr.title,
    type,
  };

  const matches = pr.body?.match(FIX_ISSUE_REGEX);
  if (matches?.groups?.["issue"]) {
    const issueNumber = Number.parseInt(matches.groups["issue"], 10);
    entriesWithPrs[commitIndex] = await amendEntryWithIssue({
      entry: entriesWithPrs[commitIndex],
      githubRepository,
      issueNumber,
      octokit,
    });
  }

  await removePrCommitsFromEntries({
    commitShaLookup,
    entriesWithPrs,
    githubRepository,
    octokit,
    prNumber: pr.number,
  });
};

const amendCommitEntriesWithPullRequests = async (opts: {
  commitEntries: ChangelogEntry[];
  githubRepository: GithubRepository;
  octokit: Octokit;
}) => {
  const { commitEntries, githubRepository, octokit } = opts;
  const commitShaLookup: IndexLookup = commitEntries.reduce(
    (lookup: IndexLookup, entry, index) => {
      if (entry.references[0].type !== "commit") {
        // Sanity check.
        return lookup;
      }
      lookup[entry.references[0].id] = index;
      return lookup;
    },
    Object.create(null)
  );

  const entriesWithPrs: Array<ChangelogEntry | null> = [...commitEntries];

  const prsGenerator = getPaginatedPullRequests({
    constraints: {
      base: "main",
      state: "closed",
    },
    octokit,
    repository: githubRepository,
  });
  for await (const prs of prsGenerator) {
    for (const pr of prs) {
      // biome-ignore lint/performance/noAwaitInLoops: each pull request mutates the shared changelog entries
      await applyPullRequestToEntries({
        commitShaLookup,
        entriesWithPrs,
        githubRepository,
        octokit,
        pr,
      });
    }

    // TODO: Stop the generator only if the last PR is older than the oldest commit.
    await prsGenerator.return();
  }

  const amendedEntries: ChangelogEntry[] = entriesWithPrs.filter(
    (entry) => entry !== null
  );
  return amendedEntries;
};

const amendEntriesWithIssues = async (opts: {
  entries: ChangelogEntry[];
  githubRepository: GithubRepository;
  octokit: Octokit;
}) => {
  const { entries, githubRepository, octokit } = opts;
  return await Promise.all(
    entries.map(async (entry) => {
      const matches = entry.summary.match(ISSUE_WITH_PARENS_REGEX);
      if (matches?.groups?.["issue"]) {
        const issueNumber = Number.parseInt(matches.groups["issue"], 10);
        return await amendEntryWithIssue({
          entry: {
            ...entry,
            summary: entry.summary.replace(matches[0], ""),
          },
          githubRepository,
          issueNumber,
          octokit,
        });
      }
      const matches2 = entry.summary.match(ISSUE_REGEX);
      if (matches2?.groups?.["issue"]) {
        const issueNumber = Number.parseInt(matches2.groups["issue"], 10);
        return await amendEntryWithIssue({
          entry,
          githubRepository,
          issueNumber,
          octokit,
        });
      }
      return entry;
    })
  );
};

const stripEntriesToSkip = (entries: ChangelogEntry[]) =>
  entries.filter((entry) => {
    if (FILE_ENTRY_REGEX.test(entry.summary)) {
      return false;
    }
    if (ACTIONS_ENTRY_REGEX.test(entry.summary)) {
      return false;
    }
    if (DEPENDENCY_ENTRY_REGEX.test(entry.summary)) {
      return false;
    }
    if (MERGE_ENTRY_REGEX.test(entry.summary)) {
      return false;
    }
    if (VERSION_ENTRY_REGEX.test(entry.summary)) {
      return false;
    }
    return true;
  });

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
      type: "enhancement",
    };
  });

const getMarkdownChangelog = (opts: {
  changelogEntries: ChangelogEntry[];
  githubRepository: GithubRepository;
}) => {
  const { changelogEntries, githubRepository } = opts;
  const groupedEntries = changelogEntries.reduce<
    Record<string, ChangelogEntry[]>
  >((grouped, entry) => {
    if (!grouped[entry.type]) {
      grouped[entry.type] = [];
    }
    grouped[entry.type].push(entry);
    return grouped;
  }, {});

  const { owner, repo } = githubRepository;

  const getReferenceMarkdownLink = (reference: ChangelogEntryReference) => {
    switch (reference.type) {
      case "commit":
        return `[${reference.id.slice(
          0,
          7
        )}](https://github.com/${owner}/${repo}/commit/${reference.id})`;
      case "pull":
        return `[#${reference.id}](https://github.com/${owner}/${repo}/pull/${reference.id})`;
      case "issue":
        return `[#${reference.id}](https://github.com/${owner}/${repo}/issues/${reference.id})`;
      default:
        return "";
    }
  };

  const usernameLink = (username: string) =>
    `[${username}](https://github.com/${username})`;

  let changelog = "";
  for (const heading of TYPE_HEADINGS) {
    if (!groupedEntries[heading.type]) {
      continue;
    }

    changelog += `**${heading.heading}:**\n\n`;

    for (const entry of groupedEntries[heading.type]) {
      changelog += `* ${
        entry.summary.endsWith(".") ? entry.summary : `${entry.summary}.`
      }`;
      if (entry.props.length) {
        changelog += ` Props ${entry.props.map(usernameLink).join(", ")}.`;
      }
      if (entry.references.length) {
        changelog += ` (${entry.references
          .map(getReferenceMarkdownLink)
          .join(", ")})`;
      }
      changelog += "\n";
    }

    changelog += "\n";
  }

  return changelog;
};
