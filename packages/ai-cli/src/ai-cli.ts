#!/usr/bin/env node

import { program } from "@commander-js/extra-typings";
import { withErrorHandling, withOptions } from "@felixarntz/cli-utils";
import dotenv from "dotenv";
import {
  description as cropImageDescription,
  handler as cropImageHandler,
  name as cropImageName,
  options as cropImageOptions,
} from "./commands/crop-image";
import {
  description as editImageDescription,
  handler as editImageHandler,
  name as editImageName,
  options as editImageOptions,
} from "./commands/edit-image";
import {
  description as explainCodeDescription,
  handler as explainCodeHandler,
  name as explainCodeName,
  options as explainCodeOptions,
} from "./commands/explain-code";
import {
  description as generateImageDescription,
  handler as generateImageHandler,
  name as generateImageName,
  options as generateImageOptions,
} from "./commands/generate-image";
import {
  description as generateTextDescription,
  handler as generateTextHandler,
  name as generateTextName,
  options as generateTextOptions,
} from "./commands/generate-text";
import {
  description as optimizeImageDescription,
  handler as optimizeImageHandler,
  name as optimizeImageName,
  options as optimizeImageOptions,
} from "./commands/optimize-image";
import {
  description as upscaleImageDescription,
  handler as upscaleImageHandler,
  name as upscaleImageName,
  options as upscaleImageOptions,
} from "./commands/upscale-image";

/**
 * Initializes the application.
 */
function initialize() {
  dotenv.config();

  withOptions(program.command(generateTextName), generateTextOptions)
    .alias("textgen")
    .description(generateTextDescription)
    .action(withErrorHandling(generateTextHandler));

  withOptions(program.command(generateImageName), generateImageOptions)
    .alias("imagegen")
    .description(generateImageDescription)
    .action(withErrorHandling(generateImageHandler));

  withOptions(program.command(editImageName), editImageOptions)
    .alias("imageedit")
    .description(editImageDescription)
    .action(withErrorHandling(editImageHandler));

  withOptions(program.command(cropImageName), cropImageOptions)
    .alias("imagecrop")
    .description(cropImageDescription)
    .action(withErrorHandling(cropImageHandler));

  withOptions(program.command(optimizeImageName), optimizeImageOptions)
    .alias("imageopt")
    .description(optimizeImageDescription)
    .action(withErrorHandling(optimizeImageHandler));

  withOptions(program.command(upscaleImageName), upscaleImageOptions)
    .alias("imageupscale")
    .description(upscaleImageDescription)
    .action(withErrorHandling(upscaleImageHandler));

  withOptions(program.command(explainCodeName), explainCodeOptions)
    .alias("codeexp")
    .description(explainCodeDescription)
    .action(withErrorHandling(explainCodeHandler));
}

/**
 * Runs the application.
 */
function run() {
  program.parse();
}

initialize();
run();
