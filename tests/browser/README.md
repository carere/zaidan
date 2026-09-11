# Browser interaction tests

Run `bunx playwright install chromium` once, then `bunx playwright test`.

The suite runs the real registry components and demo in a standalone Vite fixture
with registry styles. It supplies the standard consumer `cn` helper so the
fixture does not depend on the documentation site's TanStack server utilities
or Cloudflare runtime. Vitest excludes this directory; run both `bunx vitest run`
and `bunx playwright test` when validating changes.

The Filters regression rests the real browser pointer on an option for over one
second because Kobalte's delayed dismissal can pass an immediate visibility check.
