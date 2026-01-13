import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";
import { Toaster, toast } from "@/registry/ui/sonner";

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
      <Button variant="outline" onClick={() => toast.show("Event has been created")}>
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
          toast.show({
            title: "Event has been created",
            description: "Monday, January 3rd at 6:00pm",
          })
        }
      >
        Show Toast
      </Button>
    </Example>
  );
}
