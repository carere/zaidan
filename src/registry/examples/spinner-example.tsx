import { Example, ExampleWrapper } from "@/components/example";
import { Badge } from "@/registry/ui/badge";
import { Button } from "@/registry/ui/button";
import { Spinner } from "@/registry/ui/spinner";

export default function SpinnerExample() {
  return (
    <ExampleWrapper>
      <SpinnerBasic />
      <SpinnerSizes />
      <SpinnerColors />
      <SpinnerInButtons />
      <SpinnerInBadges />
    </ExampleWrapper>
  );
}

function SpinnerBasic() {
  return (
    <Example title="Basic">
      <div class="flex items-center gap-6">
        <Spinner />
      </div>
    </Example>
  );
}

function SpinnerSizes() {
  return (
    <Example title="Sizes">
      <div class="flex items-center gap-6">
        <Spinner class="size-3" />
        <Spinner class="size-4" />
        <Spinner class="size-6" />
        <Spinner class="size-8" />
      </div>
    </Example>
  );
}

function SpinnerColors() {
  return (
    <Example title="Colors">
      <div class="flex items-center gap-6">
        <Spinner class="text-red-500" />
        <Spinner class="text-green-500" />
        <Spinner class="text-blue-500" />
        <Spinner class="text-yellow-500" />
        <Spinner class="text-purple-500" />
      </div>
    </Example>
  );
}

function SpinnerInButtons() {
  return (
    <Example title="In Buttons">
      <div class="flex flex-wrap items-center gap-4">
        <Button>
          <Spinner data-icon="inline-start" /> Submit
        </Button>
        <Button disabled>
          <Spinner data-icon="inline-start" /> Disabled
        </Button>
        <Button variant="outline" disabled>
          <Spinner data-icon="inline-start" /> Outline
        </Button>
        <Button variant="outline" size="icon" disabled>
          <Spinner data-icon="inline-start" />
          <span class="sr-only">Loading...</span>
        </Button>
      </div>
    </Example>
  );
}

function SpinnerInBadges() {
  return (
    <Example title="In Badges">
      <div class="flex flex-wrap items-center justify-center gap-4">
        <Badge>
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
        <Badge variant="secondary">
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
        <Badge variant="destructive">
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
        <Badge variant="outline">
          <Spinner data-icon="inline-start" />
          Badge
        </Badge>
      </div>
    </Example>
  );
}
