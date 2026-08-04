// @vitest-environment happy-dom

import { render } from "solid-js/web";
import { afterEach, describe, expect, it } from "vitest";

import AccordionExample from "./accordion-example";

let dispose: (() => void) | undefined;

afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
});

function mountGallery() {
  const host = document.createElement("div");
  document.body.append(host);
  dispose = render(() => <AccordionExample />, host);
  return host;
}

function findExample(host: HTMLElement, title: string) {
  const example = Array.from(host.querySelectorAll<HTMLElement>('[data-slot="example"]')).find(
    (element) => element.firstElementChild?.textContent === title,
  );

  expect(example, `Expected the ${title} example`).toBeDefined();
  return example as HTMLElement;
}

function getTriggers(example: HTMLElement) {
  return Array.from(example.querySelectorAll<HTMLElement>('[data-slot="accordion-trigger"]'));
}

describe("Accordion Create gallery", () => {
  it("renders the five pinned compositions with their intended initial states", () => {
    const host = mountGallery();
    const titles = Array.from(host.querySelectorAll<HTMLElement>('[data-slot="example"]')).map(
      (example) => example.firstElementChild?.textContent,
    );

    expect(titles).toEqual(["Basic", "Multiple", "With Borders", "In Card", "With Disabled"]);
    expect(host.querySelectorAll('[data-slot="accordion"]')).toHaveLength(5);

    const [plans] = getTriggers(findExample(host, "In Card"));
    expect(plans?.textContent).toContain("What subscription plans do you offer?");
    expect(plans?.getAttribute("aria-expanded")).toBe("true");

    const disabledTrigger = getTriggers(findExample(host, "With Disabled")).find(
      (trigger) => trigger.getAttribute("aria-disabled") === "true",
    );
    expect(disabledTrigger?.textContent).toContain("Premium feature information");
    disabledTrigger?.click();
    expect(disabledTrigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("exercises exclusive and multiple expansion", () => {
    const host = mountGallery();
    const [firstBasic, secondBasic] = getTriggers(findExample(host, "Basic"));
    const [firstMultiple, secondMultiple] = getTriggers(findExample(host, "Multiple"));

    firstBasic?.click();
    expect(firstBasic?.getAttribute("aria-expanded")).toBe("true");
    secondBasic?.click();
    expect(firstBasic?.getAttribute("aria-expanded")).toBe("false");
    expect(secondBasic?.getAttribute("aria-expanded")).toBe("true");

    firstMultiple?.click();
    secondMultiple?.click();
    expect(firstMultiple?.getAttribute("aria-expanded")).toBe("true");
    expect(secondMultiple?.getAttribute("aria-expanded")).toBe("true");
  });

  it("preserves every pinned style-specific gallery treatment", () => {
    const host = mountGallery();
    const withBorders = findExample(host, "With Borders");
    const bordersRoot = withBorders.querySelector<HTMLElement>('[data-slot="accordion"]');
    const bordersTrigger = getTriggers(withBorders)[0];
    bordersTrigger?.click();
    const bordersContent = withBorders.querySelector<HTMLElement>(
      '[data-slot="accordion-content-inner"]',
    );
    const disabledRoot = findExample(host, "With Disabled").querySelector<HTMLElement>(
      '[data-slot="accordion"]',
    );

    expect(bordersRoot?.className).toContain("style-vega:gap-2");
    expect(bordersRoot?.className).toContain("style-nova:gap-2");
    expect(bordersRoot?.className).toContain("style-lyra:gap-2");
    expect(bordersTrigger?.className).toContain("style-luma:text-sm");
    expect(bordersContent?.className).toContain("style-luma:px-0");
    expect(disabledRoot?.className).toContain("style-luma:rounded-xl");
  });
});
