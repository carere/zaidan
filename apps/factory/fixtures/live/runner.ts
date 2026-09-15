import type { FixtureGitHub, NativeIssue, NativePull } from "./github.ts";
import { digest, type FixtureJournal } from "./journal.ts";
import { externalFiles, repository } from "./scenario.ts";
import type { SetupState } from "./setup.ts";

export interface Progress {
  service: {
    mode: string;
    instanceId?: string;
    ready: boolean;
    rollout?: {
      enabled: boolean;
      binding?: { runtime: string; configuration: string; repositoryId: string };
    };
  };
  evidence?: { tier: string; image: string; faults?: { point: string; at: string }[] };
  runs: {
    runId: string;
    issueId: string;
    issueNumber: number;
    issueRevision: string;
    route?: string;
    graphId?: string;
    status: string;
    phase: number;
    sessionId: string;
    snapshotId?: string;
    startingRevision: string;
    eveRunId?: string;
    eveContinuationId?: string;
    checkpoint?: { id: string; answered: boolean };
    execution?: {
      active: boolean;
      attempt: number;
      consumedMs: number;
      modelCalls: number;
      retries: number;
    };
    candidate?: string;
    candidateEvidence?: {
      tree?: string;
      checks: { exitCode: number | string; commit: string }[];
      reviews: { axis: string; passed: boolean; delegateSession?: string; commit: string }[];
    };
    publication?: { state: string; pullRequest?: string };
  }[];
  graphs: {
    graphId: string;
    head: string;
    revision: string;
    state: string;
    pullRequest?: string;
    acceptance?: { id: string; state: string; head: string; tree: string };
    integrations?: {
      issueId: string;
      runId: string;
      expectedHead: string;
      commit: string;
      tree: string;
      published: boolean;
      closedRevision?: string;
    }[];
  }[];
}
interface Observation {
  at: string;
  progress: Progress;
}
interface MergeWait {
  kind: string;
  url: string;
  nodeId: string;
  number: number;
  head: string;
  base: string;
  mergeCommit?: string;
  deliveredAt?: string;
  parentCount?: number;
  candidateContained?: boolean;
  closuresObserved?: boolean;
}
export const stages = [
  "awaiting-maintainer-normal-merge",
  "awaiting-maintainer-squash-merge",
  "awaiting-maintainer-graph-merge",
] as const;

