export const repository = "carere/zaidan-factory-fixture";
export const checks = [
  "node --test",
  "node --check src/greeting.mjs",
  "node --check src/compose.mjs",
];
export const skillNames = [
  "implement",
  "tdd",
  "code-review",
  "codebase-design",
  "triage",
  "grilling",
  "domain-modeling",
  "resolving-merge-conflicts",
];
export const sourceFiles: Record<string, string> = {
  "package.json": `${JSON.stringify(
    {
      name: "factory-live-fixture",
      private: true,
      type: "module",
      scripts: { test: "node --test" },
    },
    null,
    2,
  )}\n`,
  "README.md":
    "# Factory live acceptance fixture\n\nTiny dependency-free Node project. Run `node --test`. Setup code and E2 are human-owned fixture scaffolding. Actual factory implementation belongs to E1/A/B/D.\n",
  "AGENTS.md":
    "# Working instructions\n\nRead README.md and docs/agents/*.md. Use node --test and syntax checks. Tests at greeting(name), composeGreeting(options), formatGreeting(parts), and greetingEnvelope(options) are pre-approved seams. Keep dependencies empty. Preserve the single return line in composeGreeting so sibling changes exercise real conflict resolution. Independent review delegates must inspect actual committed code. Never merge main.\n",
  "docs/agents/issue-tracker.md":
    "# Issue tracker\nUse native GitHub Issues in carere/zaidan-factory-fixture. Coordinator owns publications and closures.\n",
  "docs/agents/triage-labels.md":
    "# Triage labels\nCanonical states: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix.\n",
  "docs/agents/domain.md": "# Domain docs\nRead docs/context/root.md.\n",
  "docs/context/root.md":
    "# Greeting context\nA greeting has a salutation and recipient. An envelope contains formatted text and the parts used to create it.\n",
  "src/greeting.mjs": "export function greeting(_name) { return 'Hello'; }\n",
  "src/compose.mjs":
    "export function composeGreeting(_options = {}) { return { salutation: 'Hello', recipient: 'World' }; }\n",
  "tests/greeting.test.mjs":
    "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\nimport { greeting } from '../src/greeting.mjs';\ntest('baseline greeting', () => assert.equal(greeting(), 'Hello'));\n",
  "tests/compose.test.mjs":
    "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\nimport { composeGreeting } from '../src/compose.mjs';\ntest('default parts', () => assert.deepEqual(composeGreeting(), { salutation: 'Hello', recipient: 'World' }));\n",
};
export const externalFiles: Record<string, string> = {
  "src/format.mjs":
    "export function formatGreeting(parts) { return parts.salutation + ', ' + parts.recipient + '!'; }\n",
  "tests/format.test.mjs":
    "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\nimport { formatGreeting } from '../src/format.mjs';\ntest('formats supplied parts', () => assert.equal(formatGreeting({ salutation: 'Hi', recipient: 'Ada' }), 'Hi, Ada!'));\n",
};
export type IssueKey = "E1" | "E2" | "R" | "P" | "A" | "B" | "D";
export const specs: Record<IssueKey, { title: string; scope: string; acceptance: string }> = {
  E1: {
    title: "Live triage and standalone greeting",
    scope:
      "greeting('Ada') must return 'Hello, Ada!'. Preserve the supplied nonempty name, add no dependencies, and retain greeting() === 'Hello'. This new revision requires actual native triage and the maintainer's private Telegram decisions; preserved earlier synthetic comments are historical evidence only.",
    acceptance:
      "Add a public behavior test for Ada plus the baseline no-argument case. node --test and syntax checks pass; independent Standards and Spec reviews cover the exact commit. Keep issue open until observed normal maintainer merge.",
  },
  E2: {
    title: "Human-owned external squash formatter",
    scope:
      "Fixture scaffolding: add formatGreeting(parts) in src/format.mjs, returning the supplied salutation and recipient as 'Hi, Ada!'. The pre-staged PR is human-owned setup, not factory implementation.",
    acceptance:
      "node --test passes. Maintainer squash-merges the staged PR. Native merge-commit ancestry and exact formatter bytes prove external delivery; no original candidate ancestry assumption.",
  },
  R: {
    title: "Composed greeting envelope graph",
    scope:
      "Coordinate P and D. Preserve the E1 greeting and E2 formatter. Deliver configurable parts through both A and B, then an envelope through D. R and P are specifications, never implementation workers.",
    acceptance:
      "A and B start from the same graph head containing E1/E2. Both update the one-line composeGreeting return expression. Serial integration preserves both changes and proves any actual conflict through Git evidence. D starts promptly from combined prerequisites. Whole-spec independent review passes before PR readiness. R/P close only after observed main delivery.",
  },
  P: {
    title: "Configurable greeting parts",
    scope:
      "Coordinate independent A and B beneath this specification. Inherit native blocked-by E1 and E2. composeGreeting({salutation:'Hi',recipient:'Ada'}) returns both supplied values, with Hello/World defaults. Preserve both contributions and the shared one-line function.",
    acceptance:
      "Both distinct public API behaviors and combined behavior pass. No dependency becomes actionable until native external delivery reaches actual starting Git objects.",
  },
  A: {
    title: "Honor the salutation option",
    scope:
      "Update src/compose.mjs composeGreeting to honor options.salutation, defaulting to Hello. Retain recipient behavior. Change the existing single return line without reformatting it; the sibling owns recipient support.",
    acceptance:
      "A behavior test expects composeGreeting({salutation:'Hi'}).salutation === 'Hi'; defaults remain unchanged. node --test and syntax checks pass, with independent exact-commit review.",
  },
  B: {
    title: "Honor the recipient option",
    scope:
      "Update src/compose.mjs composeGreeting to honor options.recipient, defaulting to World. Retain salutation behavior. Change the existing single return line without reformatting it; the sibling owns salutation support.",
    acceptance:
      "A behavior test expects composeGreeting({recipient:'Ada'}).recipient === 'Ada'; defaults remain unchanged. node --test and syntax checks pass, with independent exact-commit review.",
  },
  D: {
    title: "Combine delivered greeting prerequisites",
    scope:
      "Export greetingEnvelope(options) in src/envelope.mjs, using actual composeGreeting and formatGreeting imports. Return {text, parts}; for Hi/Ada text is 'Hi, Ada!' and parts contains both options. Native blocked-by P expands to actual A/B delivery.",
    acceptance:
      "Public tests exercise both supplied options and defaults through real imports. The starting commit contains E1/E2 and both sibling contributions. node --test and syntax checks pass. Whole graph acceptance includes exact R/P requirements.",
  },
};
export const relationships: { kind: "child" | "blocked-by"; from: IssueKey; to: IssueKey }[] = [
  { kind: "child", from: "R", to: "P" },
  { kind: "child", from: "P", to: "A" },
  { kind: "child", from: "P", to: "B" },
  { kind: "child", from: "R", to: "D" },
  { kind: "blocked-by", from: "P", to: "E1" },
  { kind: "blocked-by", from: "P", to: "E2" },
  { kind: "blocked-by", from: "D", to: "P" },
];
export const marker = (scenario: string, key: string) => `<!-- factory-live:${scenario}:${key} -->`;
export const issueBody = (scenario: string, key: IssueKey) =>
  `## Scope\n${specs[key].scope}\n\n## Acceptance criteria\n${specs[key].acceptance}\n\nPublic behavior seams are pre-approved; use the complete captured maintainer skills. This is the explicit final-service fixture revision.\n\n${marker(scenario, key)}`;
