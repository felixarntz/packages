# @felixarntz/json

Types and helpers for values that can be directly represented as JSON.

## Setup

```bash
npm i @felixarntz/json
```

## Features

- **`JsonValue`:** A JSON value: `null`, `string`, `number`, `boolean`, a `JsonObject`, or a `JsonArray`.
- **`isJsonValue()`:** Checks whether an unknown value is a `JsonValue`.
- **`cloneJsonValue()`:** Deep-copies a `JsonValue`, including object fields whose value is `undefined`.
