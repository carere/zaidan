import { EnvelopeBase } from "@carere/kojo-runtime/contexts/workflow/models/Envelope";
import { Schema } from "effect";

export class FactoryError extends Schema.TaggedError<FactoryError>()("FactoryError", {
  message: Schema.String,
}) {}

export const failure = (cause: unknown): FactoryError =>
  cause instanceof FactoryError ? cause : new FactoryError({ message: String(cause) });

export class Implementation extends EnvelopeBase.extend<Implementation>("Implementation")({
  _tag: Schema.tag("Implementation"),
  summary: Schema.String,
  reviewPassed: Schema.Boolean,
  reviewFindings: Schema.Array(Schema.String),
}) {}

export class Review extends EnvelopeBase.extend<Review>("Review")({
  _tag: Schema.tag("Review"),
  passed: Schema.Boolean,
  findings: Schema.Array(Schema.String),
  summary: Schema.String,
}) {}

export class UiReport extends EnvelopeBase.extend<UiReport>("UiReport")({
  _tag: Schema.tag("UiReport"),
  passed: Schema.Boolean,
  scenarios: Schema.Array(Schema.String),
  evidence: Schema.Array(Schema.String),
  findings: Schema.Array(Schema.String),
  summary: Schema.String,
}) {}

export const IssueRef = Schema.Struct({
  number: Schema.Number,
  url: Schema.String,
  state: Schema.String,
});
export const Issue = Schema.Struct({
  ...IssueRef.fields,
  title: Schema.String,
  body: Schema.String,
  labels: Schema.Array(Schema.String),
  blockers: Schema.Array(IssueRef),
  children: Schema.Array(IssueRef),
});
export type Issue = typeof Issue.Type;

export const Job = Schema.Struct({
  issue: Issue,
  key: Schema.String,
  branch: Schema.String,
  base: Schema.String,
  feedback: Schema.String,
});
export type Job = typeof Job.Type;
export const JobResult = Schema.Struct({
  job: Job,
  passed: Schema.Boolean,
  sha: Schema.String,
  summary: Schema.String,
  findings: Schema.Array(Schema.String),
});
export type JobResult = typeof JobResult.Type;
