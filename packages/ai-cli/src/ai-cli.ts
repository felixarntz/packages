#!/usr/bin/env node

import { program } from '@commander-js/extra-typings';
import { withOptions, withErrorHandling } from '@felixarntz/cli-utils';
import dotenv from 'dotenv';
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
import {
  name as editImageName,
  description as editImageDescription,
  handler as editImageHandler,
  options as editImageOptions,
} from './commands/edit-image';
import {
  name as cropImageName,
  description as cropImageDescription,
  handler as cropImageHandler,
  options as cropImageOptions,
} from './commands/crop-image';
import {
  name as optimizeImageName,
  description as optimizeImageDescription,
  handler as optimizeImageHandler,
  options as optimizeImageOptions,
} from './commands/optimize-image';
import {
  name as upscaleImageName,
  description as upscaleImageDescription,
  handler as upscaleImageHandler,
  options as upscaleImageOptions,
} from './commands/upscale-image';

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

  withOptions(program.command(editImageName), editImageOptions)
    .alias('imageedit')
    .description(editImageDescription)
    .action(withErrorHandling(editImageHandler));

  withOptions(program.command(cropImageName), cropImageOptions)
    .alias('imagecrop')
    .description(cropImageDescription)
    .action(withErrorHandling(cropImageHandler));

  withOptions(program.command(optimizeImageName), optimizeImageOptions)
    .alias('imageopt')
    .description(optimizeImageDescription)
    .action(withErrorHandling(optimizeImageHandler));

  withOptions(program.command(upscaleImageName), upscaleImageOptions)
    .alias('imageupscale')
    .description(upscaleImageDescription)
    .action(withErrorHandling(upscaleImageHandler));
}

/**
 * Runs the application.
 */
function run() {
  program.parse();
}

initialize();
run();
