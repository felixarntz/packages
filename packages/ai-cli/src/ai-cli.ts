#!/usr/bin/env node

import { program } from '@commander-js/extra-typings';
import dotenv from 'dotenv';
import { withOptions, withErrorHandling } from './util/commander';
import {
  name as generateTextName,
  description as generateTextDescription,
  handler as generateTextHandler,
  options as generateTextOptions,
} from './commands/generate-text';
import {
  name as generateImageName,
  description as generateImageDescription,
  handler as generateImageHandler,
  options as generateImageOptions,
} from './commands/generate-image';

/**
 * Initializes the application.
 */
function initialize() {
  dotenv.config();

  withOptions(program.command(generateTextName), generateTextOptions)
    .alias('textgen')
    .description(generateTextDescription)
    .action(withErrorHandling(generateTextHandler));

  withOptions(program.command(generateImageName), generateImageOptions)
    .alias('imagegen')
    .description(generateImageDescription)
    .action(withErrorHandling(generateImageHandler));
}

/**
 * Runs the application.
 */
function run() {
  program.parse();
}

initialize();
run();
