# @felixarntz/record

The classic `isRecord()` helper, and a prototype-pollution safe `createRecord()` function.

## Setup

```bash
npm i @felixarntz/record
```

## Features

- **`isRecord()`:** Checks whether an unknown value is a non-null object and not an array, optionally with a specific value type.
- **`createRecord()`:** Creates a record with a `null` prototype, optionally with a specific value type. An optional initial object is copied onto it.
