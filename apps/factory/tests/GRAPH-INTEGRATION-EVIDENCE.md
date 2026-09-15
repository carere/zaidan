# Sandboxed graph integration evidence — 2026-09-15

The real Docker/Pi integration contract passes using the dedicated
`zaidan-factory-integration-test-522:0.85.1` image. Its generated OAuth-shaped
fixture values are fake and Docker networking is disabled. No home skills,
subscription credentials, GitHub credentials, or Telegram credentials are used.

The fixture produces a reviewed child commit through the actual Pi worker, then
creates an independent sibling commit that conflicts on the same file. The
integration phase clones the current graph bundle inside Docker, imports the
child bundle, starts the merge, invokes the captured resolver through native
`/skill:resolving-merge-conflicts`, and reaches a durable human checkpoint with
an actual unresolved Git conflict. A fresh worker resumes the original main Pi
session and captured resources after the temporary graph export is deleted.
The retained integration input supplies the original bundle.

The synthetic provider resolves both changes through Pi's real bash tool,
checkpoints the merge, loads captured `code-review`, runs the selected combined
code checks, and starts new independent standards and specification delegates.
The completed bundle contains both parent commits, the resolved combined file,
and the sibling-only file. The original implementation checkout, bundle and
session history remain intact. This verifies runtime protocol and containment;
it does not claim live model reasoning or live provider acceptance.

A fresh credential-free Docker verifier rejects a tampered check naming a stale
graph head. The worker rejects an uncaptured resolver before dispatch. Candidate,
check and review evidence retains the original snapshot and issue revision and
binds the exact effective review base plus:

```text
integration: { graphId, graphRevision, expectedHead, candidateCommit }
```

Inspection confirms UID 1000, unprivileged operation, read-only root, networking
`none`, immutable source/request/resource/runtime mounts, and no host-home or
Docker-socket mount. Integration workspaces and retained source bundles are
outside the original agent-writable state mount, preventing writable aliases to
those inputs. No Git command or package check runs on the host in an agent
checkout; the host fixture only imports the verified exported bundle into its
own trusted Git repository.

The test was red before integration support because the previous worker reused
the child candidate without graph coverage. A second red run exposed dependence
on the vanished temporary graph export. Both behaviors are now green.

Regression checks passed: all eight existing real Docker/Pi worker groups
(resource capture, sessions, failed evidence, cancellation, no-change, scoped
model permits, native compaction, quota/authentication and fail-closed permit
transport); 73 deterministic factory tests; factory types, formatting and Knip;
workspace formatting. Coordinator graph policy and fault-injection evidence is
covered separately by `graph-integration.test.ts`.

## Reproduce

```sh
docker build -t zaidan-factory-integration-test-522:0.85.1 -f apps/factory/tests/Dockerfile apps/factory/tests
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-docker-integration
FACTORY_DOCKER_TEST_IMAGE=zaidan-factory-integration-test-522:0.85.1 direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test-docker
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test factory:tsc factory:check factory:knip workspace:check
```

Live authenticated whole-factory acceptance remains the separate #527 gate.
