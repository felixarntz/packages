export type JsonValue =
  | null
  | string
  | number
  | boolean
  | Readonly<JsonObject>
  | readonly JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type JsonArray = JsonValue[];
