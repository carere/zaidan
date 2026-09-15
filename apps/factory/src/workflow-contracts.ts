import type { ResourceSnapshotReference } from "./captured-resources.ts";
import type { ExternalDeliveryEvidence } from "./external-delivery.ts";
import type { IntegrationInput } from "./graph-integration.ts";
import type { PublicationState } from "./standalone-publication.ts";
import type { TriageContext, TriageProposal, TriageReceipt } from "./triage.ts";
/** Transport snapshots use stable provider identity, never issue number as a key. */
export interface IssueSnapshot {
  graphId?: string;
  issueId: string;
  revision: string;
  repository: string;
  number: number;
  startingRevision: string;
  reviewBase: string;
  labels?: string[];
  parentIds?: string[];
  dependencyIds?: string[];
  briefRef?: string;
  sourceRef?: string;
  externalDeliveries?: ExternalDeliveryEvidence[];
  route?: "triage" | "implementation";
  triageContext?: TriageContext;
  sourceContent?: {
    body: string;
    brief?: string;
    specifications?: { issueId: string; body: string; brief?: string }[];
  };
}
export interface Question {
  prompt: string;
  options?: { id: string; label: string; description?: string }[];
  allowFreeform?: boolean;
}
export interface Answer {
  optionId?: string;
  text?: string;
}
export interface SessionReference {
  id: string;
  path: string;
}
export interface Candidate {
  commit: string;
  [evidence: string]: unknown;
}
export type WorkerOutcome = (
  | { type: "triage-proposed"; proposal: TriageProposal }
  | { type: "checkpoint"; question: Question }
  | { type: "completed"; candidate: Candidate }
  | { type: "no-change"; reason: string }
  | { type: "failed"; reason: string; category?: "transient" | "validation" | "semantic" }
  | { type: "subscription-paused"; reason: string }
  | { type: "reauthentication-required"; reason: string }
  | { type: "cancelled"; reason: string }
) & { finishedAt?: number };
export interface WorkerRequest {
  integration?: IntegrationInput;
  operationId: string;
  runId: string;
  issue: IssueSnapshot;
  session: SessionReference;
  phase: number;
  answer?: Answer;
  checkpoint?: Checkpoint;
  resources?: ResourceSnapshotReference;
  permits?: { url: string; token: string };
}
/** Operations must be idempotent by operationId, including retries after lost responses. */
export interface WorkerAdapter {
  dispatch(request: WorkerRequest): Promise<WorkerOutcome>;
  resume(request: WorkerRequest): Promise<WorkerOutcome>;
  reconcile(operationId: string): Promise<WorkerOutcome | undefined>;
  cancel?(operationId: string, reason?: string): Promise<WorkerOutcome>;
}
export interface NotificationRequest {
  operationId: string;
  runId: string;
  issue: IssueSnapshot;
  checkpoint: Checkpoint;
}
export interface NotificationAdapter {
  send(request: NotificationRequest): Promise<string>;
  reconcile(operationId: string): Promise<string | undefined>;
}
export interface WorkflowEngine {
  start(input: { runId: string }): Promise<string>;
  find(runId: string): Promise<string | undefined>;
  wake(token: string, payload: unknown): Promise<void>;
}
export interface Clock {
  now(): number;
}
export interface Checkpoint {
  id: string;
  phase: number;
  question: Question;
  answer?: Answer;
  answerId?: string;
}
export interface RunSnapshot {
  integration?: IntegrationInput;
  graphPending?: boolean;
  runId: string;
  issue: IssueSnapshot;
  session: SessionReference;
  resources?: ResourceSnapshotReference;
  status:
    | "admitted"
    | "running"
    | "waiting-human"
    | "waiting-subscription"
    | "waiting-authentication"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  phase: number;
  execution?: {
    operationId?: string;
    startedAt?: number;
    consumedMs: number;
    attempt: number;
    retries: number;
    token?: string;
    models: string[];
    stop?: { status: "failed" | "cancelled" | "paused"; reason: string };
  };
  pausedFrom?: "admitted" | "waiting-human" | "waiting-subscription" | "waiting-authentication";
  eveRunId?: string;
  checkpoint?: Checkpoint;
  candidate?: Candidate;
  publication?: PublicationState;
  noChange?: { reason: string };
  triage?: { proposal: TriageProposal; checkpointId: string; receipt?: TriageReceipt };
  reason?: string;
}
export interface AnswerInput {
  runId: string;
  issueId: string;
  revision: string;
  checkpointId: string;
  answerId: string;
  answer: Answer;
}
