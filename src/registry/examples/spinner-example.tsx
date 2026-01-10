import { Example, ExampleWrapper } from "@/components/example";
import { Badge } from "@/registry/ui/badge";
import { Button } from "@/registry/ui/button";
import { Spinner } from "@/registry/ui/spinner";

export default function SpinnerExample() {
  return (
    <ExampleWrapper>
      <SpinnerBasic />
      <SpinnerInButtons />
      <SpinnerInBadges />
      {/* <SpinnerInInputGroup />
      <SpinnerInEmpty /> */}
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

// function SpinnerInInputGroup() {
//   return (
//     <Example title="In Input Group">
//       <Field>
//         <FieldLabel htmlFor="input-group-spinner">Input Group</FieldLabel>
//         <InputGroup>
//           <InputGroupInput id="input-group-spinner" />
//           <InputGroupAddon>
//             <Spinner />
//           </InputGroupAddon>
//         </InputGroup>
//       </Field>
//     </Example>
//   );
// }

// function SpinnerInEmpty() {
//   return (
//     <Example title="In Empty State" containerClass="lg:col-span-full">
//       <Empty class="min-h-[300px]">
//         <EmptyHeader>
//           <EmptyMedia variant="icon">
//             <Spinner />
//           </EmptyMedia>
//           <EmptyTitle>No projects yet</EmptyTitle>
//           <EmptyDescription>
//             You haven&apos;t created any projects yet. Get started by creating your first project.
//           </EmptyDescription>
//         </EmptyHeader>
//         <EmptyContent>
//           <div class="flex gap-2">
//             <Button as="a" href="#">
//               Create project
//             </Button>
//             <Button variant="outline">Import project</Button>
//           </div>
//           <Button variant="link" as="a" href="#" class="text-muted-foreground">
//             Learn more <ArrowRight />
//           </Button>
//         </EmptyContent>
//       </Empty>
//     </Example>
//   );
// }
