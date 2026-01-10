import { toast } from "solid-sonner";
import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/ui/button";

export default function SonnerExample() {
  return (
    <ExampleWrapper class="lg:grid-cols-1">
      <SonnerExample1 />
    </ExampleWrapper>
  );
}

function SonnerExample1() {
  return (
    <Example title="Basic">
      <Button
        variant="outline"
        onClick={() =>
          toast("Event has been created", {
            description: "Sunday, December 03, 2023 at 9:00 AM",
            action: {
              label: "Undo",
              onClick: () => console.log("Undo"),
            },
          })
        }
      >
        Show Toast
      </Button>
    </Example>
  );
}
