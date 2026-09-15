# Triage and Telegram evidence — 2026-09-15

## Observed

The deterministic workflow/transport suite covers the original recommendation
checkpoint before verification, the exact final outcome approval, stale and mixed
answers, immutable original sessions, uncertain publication recovery, canonical
labels, and approval-bound briefs. Telegram contract tests use a local HTTP server
with native Bot API request/response shapes: long polling, numeric maintainer and
private-chat authentication, button callback data, free-text replies, durable
updates/offsets, and lost send receipts. The polling transport sends no routine
messages. These fixtures do not claim an actual human response.

A real Docker/Pi test passed with `--network none`, UID 1000, a fake OAuth-shaped
file, and the dedicated deterministic-provider image. It invoked the original
selected home `triage`, `grilling`, and `domain-modeling` skill closure, including
AGENT-BRIEF.md, OUT-OF-SCOPE.md, and domain/ADR formats. It read relative resources,
stopped at the recommendation question, reopened the workflow store, resumed the
same Pi session, and produced a typed final proposal for a second human checkpoint.
No source skills were rewritten and no real provider call occurred.

This exposed a capture defect: fenced Markdown examples in the existing domain
context format were treated as missing skill dependencies (`./ordering.md`).
Capture now excludes fenced examples from dependency resolution while retaining
the original bytes and checking actual resource links. The normal capture test
includes a fenced example alongside a required real sibling resource.

The actual GitHub write fixture passed in the private disposable repository:

- [Fixture issue #1](https://github.com/carere/zaidan-factory-fixture/issues/1).
- [One disclaimer-prefixed approved brief](https://github.com/carere/zaidan-factory-fixture/issues/1#issuecomment-5679683804).
- Resulting roles: `enhancement`, `ready-for-agent`.
- Original session survived store/Telegram adapter restart.
- A lost coordinator receipt after real publication recovered without a second
  comment or repeated label mutation.

This fixture used a **synthetic worker, local Telegram server, and scripted human
responses**. It proves coordinator-owned native GitHub effects and durable
workflow/transport composition; it does not substitute for the final live
Telegram/provider/human acceptance gate. The first immediate issue-list query
briefly omitted the newly created issue; recovery reused its persisted creation
receipt after it became visible. The fixture runner accepts its retained state
path and loopback port when resuming setup, avoiding another issue creation.

## Remaining live gate

The maintainer's Telegram token configuration and numeric identity have not been
provided. Sending selected home triage resources to the external subscription
provider has not been approved following the earlier automatic approval-review
restriction. No live triage-provider request or Telegram notification was made.
Full factory acceptance must obtain a real maintainer reply through the running
service and exercise the configured worker; synthetic replies are not that proof.

## Reproduction

```sh
docker build -t zaidan-factory-triage-test:0.85.1 -f apps/factory/tests/Dockerfile apps/factory/tests
direnv exec "$(git rev-parse --show-toplevel)" moon --cache off run factory:test factory:test-triage-docker factory:tsc factory:check factory:knip
```

To test the selected original skills locally without network access, prefix the
last command's Docker task with `FACTORY_TRIAGE_SKILL_ROOT` pointing to the
selected skill root. The default test uses generated disposable contract skills.
Both forms retain fake credentials and the network-none image.

`factory:fixture-triage-github` is an **explicit write fixture**, separate from
normal tests. It obtains the selected `gh` account token in memory and writes
only to `carere/zaidan-factory-fixture`. It prints a sanitized evidence path and
summary; it never prints authentication material or calls a provider. Preserve the
resulting issue and external fixture state for the final factory acceptance run.
