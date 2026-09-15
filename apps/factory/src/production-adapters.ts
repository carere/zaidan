import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { isAbsolute, join } from "node:path";
import { DockerPiWorker } from "./docker-worker.ts";
import { createExternalDelivery } from "./external-delivery.ts";
import { FixtureFaults } from "./fixture-faults.ts";
import { createGitHubDeliverySource } from "./github-delivery.ts";
import { createGitHubDiscovery } from "./github-discovery.ts";
import { createGitHubPublication } from "./github-publication.ts";
import { createGitHubTriage } from "./github-triage.ts";
import { createGraphDeliverySource } from "./graph-delivery.ts";
import { SqliteGraphStore } from "./graph-integration.ts";
import type { IssueWorkflow } from "./issue-workflow.ts";
import {
  type ProductionConfig,
  runtimeSourceIdentity,
  sourceIdentity,
} from "./production-config.ts";
import { createProductionResources } from "./production-resources.ts";
import { ProductionWork } from "./production-work.ts";
import { RolloutPolicy } from "./rollout.ts";
import type { ServiceAdapters } from "./service-adapters.ts";
import { TelegramControl } from "./telegram.ts";
import type { TelegramOperations } from "./telegram-operations.ts";
import type { IssueSnapshot } from "./workflow-contracts.ts";

