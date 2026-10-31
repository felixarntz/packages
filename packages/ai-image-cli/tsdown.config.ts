import { defineConfig, mergeConfig } from "tsdown";
import { cliBaseConfig } from "../../tsdown.base.ts";

export default defineConfig(
  mergeConfig(cliBaseConfig, {
    entry: ["src/ai-image-cli.ts"],
    outDir: "dist",
  })
);
