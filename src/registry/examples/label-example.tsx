import { Example, ExampleWrapper } from "@/components/example";
import { Label } from "@/registry/ui/label";

export default function LabelExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <LabelExample1 />
      <LabelExample2 />
      <LabelExample3 />
    </ExampleWrapper>
  );
}

function LabelExample1() {
  return (
    <Example title="Basic">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <Label>Your email address</Label>
        <Label for="email">Your email address</Label>
      </div>
    </Example>
  );
}

function LabelExample2() {
  return (
    <Example title="With Input">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div class="flex flex-col gap-2">
          <Label for="email">Email</Label>
          <input
            type="email"
            id="email"
            placeholder="name@example.com"
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>
        <div class="flex flex-col gap-2">
          <Label for="username">Username</Label>
          <input
            type="text"
            id="username"
            placeholder="@username"
            class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>
      </div>
    </Example>
  );
}

function LabelExample3() {
  return (
    <Example title="Disabled State">
      <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div class="group flex flex-col gap-2" data-disabled="true">
          <Label for="disabled-input">Disabled Label</Label>
          <input
            type="text"
            id="disabled-input"
            disabled
            placeholder="Disabled input"
            class="peer flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>
      </div>
    </Example>
  );
}