/** Deliberately picks known scalar receipt fields; no question/reply, source content, credentials or error payloads. */
export function recordProgress(journal: FixtureJournal, input: Progress) {
  if (
    input.service?.mode !== "fixture" ||
    !Array.isArray(input.runs) ||
    !Array.isArray(input.graphs)
  )
    throw Error("Live fixture requires native fixture-mode progress");
  const progress: Progress = {
    service: {
      mode: input.service.mode,
      instanceId: input.service.instanceId,
      ready: input.service.ready,
      rollout: input.service.rollout
        ? {
            enabled: input.service.rollout.enabled,
            binding: input.service.rollout.binding
              ? {
                  runtime: input.service.rollout.binding.runtime,
                  configuration: input.service.rollout.binding.configuration,
                  repositoryId: input.service.rollout.binding.repositoryId,
                }
              : undefined,
          }
        : undefined,
    },
    evidence: input.evidence
      ? {
          tier: input.evidence.tier,
          image: input.evidence.image,
          faults: input.evidence.faults?.map((item) => ({ point: item.point, at: item.at })),
        }
      : undefined,
    runs: input.runs.map((run) => ({
      runId: run.runId,
      issueId: run.issueId,
      issueNumber: run.issueNumber,
      issueRevision: run.issueRevision,
      route: run.route,
      graphId: run.graphId,
      status: run.status,
      phase: run.phase,
      sessionId: run.sessionId,
      snapshotId: run.snapshotId,
      startingRevision: run.startingRevision,
      eveRunId: run.eveRunId,
      eveContinuationId: run.eveContinuationId,
      checkpoint: run.checkpoint
        ? { id: run.checkpoint.id, answered: run.checkpoint.answered }
        : undefined,
      execution: run.execution
        ? {
            active: run.execution.active,
            attempt: run.execution.attempt,
            consumedMs: run.execution.consumedMs,
            modelCalls: run.execution.modelCalls,
            retries: run.execution.retries,
          }
        : undefined,
      candidate: run.candidate,
      candidateEvidence: run.candidateEvidence
        ? {
            tree: run.candidateEvidence.tree,
            checks: run.candidateEvidence.checks.map((check) => ({
              exitCode: check.exitCode,
              commit: check.commit,
            })),
            reviews: run.candidateEvidence.reviews.map((review) => ({
              axis: review.axis,
              passed: review.passed,
              delegateSession: review.delegateSession,
              commit: review.commit,
            })),
          }
        : undefined,
      publication: run.publication
        ? { state: run.publication.state, pullRequest: run.publication.pullRequest }
        : undefined,
    })),
    graphs: input.graphs.map((graph) => ({
      graphId: graph.graphId,
      head: graph.head,
      revision: graph.revision,
      state: graph.state,
      pullRequest: graph.pullRequest,
      acceptance: graph.acceptance
        ? {
            id: graph.acceptance.id,
            state: graph.acceptance.state,
            head: graph.acceptance.head,
            tree: graph.acceptance.tree,
          }
        : undefined,
      integrations: graph.integrations?.map((item) => ({
        issueId: item.issueId,
        runId: item.runId,
        expectedHead: item.expectedHead,
        commit: item.commit,
        tree: item.tree,
        published: item.published,
        closedRevision: item.closedRevision,
      })),
    })),
  };
  const observations = journal.read<Observation[]>("observations.json") ?? [];
  if (observations.length && digest(observations.at(-1)?.progress) === digest(progress))
    return progress;
  observations.push({ at: new Date().toISOString(), progress });
  journal.save("observations.json", observations);
  return progress;
}
export async function advanceFixture(
  journal: FixtureJournal,
  setup: SetupState,
  progress: Progress,
  github: FixtureGitHub,
) {
  if (!setup.activated) return { state: "awaiting-setup-activation" };
  if (
    !setup.repositoryId ||
    progress.service.rollout?.binding?.repositoryId !== setup.repositoryId ||
    progress.evidence?.tier !== "native-production"
  )
    throw Error("Native progress does not match this fixture repository");
  const previous = journal.read<Record<string, MergeWait>>("merge-waits.json") ?? {};
  const e1 = progress.runs.findLast(
    (run) => run.issueId === setup.issues.E1?.node_id && run.route === "implementation",
  );
  const graph = progress.graphs.find((item) => item.graphId === setup.issues.R?.node_id);
  const urls = [e1?.publication?.pullRequest, setup.externalPull?.html_url, graph?.pullRequest];
  for (const [index, kind] of stages.entries()) {
    const url = urls[index];
    if (!url)
      return {
        state:
          index === 0 ? "awaiting-real-triage-and-implementation" : "awaiting-graph-publication",
        telegram: "Answer only the actual private bot checkpoint; run again to observe progress.",
      };
    const match = new RegExp(`^https://github.com/${repository}/pull/([1-9][0-9]*)$`).exec(url);
    if (!match) throw Error("Fixture PR URL is outside repository authority");
    const pr = await github.request<NativePull>(`${github.path}/pulls/${match[1]}`);
    if (
      !pr ||
      pr.html_url !== url ||
      pr.base.ref !== "main" ||
      pr.base.repo.full_name !== repository ||
      pr.head.repo.full_name !== repository
    )
      throw Error("Fixture PR identity or destination changed");
    const old = previous[kind];
    if (old && (old.nodeId !== pr.node_id || old.head !== pr.head.sha || old.url !== pr.html_url))
      throw Error(
        "Previously recorded maintainer merge candidate changed; preserve evidence and reconcile",
      );
    if (!old)
      previous[kind] = {
        kind,
        url,
        nodeId: pr.node_id,
        number: pr.number,
        head: pr.head.sha,
        base: "main",
      };
    journal.save("merge-waits.json", previous);
    if (!pr.merged) {
      if (pr.state !== "open")
        throw Error("Unmerged closed fixture PR needs maintainer reconciliation");
      if (
        index === 2 &&
        (pr.draft ||
          graph?.acceptance?.state !== "reviewable" ||
          graph.acceptance.head !== pr.head.sha)
      )
        return { state: "awaiting-exact-graph-acceptance", url };
      return {
        state: kind,
        url,
        method: index === 0 ? "merge commit" : index === 1 ? "squash" : "maintainer choice",
        instruction:
          "Maintainer merges this concrete PR in GitHub, then reruns the fixture. The runner never calls a merge endpoint.",
      };
    }
    if (!pr.merge_commit_sha || !/^[a-f0-9]{40}$/.test(pr.merge_commit_sha))
      throw Error("Native merged PR is missing immutable merge evidence");
    const contains = async (base: string, head: string) => {
      const comparison = await github.request<{ status: string }>(
        `${github.path}/compare/${base}...${head}`,
      );
      if (!comparison || !["ahead", "behind", "identical", "diverged"].includes(comparison.status))
        throw Error("Native merge ancestry is unavailable");
      return ["ahead", "identical"].includes(comparison.status);
    };
    if (!(await contains(pr.merge_commit_sha, "main")))
      throw Error("Observed merge commit is not contained in current main");
    const commit = await github.request<{ parents: { sha: string }[] }>(
      `${github.path}/commits/${pr.merge_commit_sha}`,
    );
    if (!commit?.parents?.length) throw Error("Native merge parent evidence unavailable");
    const candidateContained = await contains(pr.head.sha, "main");
    if (index === 0 && (commit.parents.length < 2 || !candidateContained))
      throw Error("E1 did not demonstrate the required normal merge; do not claim normal delivery");
    if (index === 1 && (commit.parents.length !== 1 || candidateContained))
      throw Error(
        "E2 did not demonstrate distinct squash delivery; retain it and reconcile the missing scenario",
      );
    if (index === 1) {
      const file = await github.request<{ encoding: string; content: string }>(
        `${github.path}/contents/src/format.mjs?ref=${pr.merge_commit_sha}`,
      );
      if (
        file?.encoding !== "base64" ||
        Buffer.from(file.content, "base64").toString("utf8") !== externalFiles["src/format.mjs"]
      )
        throw Error("Squash delivery formatter differs from prepared fixture source");
    }
    if (
      index === 2 &&
      (!graph?.acceptance ||
        graph.acceptance.head !== pr.head.sha ||
        !["reviewable", "delivered"].includes(graph.acceptance.state))
    )
      throw Error("Merged graph does not match retained exact acceptance");
    previous[kind] = {
      ...previous[kind],
      mergeCommit: pr.merge_commit_sha,
      deliveredAt: previous[kind].deliveredAt ?? new Date().toISOString(),
      parentCount: commit.parents.length,
      candidateContained,
    };
    journal.save("merge-waits.json", previous);
    const issueKeys =
      index === 0 ? (["E1"] as const) : index === 1 ? (["E2"] as const) : (["R", "P"] as const);
    for (const key of issueKeys) {
      const expected = setup.issues[key];
      const issue =
        expected && (await github.request<NativeIssue>(`${github.path}/issues/${expected.number}`));
      if (!issue || issue.node_id !== expected?.node_id)
        throw Error("Native issue closure identity changed");
      if (issue.state !== "closed" || issue.state_reason !== "completed")
        return { state: "awaiting-production-delivery-observation", issue: key, url };
    }
    previous[kind].closuresObserved = true;
    journal.save("merge-waits.json", previous);
  }
  return {
    state: "delivery-observed-evidence-review-required",
    evidence:
      "Actual containment/provider/conflict/delegate/restart evidence still needs review; delivery alone cannot enable live Zaidan writes.",
  };
}
export function evidenceReport(journal: FixtureJournal, setup: SetupState) {
  const observations = journal.read<Observation[]>("observations.json") ?? [];
  const waits = journal.read<Record<string, MergeWait>>("merge-waits.json") ?? {};
  const last = observations.at(-1)?.progress;
  const restarts = new Set(
    observations.map((item) => item.progress.service.instanceId).filter(Boolean),
  ).size;
  let telegramResumed = false;
  for (const before of observations)
    for (const run of before.progress.runs.filter(
      (run) => run.route === "triage" && run.checkpoint && !run.checkpoint.answered,
    )) {
      telegramResumed ||= observations.some(
        (after) =>
          after.at >= before.at &&
          after.progress.service.instanceId !== before.progress.service.instanceId &&
          after.progress.runs.some(
            (current) =>
              current.runId === run.runId &&
              current.sessionId === run.sessionId &&
              current.snapshotId === run.snapshotId &&
              current.checkpoint?.id === run.checkpoint?.id &&
              current.checkpoint?.answered,
          ),
      );
    }
  const mergeReceipts = stages.map((stage) => waits[stage]).filter(Boolean);
  return {
    version: 1,
    repository,
    repositoryId: setup.repositoryId,
    scenario: setup.scenario,
    sourceHash: setup.sourceHash,
    observationHash: digest(observations),
    mergeReceiptHash: digest(waits),
    nativeBinding: last?.service.rollout?.binding,
    nativeImage: last?.evidence?.image,
    observations: observations.length,
    coordinatorInstances: restarts,
    sameIdentityTelegramResumeObserved: telegramResumed,
    mergeReceipts,
    faultsObserved: last?.evidence?.faults ?? [],
    completed: false,
    gates: {
      "authenticated-contained-workers":
        "Review actual Docker inspections, pinned provider/model/reasoning and independent delegate receipts; image identity alone is insufficient.",
      "telegram-human-restart": telegramResumed
        ? "Identity continuity observed; confirm actual authorized private Telegram reply and native protocol receipt."
        : "Await unanswered checkpoint, service restart and actual private Telegram reply with same run/session/snapshot.",
      "concurrent-conflict-graph":
        "Review overlapping actual A/B executions at same head, actual Git conflict, serialized integrations, prerequisite-containing immediate D start and final acceptance/delegates.",
      "standalone-normal-delivery": waits[stages[0]]?.closuresObserved
        ? "Native normal merge and closure observed."
        : "Await E1 normal merge and native closure.",
      "external-squash-delivery": waits[stages[1]]?.closuresObserved
        ? "Native distinct squash ancestry and closure observed; verify formatter bytes."
        : "Await E2 squash merge and native closure.",
      "graph-maintainer-delivery": waits[stages[2]]?.closuresObserved
        ? "Native accepted graph merge observed; verify parent closures in final run result."
        : "Await exact acceptance, maintainer graph merge and parent closures.",
      "publication-restart":
        "Review consumed native post-effect fault and same publication identity across changed coordinator instance; configured fault alone is insufficient.",
      "zaidan-read-only-discovery":
        "Collect fresh actual Zaidan discovery with live gate disabled and bind promotion proof to intended target config/runtime/repository, separately from fixture identity.",
    },
  };
}
