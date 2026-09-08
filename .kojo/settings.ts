import { Schema } from "effect";

export const Settings = Schema.Struct({
  runKey: Schema.NonEmptyString,
  roots: Schema.Array(Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0))),
  concurrency: Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 8 })),
  attempts: Schema.Number.check(Schema.isInt(), Schema.isBetween({ minimum: 1, maximum: 5 })),
  baseBranch: Schema.NonEmptyString,
});
export type Settings = typeof Settings.Type;
