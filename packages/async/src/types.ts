export type AsyncCallbackFn<T> = (options: {
  abortSignal: AbortSignal;
}) => Promise<T>;

interface AsyncHelperBaseOptions<T> {
  abortSignal?: AbortSignal;
  fn: AsyncCallbackFn<T>;
}

export type AsyncHelperOptions<
  T,
  Fields extends object | undefined = undefined,
> = Fields extends object
  ? AsyncHelperBaseOptions<T> & Fields
  : AsyncHelperBaseOptions<T>;

export type AsyncHelper = <T>(options: AsyncHelperOptions<T>) => Promise<T>;
