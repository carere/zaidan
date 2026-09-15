import { ARTICLE_HTML } from "./article";
import { CHANGELOG_HTML } from "./changelog";
import { CHAT_HTML } from "./chat";
import { DOCS_HTML } from "./docs";
import { NOTES_HTML } from "./notes";

/**
 * Specimen content for the typeset builder preview, ported verbatim from
 * shadcn/ui's `app/(app)/(typeset)/lib/fixtures`. Plain HTML strings so the
 * preview can inject them with `innerHTML` and let the stylesheet do the work
 * — no per-fixture components, no markdown pipeline.
 */
export const TYPESET_FIXTURES = {
  docs: DOCS_HTML,
  chat: CHAT_HTML,
  article: ARTICLE_HTML,
  changelog: CHANGELOG_HTML,
  notes: NOTES_HTML,
} as const;

export { CHAT_QUESTION } from "./chat";
