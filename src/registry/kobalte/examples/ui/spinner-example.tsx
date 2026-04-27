/** biome-ignore-all lint/a11y/useValidAnchor: <example file> */
import { ArrowRight } from "lucide-solid";
import { Example, ExampleWrapper } from "@/components/example";
import { Badge } from "@/registry/kobalte/ui/badge";
import { Button } from "@/registry/kobalte/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/kobalte/ui/empty";
import { Field, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";
import { Spinner } from "@/registry/kobalte/ui/spinner";

export default function SpinnerExample() {
  return (
    <ExampleWrapper>
      <SpinnerBasic />
      <SpinnerInButtons />
      <SpinnerInBadges />
      <SpinnerInInputGroup />
      <SpinnerInEmpty />
    </ExampleWrapper>
  );
}

function SpinnerBasic() {
  return (
    <Example title="Basic">
      <div class="flex items-center gap-6">
        <Spinner />
        <Spinner class="size-6" />
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
    <Example title="In Badges" class="items-center justify-center">
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

function SpinnerInInputGroup() {
  return (
    <Example title="In Input Group">
      <Field>
        <FieldLabel for="input-group-spinner">Input Group</FieldLabel>
        <InputGroup>
          <InputGroupInput id="input-group-spinner" />
          <InputGroupAddon align="inline-end">
            <Spinner />
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </Example>
  );
}

function SpinnerInEmpty() {
  return (
    <Example title="In Empty State" containerClass="lg:col-span-full">
      <Empty class="min-h-[300px]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Spinner />
          </EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            You haven't created any projects yet. Get started by creating your first project.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div class="flex gap-2">
            <Button as="a" href="#">
              Create project
            </Button>
            <Button variant="outline">Import project</Button>
          </div>
          <Button as="a" href="#" variant="link" class="text-muted-foreground">
            Learn more <ArrowRight />
          </Button>
        </EmptyContent>
      </Empty>
    </Example>
  );
}
