const baseConfig = {
  format: ["esm" as const],
  target: "es2022" as const,
  tsconfig: "tsconfig.build.json",
  clean: true,
  fixedExtension: false,
};

export const sdkBaseConfig = {
  ...baseConfig,
  dts: true,
  sourcemap: true,
};

export const cliBaseConfig = {
  ...baseConfig,
  dts: false,
  sourcemap: false,
  outputOptions: {
    codeSplitting: false,
  },
  banner: {
    js: "#!/usr/bin/env node",
  },
};
