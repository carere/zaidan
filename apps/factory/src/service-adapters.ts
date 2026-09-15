import type { DiscoveryAdapter } from "./discovery.ts";
import type { NotificationAdapter, WorkerAdapter } from "./workflow-contracts.ts";

export interface ServiceAdapters {
  worker: WorkerAdapter;
  notifications: NotificationAdapter;
  discovery?: DiscoveryAdapter;
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
