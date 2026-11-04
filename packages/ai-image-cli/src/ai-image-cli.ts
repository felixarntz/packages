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

  withOptions({ command: program.command(editName), options: editOptions })
    .description(editDescription)
    .action(withErrorHandling(editHandler));

  withOptions({ command: program.command(cropName), options: cropOptions })
    .description(cropDescription)
    .action(withErrorHandling(cropHandler));

  withOptions({
    command: program.command(optimizeName),
    options: optimizeOptions,
  })
    .description(optimizeDescription)
    .action(withErrorHandling(optimizeHandler));

  withOptions({
    command: program.command(upscaleName),
    options: upscaleOptions,
  })
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
