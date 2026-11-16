import { defineConfig, mergeConfig } from "tsdown";
import { sdkBaseConfig } from "../../tsdown.base.ts";

export default defineConfig(
  mergeConfig(sdkBaseConfig, {
    entry: ["src/index.ts"],
    outDir: "dist",
  })
);
