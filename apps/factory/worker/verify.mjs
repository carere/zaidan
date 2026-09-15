// Runs in a fresh, network-none, credential-free container. Never execute Git from
// an agent-writable repository on the coordinator host (config/filters can run code).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const request = JSON.parse(readFileSync("/input/request.json", "utf8"));
const outcome = JSON.parse(readFileSync("/phase/outcome.json", "utf8"));
const acceptance = request.acceptance;
if (acceptance ? outcome.type !== "graph-accepted" : outcome.type !== "completed")
  throw new Error("Outcome does not match captured phase");
const candidate = acceptance ? outcome.evidence : outcome.candidate;
const integration = request.integration;
const reviewBase = acceptance?.reviewBase ?? integration?.reviewBase ?? request.issue.reviewBase;
const manifest = JSON.parse(readFileSync("/resources/manifest.json", "utf8"));
const git = (...args) =>
  execFileSync("git", ["--no-optional-locks", ...args], {
    cwd: "/state/checkout",
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
if (
  !/^[a-f0-9]{40}$/.test(candidate.commit) ||
  git("status", "--porcelain") ||
  candidate.commit !== git("rev-parse", "HEAD") ||
  candidate.tree !== git("rev-parse", "HEAD^{tree}") ||
  (!acceptance && !git("diff", "--name-only", `${reviewBase}...HEAD`)) ||
  (acceptance && (candidate.commit !== acceptance.head || candidate.tree !== acceptance.tree))
)
  throw new Error("Candidate does not identify clean committed implementation");
const base = git("rev-parse", `${reviewBase}^{commit}`);
const expectedIntegration = integration
  ? {
      graphId: integration.graphId,
      graphRevision: integration.graphRevision,
      expectedHead: integration.expectedHead,
      candidateCommit: integration.candidate.commit,
    }
  : undefined;
if (integration) {
  if (integration.reviewBase !== integration.expectedHead)
    throw new Error("Integration review base differs from expected graph head");
  git("merge-base", "--is-ancestor", integration.expectedHead, candidate.commit);
  git("merge-base", "--is-ancestor", integration.candidate.commit, candidate.commit);
}
const expectedAcceptance = acceptance
  ? {
      id: acceptance.id,
      graphId: acceptance.graphId,
      graphRevision: acceptance.graphRevision,
      head: acceptance.head,
    }
  : undefined;
const matches = (item) =>
  item.commit === candidate.commit &&
  item.tree === candidate.tree &&
  item.snapshot === request.resources.id &&
  item.issueRevision === request.issue.revision &&
  item.reviewBase === base &&
  JSON.stringify(item.integration) === JSON.stringify(expectedIntegration) &&
  JSON.stringify(item.acceptance) === JSON.stringify(expectedAcceptance);
if (!matches(candidate)) throw new Error("Candidate identity is stale");
if (
  !Array.isArray(candidate.checks) ||
  candidate.checks.length !== manifest.checks.length ||
  candidate.checks.some(
    (check, index) =>
      check.command !== manifest.checks[index] || check.exitCode !== 0 || !matches(check),
  )
)
  throw new Error("Candidate validation evidence stale or failed");
const reviews = candidate.reviews;
if (
  !Array.isArray(reviews) ||
  reviews.length !== 2 ||
  !reviews.some((review) => review.axis === "standards") ||
  !reviews.some((review) => review.axis === "spec") ||
  reviews.some((review) => !review.passed || review.findings.length || !matches(review)) ||
  reviews[0].delegateSession === reviews[1].delegateSession
)
  throw new Error("Candidate review evidence stale or failed");
const artifact = candidate.artifact;
if (
  artifact?.kind !== "git-bundle" ||
  artifact.relativePath !== `candidates/${candidate.commit}.bundle`
)
  throw new Error("Missing candidate artifact");
if (
  createHash("sha256")
    .update(readFileSync(`/state/${artifact.relativePath}`))
    .digest("hex") !== artifact.sha256
)
  throw new Error("Candidate artifact changed");
git("bundle", "verify", `/state/${artifact.relativePath}`);
