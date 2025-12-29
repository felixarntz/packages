#!/usr/bin/env node

import { program } from '@commander-js/extra-typings';
import { withOptions, withErrorHandling } from '@felixarntz/cli-utils';
import dotenv from 'dotenv';
import {
  name as bumpTestedWpName,
  description as bumpTestedWpDescription,
  handler as bumpTestedWpHandler,
  options as bumpTestedWpOptions,
} from './commands/bump-tested-wp';
import {
  name as generateChangelogName,
  description as generateChangelogDescription,
  handler as generateChangelogHandler,
  options as generateChangelogOptions,
} from './commands/generate-changelog';
import {
  name as getPluginsName,
  description as getPluginsDescription,
  handler as getPluginsHandler,
  options as getPluginsOptions,
} from './commands/get-plugins';
import {
  name as updateSinceName,
  description as updateSinceDescription,
  handler as updateSinceHandler,
  options as updateSinceOptions,
} from './commands/update-since';
import {
  name as verifyVersionsName,
  description as verifyVersionsDescription,
  handler as verifyVersionsHandler,
  options as verifyVersionsOptions,
} from './commands/verify-versions';

/**
 * Initializes the application.
 */
function initialize() {
  dotenv.config();

  withOptions(program.command(bumpTestedWpName), bumpTestedWpOptions)
    .alias('tested')
    .description(bumpTestedWpDescription)
    .action(withErrorHandling(bumpTestedWpHandler));

  withOptions(program.command(generateChangelogName), generateChangelogOptions)
    .alias('changelog')
    .description(generateChangelogDescription)
    .action(withErrorHandling(generateChangelogHandler));

  withOptions(program.command(getPluginsName), getPluginsOptions)
    .alias('plugins')
    .description(getPluginsDescription)
    .action(withErrorHandling(getPluginsHandler));

  withOptions(program.command(updateSinceName), updateSinceOptions)
    .alias('since')
    .description(updateSinceDescription)
    .action(withErrorHandling(updateSinceHandler));

  withOptions(program.command(verifyVersionsName), verifyVersionsOptions)
    .alias('versions')
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
