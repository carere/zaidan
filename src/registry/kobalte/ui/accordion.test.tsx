// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

function renderAccordion() {
  const host = document.createElement("div");
  const dispose = render(
    () => (
      <Accordion defaultValue={["shipping"]}>
        <AccordionItem value="shipping">
          <AccordionTrigger>Shipping</AccordionTrigger>
          <AccordionContent>
            <p>Delivery details</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
    host,
  );
  const html = host.innerHTML;
  dispose();
  return html;
}

describe("Accordion", () => {
  it("renders the pinned public slots", () => {
    const html = renderAccordion();

    expect(html).toContain('data-slot="accordion"');
    expect(html).toContain('data-slot="accordion-item"');
    expect(html).toContain('data-slot="accordion-trigger"');
    expect(html).toContain('data-slot="accordion-content"');
    expect(html).toContain('data-slot="accordion-content-inner"');
    expect(html).not.toContain('data-slot="accordion-header"');
  });

  it("renders the two state icons from the pinned source", () => {
    const html = renderAccordion();

    expect(html.match(/data-slot="accordion-trigger-icon"/g)).toHaveLength(2);
    expect(html).toContain("group-aria-expanded/accordion-trigger:hidden");
    expect(html).toContain("group-aria-expanded/accordion-trigger:inline");
  });

  it("renders expanded panel semantics and Kobalte's measured height variable", () => {
    const html = renderAccordion();

    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="region"');
    expect(html).toContain("h-(--kb-accordion-content-height)");
  });
});
