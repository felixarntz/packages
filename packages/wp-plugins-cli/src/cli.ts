import { program } from "@commander-js/extra-typings";
import { withErrorHandling, withOptions } from "@felixarntz/cli-utils";
import dotenv from "dotenv";
import {
  description as bumpTestedWpDescription,
  handler as bumpTestedWpHandler,
  name as bumpTestedWpName,
  options as bumpTestedWpOptions,
} from "./commands/bump-tested-wp";
import {
  description as generateChangelogDescription,
  handler as generateChangelogHandler,
  name as generateChangelogName,
  options as generateChangelogOptions,
} from "./commands/generate-changelog";
import {
  description as getPluginsDescription,
  handler as getPluginsHandler,
  name as getPluginsName,
  options as getPluginsOptions,
} from "./commands/get-plugins";
import {
  description as updateSinceDescription,
  handler as updateSinceHandler,
  name as updateSinceName,
  options as updateSinceOptions,
} from "./commands/update-since";
import {
  description as verifyVersionsDescription,
  handler as verifyVersionsHandler,
  name as verifyVersionsName,
  options as verifyVersionsOptions,
} from "./commands/verify-versions";

/**
 * Initializes the application.
 */
function initialize() {
  dotenv.config();

  withOptions({
    command: program.command(bumpTestedWpName),
    options: bumpTestedWpOptions,
  })
    .alias("tested")
    .description(bumpTestedWpDescription)
    .action(withErrorHandling(bumpTestedWpHandler));

  withOptions({
    command: program.command(generateChangelogName),
    options: generateChangelogOptions,
  })
    .alias("changelog")
    .description(generateChangelogDescription)
    .action(withErrorHandling(generateChangelogHandler));

  withOptions({
    command: program.command(getPluginsName),
    options: getPluginsOptions,
  })
    .alias("plugins")
    .description(getPluginsDescription)
    .action(withErrorHandling(getPluginsHandler));

  withOptions({
    command: program.command(updateSinceName),
    options: updateSinceOptions,
  })
    .alias("since")
    .description(updateSinceDescription)
    .action(withErrorHandling(updateSinceHandler));

  withOptions({
    command: program.command(verifyVersionsName),
    options: verifyVersionsOptions,
  })
    .alias("versions")
    .description(verifyVersionsDescription)
    .action(withErrorHandling(verifyVersionsHandler));
}

/**
 * Runs the application.
 */
function run() {
  program.parse();
}

initialize();
run();
