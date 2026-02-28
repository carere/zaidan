import { ArrowLeftCircle, ArrowRight } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";

export default function ButtonExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1 2xl:grid-cols-1">
      <ButtonVariantsAndSizes />
      <ButtonIconRight />
      <ButtonIconLeft />
      <ButtonIconOnly />
      <ButtonInvalidStates />
      <ButtonExamples />
    </ExampleWrapper>
  );
}

function ButtonVariantsAndSizes() {
  return (
    <Example title="Variants & Sizes">
      <div class="flex flex-wrap items-center gap-2">
        <Button size="xs">Default</Button>
        <Button size="xs" variant="secondary">
          Secondary
        </Button>
        <Button size="xs" variant="outline">
          Outline
        </Button>
        <Button size="xs" variant="ghost">
          Ghost
        </Button>
        <Button size="xs" variant="destructive">
          Destructive
        </Button>
        <Button size="xs" variant="link">
          Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm">Default</Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
        <Button size="sm" variant="outline">
          Outline
        </Button>
        <Button size="sm" variant="ghost">
          Ghost
        </Button>
        <Button size="sm" variant="destructive">
          Destructive
        </Button>
        <Button size="sm" variant="link">
          Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="lg">Default</Button>
        <Button size="lg" variant="secondary">
          Secondary
        </Button>
        <Button size="lg" variant="outline">
          Outline
        </Button>
        <Button size="lg" variant="ghost">
          Ghost
        </Button>
        <Button size="lg" variant="destructive">
          Destructive
        </Button>
        <Button size="lg" variant="link">
          Link
        </Button>
      </div>
    </Example>
  );
}

function ButtonIconRight() {
  return (
    <Example title="Icon Right">
      <div class="flex flex-wrap items-center gap-2">
        <Button size="xs">
          Default <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="secondary">
          Secondary <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="outline">
          Outline <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="ghost">
          Ghost <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="destructive">
          Destructive <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="xs" variant="link">
          Link <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm">
          Default
          <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="secondary">
          Secondary <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="outline">
          Outline
          <ArrowRight />
        </Button>
        <Button size="sm" variant="ghost">
          Ghost <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="destructive">
          Destructive <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="sm" variant="link">
          Link <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button>
          Default <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="secondary">
          Secondary <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="outline">
          Outline <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="ghost">
          Ghost <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="destructive">
          Destructive <ArrowRight data-icon="inline-end" />
        </Button>
        <Button variant="link">
          Link <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="lg">
          Default <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="secondary">
          Secondary <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="outline">
          Outline <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="ghost">
          Ghost <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="destructive">
          Destructive <ArrowRight data-icon="inline-end" />
        </Button>
        <Button size="lg" variant="link">
          Link <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </Example>
  );
}

function ButtonIconLeft() {
  return (
    <Example title="Icon Left">
      <div class="flex flex-wrap items-center gap-2">
        <Button size="xs">
          <ArrowLeftCircle data-icon="inline-start" /> Default
        </Button>
        <Button size="xs" variant="secondary">
          <ArrowLeftCircle data-icon="inline-start" /> Secondary
        </Button>
        <Button size="xs" variant="outline">
          <ArrowLeftCircle data-icon="inline-start" /> Outline
        </Button>
        <Button size="xs" variant="ghost">
          <ArrowLeftCircle data-icon="inline-start" /> Ghost
        </Button>
        <Button size="xs" variant="destructive">
          <ArrowLeftCircle data-icon="inline-start" /> Destructive
        </Button>
        <Button size="xs" variant="link">
          <ArrowLeftCircle data-icon="inline-start" /> Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm">
          <ArrowLeftCircle data-icon="inline-start" /> Default
        </Button>
        <Button size="sm" variant="secondary">
          <ArrowLeftCircle data-icon="inline-start" /> Secondary
        </Button>
        <Button size="sm" variant="outline">
          <ArrowLeftCircle data-icon="inline-start" /> Outline
        </Button>
        <Button size="sm" variant="ghost">
          <ArrowLeftCircle data-icon="inline-start" /> Ghost
        </Button>
        <Button size="sm" variant="destructive">
          <ArrowLeftCircle data-icon="inline-start" /> Destructive
        </Button>
        <Button size="sm" variant="link">
          <ArrowLeftCircle data-icon="inline-start" /> Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button>
          <ArrowLeftCircle data-icon="inline-start" /> Default
        </Button>
        <Button variant="secondary">
          <ArrowLeftCircle data-icon="inline-start" /> Secondary
        </Button>
        <Button variant="outline">
          <ArrowLeftCircle data-icon="inline-start" /> Outline
        </Button>
        <Button variant="ghost">
          <ArrowLeftCircle data-icon="inline-start" /> Ghost
        </Button>
        <Button variant="destructive">
          <ArrowLeftCircle data-icon="inline-start" /> Destructive
        </Button>
        <Button variant="link">
          <ArrowLeftCircle data-icon="inline-start" /> Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="lg">
          <ArrowLeftCircle data-icon="inline-start" /> Default
        </Button>
        <Button size="lg" variant="secondary">
          <ArrowLeftCircle data-icon="inline-start" /> Secondary
        </Button>
        <Button size="lg" variant="outline">
          <ArrowLeftCircle data-icon="inline-start" /> Outline
        </Button>
        <Button size="lg" variant="ghost">
          <ArrowLeftCircle data-icon="inline-start" /> Ghost
        </Button>
        <Button size="lg" variant="destructive">
          <ArrowLeftCircle data-icon="inline-start" /> Destructive
        </Button>
        <Button size="lg" variant="link">
          <ArrowLeftCircle data-icon="inline-start" /> Link
        </Button>
      </div>
    </Example>
  );
}

