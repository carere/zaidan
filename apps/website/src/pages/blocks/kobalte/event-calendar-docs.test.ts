import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getDocsExample } from "@/lib/docs-examples";

const pagePath = fileURLToPath(new URL("./event-calendar.mdx", import.meta.url));
const demoNames = ["event-calendar-demo"];

describe("Event Calendar documentation", () => {
  it("links every approved focused demo to a default-export Solid module", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const name of demoNames) {
      expect(page).toContain(`<ComponentPreview name="${name}"`);

      const demoPath = fileURLToPath(
        new URL(`../../../registry/kobalte/examples/docs/${name}.tsx`, import.meta.url),
      );
      const demo = await readFile(demoPath, "utf8");

      expect(demo).toContain("export default function");
      expect(demo).toContain('from "@/registry/kobalte/blocks/event-calendar"');
      expect(demo).not.toContain('from "react"');
      expect(demo).not.toContain('from "lucide-react"');
      expect(demo).not.toContain("className");
      expect(demo).not.toContain("forwardRef");
      expect(demo).not.toContain("sonner");
    }

    for (const name of demoNames) {
      const resolvedExample = getDocsExample(name);
      expect(resolvedExample).toBeTypeOf("function");
      expect(getDocsExample(name)).toBe(resolvedExample);
    }

    expect(page).toContain("shadcn@latest add @zaidan/event-calendar");
  });

  it("documents the API surface the block actually ships", async () => {
    const page = await readFile(pagePath, "utf8");

    for (const heading of [
      "## Solid API notes",
      "## API Reference",
      "### EventCalendar",
      "### EventCalendarNav",
      "### EventCalendarContent",
      "### EventCalendarMonthView",
      "### EventCalendarTimeGrid",
      "### EventCalendarAgendaView",
      "### EventCalendarResourceView",
      "### EventCalendarEvent",
      "### EventCalendarApi",
      "### CalendarEvent",
      "## Hooks",
      "## Helpers",
      "## Config",
      "### State options",
      "### Callbacks",
      "### View configuration",
      "### EventCalendarOffDaysConfig",
      "### Internationalization",
    ]) {
      expect(page).toContain(heading);
    }

    // Solid divergences that the prose must carry, not the React shapes.
    expect(page).toContain("useEventCalendarState");
    expect(page).toContain("onEventUpdate");
    expect(page).toContain("Accessor<EventCalendarOccurrence<TData>[]>");
    expect(page).toContain("EventCalendarApiRef");
    expect(page).toContain("JSX.CSSProperties");
    expect(page).not.toContain("npx shadcn");

    // Everything from the API reference down describes the Solid surface only.
    // React type names may only appear above it, in the porting notes.
    const apiReference = page.slice(page.indexOf("## API Reference"));
    expect(apiReference).not.toContain("ReactNode");
    expect(apiReference).not.toContain("React.MouseEvent");
    expect(apiReference).not.toContain("useRender");
    expect(apiReference).not.toContain("CSSProperties>");
    // The off-days marker class is `class` in this port, never `className`.
    expect(apiReference).toMatch(/\|\s*`class`\s*\|\s*`string`\s*\|\s*`"bg-muted\/40"`/);
  });
});
