#!/usr/bin/env node

import { program } from "@commander-js/extra-typings";
import { withErrorHandling, withOptions } from "@felixarntz/cli-utils";
import dotenv from "dotenv";
import {
  description as cropDescription,
  handler as cropHandler,
  name as cropName,
  options as cropOptions,
} from "./commands/crop";
import {
  description as editDescription,
  handler as editHandler,
  name as editName,
  options as editOptions,
} from "./commands/edit";
import {
  description as optimizeDescription,
  handler as optimizeHandler,
  name as optimizeName,
  options as optimizeOptions,
} from "./commands/optimize";
import {
  description as upscaleDescription,
  handler as upscaleHandler,
  name as upscaleName,
  options as upscaleOptions,
} from "./commands/upscale";

/**
 * Initializes the application.
 */
function initialize() {
  dotenv.config();

  withOptions(program.command(editName), editOptions)
    .alias("imageedit")
    .description(editDescription)
    .action(withErrorHandling(editHandler));

  withOptions(program.command(cropName), cropOptions)
    .alias("imagecrop")
    .description(cropDescription)
    .action(withErrorHandling(cropHandler));

  withOptions(program.command(optimizeName), optimizeOptions)
    .alias("imageopt")
    .description(optimizeDescription)
    .action(withErrorHandling(optimizeHandler));

  withOptions(program.command(upscaleName), upscaleOptions)
    .alias("imageupscale")
    .description(upscaleDescription)
    .action(withErrorHandling(upscaleHandler));
}

/**
 * Runs the application.
 */
function run() {
  program.parse();
}

initialize();
run();
