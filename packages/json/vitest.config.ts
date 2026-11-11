import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      enabled: true,
      include: ["src/**/*"],
      provider: "v8",
      reporter: [
        ["text", { file: "full-text-summary.txt" }],
        "html",
        "json",
        "lcov",
        "cobertura",
        ["json-summary", { outputFile: "coverage-summary.json" }],
      ],
      reportsDirectory: "./coverage",
    },
    outputFile: {
      junit: "junit.xml",
    },
    reporters: ["default", "junit"],
    silent: true,
  },
});
