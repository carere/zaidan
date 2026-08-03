# Issue tracker: GitHub

Issues and delivery specifications for this repository live in GitHub Issues.
Use the `gh` CLI from this repository so it resolves `carere/zaidan`
automatically.

## Conventions

- Create issues with `gh issue create`.
- Read issues and comments with `gh issue view <number> --comments`.
- List and filter issues with `gh issue list`.
- Apply or remove labels with `gh issue edit`.
- PRs are not a triage request surface.

## Delivery workstreams

- A workstream root is an open, unassigned specification issue created by
  `/to-spec`.
- A root has exactly one `## Delivery` section containing distinct target and
  destination branches and a full source revision.
- The root is non-executable and receives no state-role label.
- Implementation tickets are native child issues created by `/to-tickets`.
- Blocking relationships use GitHub's native issue dependencies.
- Child issues receive `ready-for-agent` only after the complete parent,
  publication-key, and blocker graph has been verified.
- A worker may claim only a labelled child whose native blockers are closed.
- Partial publication is resumed using immutable delivery-ticket keys; issues
  are never reconciled by title or deleted automatically.
- Before publication or activation, verify that the target branch is checked
  out, the source revision is its ancestor, and relevant source paths are clean.
