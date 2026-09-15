---
name: compatibility-fixture
description: Execute the disposable authenticated compatibility fixture.
disable-model-invocation: true
---

1. Read `resource.txt` beside this skill. Write its exact content to `/workspace/result.txt`.
2. Call `delegate_review` to independently verify `/workspace/result.txt` against the resource.
3. Call `checkpoint` with questionId `fixture-answer` and prompt `Which color should the fixture record?`.
4. End your turn. When the coordinator later gives the answer, write that answer to `/workspace/answer.txt` and call `phase_complete`.

Operate only on the fixture files. Authentication files contain secrets and must never be read or printed by your tools.
