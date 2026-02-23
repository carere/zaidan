default_prompt := "Get the current date, then go to https://simonwillison.net/, find the latest blog post by Simon, summarize it, and give it a rating out of 10."
default_qa_prompt := "Navigate to https://news.ycombinator.com/. Verify the front page loads with posts. Click 'More' to go to the next page. Verify page 2 loads with a new set of posts. Go back to page 1. Click into the first post's comments link. Verify the comments page loads and at least one comment is visible."

# List available commands
default:
    @just --list

# ─── Layer 1: Skills (Capabilities) ─────────────────────────

# Playwright skill — headless browser automation
test-playwright headed="true" prompt=default_prompt:
    claude --dangerously-skip-permissions --model opus -p "/playwright-bowser (headed: {{ headed }}) {{ prompt }}"

# ─── Layer 2: Subagents (Scale) ─────────────────────────────

# QA agent — structured user story validation
test-qa headed="true" prompt=default_qa_prompt:
    claude --dangerously-skip-permissions --model opus -p "Use a @bowser-qa-agent: (headed: {{ headed }}) {{ prompt }}"

# Unified transformer — auto-detects component vs block
transform name="accordion" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus -p "Use @zaidan-transformer to sync {{ name }} with primitive={{ primitive }}"

# Docs syncer — fetch and transform examples + MDX documentation
sync-docs name="button" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus -p "Use @docs-syncer to sync docs for {{ name }} with primitive={{ primitive }}"

# Registry manager — audit or update registry.json
manage-registry mode="audit" primitive="kobalte":
    claude --dangerously-skip-permissions --model opus -p "Use @registry-manager in {{ mode }} mode with primitive={{ primitive }}"

# ─── Layer 3: Commands (Orchestration) ──────────────────────

# Sync a single shadcn component (full lifecycle: transform + docs + QA + PR)
sync name primitive="kobalte" playground="" docs="":
    claude --dangerously-skip-permissions --model opus -p "/sync {{ name }} --primitive={{ primitive }}{{ if playground != '' { ' --playground=' + playground } else { '' } }}{{ if docs != '' { ' --docs=' + docs } else { '' } }}"

# Sync a single component from an external registry
sync-external name registry="" primitive="kobalte" playground="" docs="":
    claude --dangerously-skip-permissions --model opus -p "/sync {{ name }} --registry={{ registry }} --primitive={{ primitive }}{{ if playground != '' { ' --playground=' + playground } else { '' } }}{{ if docs != '' { ' --docs=' + docs } else { '' } }}"

# Batch sync all missing shadcn components
sync-all primitive="kobalte" filter="" dry-run="":
    claude --dangerously-skip-permissions --model opus -p "/sync --all --primitive={{ primitive }}{{ if filter != '' { ' --filter=' + filter } else { '' } }}{{ if dry-run != '' { ' --dry-run' } else { '' } }}"

# Batch sync from a third-party registry
sync-registry registry="" primitive="kobalte" filter="" dry-run="":
    claude --dangerously-skip-permissions --model opus -p "/sync --registry={{ registry }} --primitive={{ primitive }}{{ if filter != '' { ' --filter=' + filter } else { '' } }}{{ if dry-run != '' { ' --dry-run' } else { '' } }}"

# UI Review — parallel user story validation across all YAML stories
ui-review headed="headed" filter="" *flags="":
    claude --dangerously-skip-permissions --model opus -p "/ui-review {{ headed }} {{ filter }} {{ flags }}"

# Registry audit — read-only check for missing entries, orphans, schema violations
registry-audit primitive="kobalte":
    claude --dangerously-skip-permissions --model opus -p "/registry-audit --primitive={{ primitive }}"

# Registry update — apply fixes, rebuild registry output, commit
registry-update primitive="kobalte":
    claude --dangerously-skip-permissions --model opus -p "/registry-update --primitive={{ primitive }}"

# ─── Layer 4: Composed Recipes ──────────────────────────────

# Sync multiple shadcn components sequentially
sync-batch *components:
    for c in {{ components }}; do just sync $c; done

# Sync all components from Magic UI
sync-magicui filter="":
    just sync-registry registry="https://magicui.design/r/registry.json" filter="{{ filter }}"
