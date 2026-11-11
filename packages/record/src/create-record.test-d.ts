import { createRecord } from "./create-record";

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;

type Assert<T extends true> = T;

const empty = createRecord();
const passedUndefined = createRecord(undefined);
const numbers = createRecord({ first: 1, second: 2 });
const mixed = createRecord({ count: 1, label: "value" });
const dates = createRecord<Date>();

export type CreateRecordCases = [
  Assert<Equal<typeof empty, Record<string, unknown>>>,
  Assert<Equal<typeof passedUndefined, Record<string, unknown>>>,
  Assert<Equal<typeof numbers, Record<string, number>>>,
  Assert<Equal<typeof mixed, Record<string, string | number>>>,
  Assert<Equal<typeof dates, Record<string, Date>>>,
];
