import type { DiscoveryAdapter, ScanResult } from "./discovery.ts";
import type { IssueWorkflow, IssueWorkflowOptions } from "./issue-workflow.ts";
import type { LocalService } from "./local-service.ts";
import type { RolloutPolicy } from "./rollout.ts";
import type { TelegramControl } from "./telegram.ts";
import type {
  OperatorGraphStatus,
  TelegramOperations,
  TelegramOperationsOptions,
} from "./telegram-operations.ts";
import type { TriageAdapter } from "./triage.ts";
import type { NotificationAdapter, WorkerAdapter } from "./workflow-contracts.ts";

export interface ServiceAdapters {
  workflowOptions?: Pick<
    IssueWorkflowOptions,
    "captureResources" | "publication" | "graph" | "externalDelivery"
  >;
  rollout?: RolloutPolicy;
  onScan?: (result: ScanResult) => Promise<void>;
  tick?: () => Promise<void>;
  worker: WorkerAdapter;
  notifications: NotificationAdapter;
  discovery?: DiscoveryAdapter;
  triage?: TriageAdapter;
  telegram?: TelegramControl;
  operatorGraphs?: () => OperatorGraphStatus[];
  triageRecovery?: TelegramOperationsOptions["triageRecovery"];
  /** Attach adapters to the one owned service before its initial reconciliation. */
  attach?: (context: {
    workflow: IssueWorkflow;
    service: LocalService;
    operators?: TelegramOperations;
  }) => Promise<void>;
  close?: () => Promise<void>;
}
export interface ServiceAdapterContext {
  stateDirectory: string;
  repository: string;
  mode: "read-only";
}
export type CreateServiceAdapters = (
  context: ServiceAdapterContext,
) => Promise<ServiceAdapters> | ServiceAdapters;

/** Discovery-only rollout must never invent absent external receipts. */
export function discoveryOnlyAdapters(): ServiceAdapters {
  const unavailable = async (): Promise<never> => {
    throw new Error(
      "Configure persistent worker and notification adapters before recovering existing work",
    );
  };
  return {
    worker: { dispatch: unavailable, resume: unavailable, reconcile: unavailable },
    notifications: { send: unavailable, reconcile: unavailable },
  };
}
