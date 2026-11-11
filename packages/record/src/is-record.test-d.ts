import { isRecord } from "./is-record";

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

type Assert<T extends true> = T;

declare const value: unknown;

function narrowedDefault(input: unknown) {
  return isRecord(input) ? input : undefined;
}

function narrowedString(input: unknown) {
  return isRecord<string>(input) ? input : undefined;
}

export type IsRecordCases = [
  Assert<Equal<typeof value, unknown>>,
  Assert<
    Equal<
      Exclude<ReturnType<typeof narrowedDefault>, undefined>,
      Record<string, unknown>
    >
  >,
  Assert<
    Equal<
      Exclude<ReturnType<typeof narrowedString>, undefined>,
      Record<string, string>
    >
  >,
];
