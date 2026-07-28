# Domain Docs

How the engineering skills should consume this repository's domain documentation.

## Before exploring, read these

- Read `docs/context/root.md` if it exists.
- Read applicable ADRs directly under `docs/adr/`.

If these files do not exist, proceed silently. Do not suggest creating them upfront. The `/domain-modeling` skill creates them lazily when terms or decisions are resolved.

## File structure

Single-context project:

```text
docs/
├── context/
│   └── root.md
└── adr/
    ├── 0001-event-sourced-orders.md
    └── 0002-postgres-for-write-model.md
```

## Use the context vocabulary

Use the context file's terms when naming domain concepts in issues, proposals, hypotheses, tests, and code. Do not drift to synonyms the context explicitly avoids.

If a needed concept is absent, reconsider whether the output invents language the project does not use. If the gap is real, note it for `/domain-modeling`.

## Flag ADR conflicts

Surface conflicts instead of silently overriding an ADR:

> _Contradicts `docs/adr/0007-event-sourced-orders.md`, but worth reopening because..._
