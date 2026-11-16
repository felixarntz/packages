import type { AsyncCallbackFn, AsyncHelper } from "./types";

export function compose(helpers: readonly AsyncHelper[]): AsyncHelper {
  if (helpers.length === 0) {
    throw new TypeError("compose requires at least one helper.");
  }

  return (options) =>
    nest({
      abortSignal: options.abortSignal,
      fn: options.fn,
      helpers,
      index: 0,
    });
}

function nest<T>(options: {
  abortSignal?: AbortSignal;
  fn: AsyncCallbackFn<T>;
  helpers: readonly AsyncHelper[];
  index: number;
}): Promise<T> {
  const helper = options.helpers[options.index];

  if (!helper) {
    const abortSignal = options.abortSignal ?? new AbortController().signal;
    return options.fn({ abortSignal });
  }

  return helper({
    abortSignal: options.abortSignal,
    fn: ({ abortSignal }) =>
      nest({
        abortSignal,
        fn: options.fn,
        helpers: options.helpers,
        index: options.index + 1,
      }),
  });
}
