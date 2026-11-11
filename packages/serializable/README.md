# @felixarntz/serializable

Types and helpers for values that can be encoded as JSON, encompassing a broader set of types than just scalars, plain objects, and plain arrays.

## Setup

```bash
npm i @felixarntz/serializable
```

## Features

- **`SerializableValue`:** A `JsonValue`, or `undefined`, `bigint`, `Date`, `RegExp`, `URL`, `URLSearchParams`, `ArrayBuffer`, `ArrayBufferView`, `Map`, or `Set`, including arrays and plain objects of those values.
- **`isSerializableValue()`:** Checks whether an unknown value is a `SerializableValue`.
- **`cloneSerializableValue()`:** Deep-copies a `SerializableValue`.
- **`jsonEncodeSerializableValue()`:** Turns a `SerializableValue` into a `JsonValue`, so that it can then be natively stored anywhere JSON can be stored.
- **`jsonDecodeSerializableValue()`:** Restores a `SerializableValue` from the `JsonValue` produced by `jsonEncodeSerializableValue()`.
