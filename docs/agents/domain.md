# Domain docs

This repository uses a single-context domain-documentation layout.

## Reading order

- Read `docs/context/root.md` when it exists.
- Read applicable ADRs directly under `docs/adr/`.
- If these files do not exist, proceed silently; `/domain-modeling` creates
  them when terminology or architectural decisions need to be recorded.

Use the context document's vocabulary in issues, specifications, tests, and
code. Surface conflicts with existing ADRs rather than silently overriding
them.

## Layout

```text
docs/
├── context/
│   └── root.md
└── adr/
    └── <number>-<decision>.md
```
