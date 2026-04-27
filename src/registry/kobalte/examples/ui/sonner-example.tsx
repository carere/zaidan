import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Toaster } from "@/registry/kobalte/ui/sonner";

export default function SonnerExample() {
  return (
    <>
      <Toaster />
      <ExampleWrapper>
        <BasicExample />
        <WithDescriptionExample />
      </ExampleWrapper>
    </>
  );
}

function BasicExample() {
  return (
    <Example title="Basic" class="items-center justify-center">
      <Button variant="outline" onClick={() => toast("Event has been created")}>
        Show Toast
      </Button>
    </Example>
  );
}

function WithDescriptionExample() {
  return (
    <Example title="With Description" class="items-center justify-center">
      <Button
        variant="outline"
        onClick={() =>
          toast("Event has been created", {
            description: "Monday, January 3rd at 6:00pm",
          })
        }
      >
        Show Toast
      </Button>
    </Example>
  );
}
