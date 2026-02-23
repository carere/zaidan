default_prompt := "Get the current date, then go to https://simonwillison.net/, find the latest blog post by Simon, summarize it, and give it a rating out of 10."
default_qa_prompt := "Navigate to https://news.ycombinator.com/. Verify the front page loads with posts. Click 'More' to go to the next page. Verify page 2 loads with a new set of posts. Go back to page 1. Click into the first post's comments link. Verify the comments page loads and at least one comment is visible."

# List available commands
default:
    @just --list

# ─── Layer 1: Skill (Capability) ─────────────────────────────

# Playwright skill — direct (headless by default)
test-playwright-skill headed="true" prompt=default_prompt:
    claude --dangerously-skip-permissions --model opus -p "/playwright-bowser (headed: {{ headed }}) {{ prompt }}"

# ─── Layer 2: Subagent (Scale) ───────────────────────────────

# QA agent — structured user story validation
test-qa headed="true" prompt=default_qa_prompt:
    claude --dangerously-skip-permissions --model opus -p "Use a @bowser-qa-agent: (headed: {{ headed }}) {{ prompt }}"

# Run a single component transformer agent
transform-component component="accordion":
    claude --dangerously-skip-permissions --model opus -p "Use @component-transformer to sync {{ component }}"

# Run a single block transformer agent
transform-block block="login-01":
    claude --dangerously-skip-permissions --model opus -p "Use @block-transformer to sync {{ block }}"

# ─── Layer 3: Command (Orchestration) ────────────────────────

# Full component sync (transform + docs + QA + PR)
sync-component component="button" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus -p "/sync-component {{ component }} {{ primitive }}"

# UI Review — parallel user story validation across all YAML stories
ui-review headed="headed" filter="" *flags="":
    claude --dangerously-skip-permissions --model opus -p "/ui-review {{ headed }} {{ filter }} {{ flags }}"

# Registry audit — check for missing entries, orphans, schema violations
registry-audit:
    claude --dangerously-skip-permissions --model opus -p "/registry-audit"

# Registry update — apply fixes, rebuild registry output
registry-update:
    claude --dangerously-skip-permissions --model opus -p "/registry-update"

# ═══════════════════════════════════════════════════════════════
# Zaidan Forge — Agentic Component Registry Lifecycle
# ═══════════════════════════════════════════════════════════════
# ─── Layer 3: Commands — shadcn-native ─────────────────────

# Full block sync
sync-block block="login-01":
    claude --dangerously-skip-permissions --model opus \
      "/sync-block {{ block }}"

# Batch sync all missing shadcn components
sync-all primitive="kobalte" filter="":
    claude --dangerously-skip-permissions --model opus \
      "/sync-all {{ primitive }} {{ filter }}"

# ─── Layer 3: Commands — external sources ──────────────────

# Sync a component from any external source
sync-external name url="" source="" type="component" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus \
      "/sync-external {{ name }} --url={{ url }} --source={{ source }} --type={{ type }} --primitive={{ primitive }}"

# Batch sync from a third-party registry
sync-registry registry_url="" filter="":
    claude --dangerously-skip-permissions --model opus \
      "/sync-registry {{ registry_url }} --filter={{ filter }}"

# ─── Layer 4: Composed recipes ──────────────────────────────

# Sync multiple shadcn components in one shot
sync-batch *components:
    for c in {{ components }}; do just sync-component $c; done

# Sync all components from Magic UI
sync-magicui filter="":
    just sync-registry "https://magicui.design/r/registry.json" "{{ filter }}"