/** The native production construction path used by the foreground service and live fixture. */
export async function createProductionAdapters(options: {
  stateDirectory: string;
  repository: string;
  factoryRoot: string;
  runtime: ProductionConfig;
  env: NodeJS.ProcessEnv;
}): Promise<ServiceAdapters> {
  const { stateDirectory, repository, runtime, env } = options;
  const faults = new FixtureFaults({
    path: join(stateDirectory, "fixture-faults.json"),
    repository,
    mode: runtime.mode,
    points: runtime.faults,
  });
  let image: string;
  try {
    image = execFileSync("docker", ["image", "inspect", "--format", "{{.Id}}", runtime.image], {
      encoding: "utf8",
      timeout: 15000,
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!/^sha256:[a-f0-9]{64}$/.test(image)) throw new Error("Invalid Docker image identity");
  } catch {
    throw new Error("Build and verify the selected pinned worker image before native operation");
  }
  const token = env.FACTORY_GITHUB_TOKEN;
  const telegramToken = env.FACTORY_TELEGRAM_TOKEN;
  const maintainerId = Number(env.FACTORY_TELEGRAM_MAINTAINER_ID);
  if (!token || !telegramToken || !Number.isSafeInteger(maintainerId) || maintainerId < 1)
    throw new Error(
      "Native factory operation requires configured coordinator GitHub and Telegram credentials",
    );
  const response = await fetch(`https://api.github.com/repos/${repository}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("Repository identity could not be verified");
  const native = (await response.json()) as {
    node_id?: string;
    full_name?: string;
    private?: boolean;
    default_branch?: string;
  };
  if (
    !native.node_id ||
    native.full_name !== repository ||
    native.default_branch !== "main" ||
    (runtime.mode === "fixture" &&
      (!native.private || repository !== "carere/zaidan-factory-fixture"))
  )
    throw new Error("Repository identity or default branch does not match configured authority");
  const configuration = () =>
    createHash("sha256")
      .update(
        JSON.stringify({
          ...runtime,
          image,
          evidence: undefined,
          repository,
          maintainerId,
          selectedSources: sourceIdentity(
            runtime.skills.filter((skill) => isAbsolute(skill.path)).map((skill) => skill.path),
          ),
        }),
      )
      .digest("hex");
  const binding = {
    repositoryId: native.node_id,
    configuration: configuration(),
    runtime: runtimeSourceIdentity(options.factoryRoot),
  };
  const rollout = new RolloutPolicy({
    mode: runtime.mode,
    repository,
    evidence: runtime.evidence,
    binding,
    currentBinding: () => ({ ...binding, configuration: configuration() }),
  });
  const resources = createProductionResources({
    trustedGitDirectory: join(stateDirectory, "trusted.git"),
    remote: `https://github.com/${repository}.git`,
    token,
    directory: join(stateDirectory, "resources"),
  });
  await resources.prepare([]);
  const git = {
    ...resources.git,
    publishBranch: (branch: string, commit: string, expected?: string) =>
      faults.effect("branch-publication", () =>
        resources.git.publishBranch(branch, commit, expected),
      ),
  };
  const discovery = createGitHubDiscovery({ repository, token });
  const nativeGithub = createGitHubPublication({ token });
  const github = {
    ...nativeGithub,
    closeIssue: (repo: string, number: number) =>
      faults.effect("issue-closure", () => nativeGithub.closeIssue(repo, number)),
    setDraft: (repo: string, id: string, draft: boolean) =>
      faults.effect("pr-readiness", async () => {
        if (!nativeGithub.setDraft) throw new Error("Missing native readiness adapter");
        await nativeGithub.setDraft(repo, id, draft);
      }),
  };
  const triage = createGitHubTriage({
    repository,
    token,
    database: join(stateDirectory, "triage.sqlite"),
    discovery,
  });
  const graphs = new SqliteGraphStore(join(stateDirectory, "graphs.sqlite"));
  const telegram = new TelegramControl({
    database: join(stateDirectory, "telegram.sqlite"),
    token: telegramToken,
    maintainerId,
    checkpointEffect: (point) => faults.hit(point),
  });
  const deliverySource = createGraphDeliverySource({
    source: createGitHubDeliverySource({ token }),
    graphs,
    github: nativeGithub,
    discovery: {
      read: () => discovery.read(),
      approvedBriefs: async () => [
        ...((await discovery.approvedBriefs?.()) ?? []),
        ...(await triage.approvedBriefs()),
      ],
    },
  });
  const delivery = createExternalDelivery({
    trustedGitDirectory: join(stateDirectory, "trusted.git"),
    github: {
      async read(issue) {
        const result = await deliverySource.read(issue);
        // Native merge commits (including squash) must exist in the trusted object store.
        await resources.prepare(
          result.pullRequests.flatMap((pr) =>
            pr.mergeCommit ? [{ ref: pr.mergeCommit, commit: pr.mergeCommit }] : [],
          ),
        );
        return result;
      },
    },
  });
  let operators: TelegramOperations | undefined;
  let workflow: IssueWorkflow | undefined;
  let work: ProductionWork | undefined;
  const notify = async (input: Parameters<TelegramOperations["notifyReviewable"]>[0]) => {
    if (!operators) throw new Error("Operator transport is not attached");
    return operators.notifyReviewable(input);
  };
  return {
    evidence: () => ({ tier: "native-production", image, faults: faults.receipts() }),
    rollout,
    discovery,
    triage,
    telegram,
    notifications: telegram,
    triageRecovery: triage,
    worker: new DockerPiWorker({
      directory: join(stateDirectory, "workers"),
      repositoryPath: join(stateDirectory, "trusted.git"),
      image,
      auth: { sourceFile: runtime.authFile, lockDirectory: join(stateDirectory, "auth-locks") },
    }),
    workflowOptions: {
      checkpointEffect: (point) => faults.hit(point),
      externalDelivery: delivery,
      captureResources: (issue: IssueSnapshot) =>
        resources.capture(issue, {
          entry: issue.route === "triage" ? "triage" : "implement",
          skills: runtime.skills,
          extraEntries: issue.graphId ? ["resolving-merge-conflicts"] : [],
          checks: runtime.checks,
        }),
      publication: {
        git,
        github,
        notify,
        async verifyPrerequisites(issue) {
          const snapshot = await discovery.read();
          for (const id of issue.dependencyIds ?? []) {
            const prerequisite = snapshot.issues.find((item) => item.issueId === id);
            if (!prerequisite) throw new Error("Unreadable standalone prerequisite");
            const result = await delivery.verify({
              issue: prerequisite,
              repository,
              snapshotRevision: snapshot.revision,
              integration: {
                graphId: issue.issueId,
                graphRevision: issue.revision,
                reviewBase: issue.reviewBase,
                head: issue.startingRevision,
                integrations: [],
                containedCommits: [],
              },
            });
            if (result.status !== "verified")
              throw new Error(
                "Standalone prerequisite is not delivered into its starting revision",
              );
          }
        },
      },
      graph: {
        store: graphs,
        git,
        github,
        entry: "resolving-merge-conflicts",
        acceptance: {
          entry: "code-review",
          notify: async (input) => {
            if (!operators) throw new Error("Operator transport is not attached");
            const graph = graphs.read(input.graphId);
            if (!graph) throw new Error("Missing reviewable graph");
            return operators.notifyGraphReviewable({
              graphId: input.graphId,
              issueNumber: graph.number,
              repository: graph.repository,
              head: input.pullRequest.headCommit,
              pullRequestUrl: input.pullRequest.url,
            });
          },
        },
      },
    },
    operatorGraphs: () =>
      graphs.list().map((graph) => ({
        graphId: graph.graphId,
        repository: graph.repository,
        issueNumber: graph.number,
        head: graph.head,
        state: graph.state,
        integrated: Object.keys(graph.deliveries).length,
        total: (() => {
          try {
            return (
              workflow?.planGraph(graph.graphId, graph).leaves.length ?? graph.integrations.length
            );
          } catch {
            return new Set([
              ...graph.integrations.map((item) => item.issueId),
              ...(workflow
                ?.admissions()
                .filter((run) => run.issue.graphId === graph.graphId)
                .map((run) => run.issue.issueId) ?? []),
            ]).size;
          }
        })(),
        pullRequestUrl: graph.pullRequest?.url,
        reconciliation: graph.reconciliation,
      })),
    async attach(context) {
      operators = context.operators;
      workflow = context.workflow;
      work = new ProductionWork({
        workflow: context.workflow,
        git: resources.git,
        enabled: () => rollout.status().enabled && !context.workflow.factoryPaused(),
        attention: (input) => telegram.sendMessage(input),
      });
    },
    async onScan(result) {
      await work?.onScan(result);
    },
    async tick() {
      await work?.tick();
    },
    async close() {
      await work?.stop();
      triage.close();
      graphs.close();
      telegram.close();
    },
  };
}
