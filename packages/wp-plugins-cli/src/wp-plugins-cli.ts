#!/usr/bin/env node

import { program } from '@commander-js/extra-typings';
import { withOptions, withErrorHandling } from '@felixarntz/cli-utils';
import dotenv from 'dotenv';
import {
  name as generateChangelogName,
  description as generateChangelogDescription,
  handler as generateChangelogHandler,
  options as generateChangelogOptions,
} from './commands/generate-changelog';

/**
 * Initializes the application.
 */
function initialize() {
  dotenv.config();

  withOptions(program.command(generateChangelogName), generateChangelogOptions)
    .alias('changelog')
    .description(generateChangelogDescription)
    .action(withErrorHandling(generateChangelogHandler));
}

/**
 * Runs the application.
 */
function run() {
  program.parse();
}

initialize();
run();