function ButtonIconOnly() {
  return (
    <Example title="Icon Only">
      <div class="flex flex-wrap items-center gap-2">
        <Button size="icon-xs">
          <ArrowRight />
        </Button>
        <Button size="icon-xs" variant="secondary">
          <ArrowRight />
        </Button>
        <Button size="icon-xs" variant="outline">
          <ArrowRight />
        </Button>
        <Button size="icon-xs" variant="ghost">
          <ArrowRight />
        </Button>
        <Button size="icon-xs" variant="destructive">
          <ArrowRight />
        </Button>
        <Button size="icon-xs" variant="link">
          <ArrowRight />
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="icon-sm">
          <ArrowRight />
        </Button>
        <Button size="icon-sm" variant="secondary">
          <ArrowRight />
        </Button>
        <Button size="icon-sm" variant="outline">
          <ArrowRight />
        </Button>
        <Button size="icon-sm" variant="ghost">
          <ArrowRight />
        </Button>
        <Button size="icon-sm" variant="destructive">
          <ArrowRight />
        </Button>
        <Button size="icon-sm" variant="link">
          <ArrowRight />
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="icon">
          <ArrowRight />
        </Button>
        <Button size="icon" variant="secondary">
          <ArrowRight />
        </Button>
        <Button size="icon" variant="outline">
          <ArrowRight />
        </Button>
        <Button size="icon" variant="ghost">
          <ArrowRight />
        </Button>
        <Button size="icon" variant="destructive">
          <ArrowRight />
        </Button>
        <Button size="icon" variant="link">
          <ArrowRight />
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="icon-lg">
          <ArrowRight />
        </Button>
        <Button size="icon-lg" variant="secondary">
          <ArrowRight />
        </Button>
        <Button size="icon-lg" variant="outline">
          <ArrowRight />
        </Button>
        <Button size="icon-lg" variant="ghost">
          <ArrowRight />
        </Button>
        <Button size="icon-lg" variant="destructive">
          <ArrowRight />
        </Button>
        <Button size="icon-lg" variant="link">
          <ArrowRight />
        </Button>
      </div>
    </Example>
  );
}

function ButtonInvalidStates() {
  return (
    <Example title="Invalid States">
      <div class="flex flex-wrap items-center gap-2">
        <Button size="xs" aria-invalid="true">
          Default
        </Button>
        <Button size="xs" variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button size="xs" variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button size="xs" variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button size="xs" variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button size="xs" variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="sm" aria-invalid="true">
          Default
        </Button>
        <Button size="sm" variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button size="sm" variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button size="sm" variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button size="sm" variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button size="sm" variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button aria-invalid="true">Default</Button>
        <Button variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <Button size="lg" aria-invalid="true">
          Default
        </Button>
        <Button size="lg" variant="secondary" aria-invalid="true">
          Secondary
        </Button>
        <Button size="lg" variant="outline" aria-invalid="true">
          Outline
        </Button>
        <Button size="lg" variant="ghost" aria-invalid="true">
          Ghost
        </Button>
        <Button size="lg" variant="destructive" aria-invalid="true">
          Destructive
        </Button>
        <Button size="lg" variant="link" aria-invalid="true">
          Link
        </Button>
      </div>
    </Example>
  );
}

function ButtonExamples() {
  return (
    <Example title="Examples">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>
            Submit <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        <div class="flex items-center gap-2">
          <Button variant="destructive">Delete</Button>
          <Button size="icon">
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </Example>
  );
}
