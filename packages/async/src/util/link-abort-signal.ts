export function linkAbortSignal(options: {
  abortSignal?: AbortSignal;
}): AbortController {
  const controller = new AbortController();
  const { abortSignal } = options;

  if (!abortSignal) {
    return controller;
  }

  if (abortSignal.aborted) {
    controller.abort(abortSignal.reason);
    return controller;
  }

  abortSignal.addEventListener(
    "abort",
    () => {
      controller.abort(abortSignal.reason);
    },
    { once: true }
  );

  return controller;
}
