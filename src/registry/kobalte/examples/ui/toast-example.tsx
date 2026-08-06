import { Example, ExampleWrapper } from "@/components/example";
import { Button } from "@/registry/kobalte/ui/button";
import { Toaster, toast } from "@/registry/kobalte/ui/toast";

export default function ToastExample() {
  return (
    <>
      <Toaster />
      <ExampleWrapper>
        <ToastBasic />
        <ToastWithAction />
        <ToastPromise />
      </ExampleWrapper>
    </>
  );
}

function ToastBasic() {
  return (
    <Example title="Basic" class="items-center justify-center">
      <Button
        variant="outline"
        class="w-fit"
        onClick={() =>
          toast.add({
            title: "Event created",
            description: "Sunday, December 3 at 9:00 AM",
          })
        }
      >
        Show Toast
      </Button>
    </Example>
  );
}

function ToastWithAction() {
  const showToast = () => {
    const id = toast.add({
      title: "Event created",
      description: "You can undo this action.",
      actionProps: {
        children: "Undo",
        onClick() {
          toast.close(id);
          toast.add({ description: "Event creation undone." });
        },
      },
    });
  };

  return (
    <Example title="With Action" class="items-center justify-center">
      <Button variant="outline" class="w-fit" onClick={showToast}>
        Show Toast
      </Button>
    </Example>
  );
}

function ToastPromise() {
  const showToast = () => {
    void toast.promise(
      new Promise<{ name: string }>((resolve) => {
        window.setTimeout(() => resolve({ name: "Event" }), 2000);
      }),
      {
        loading: "Creating event…",
        success: (data) => `${data.name} created.`,
        error: "Could not create event.",
      },
    );
  };

  return (
    <Example title="Promise" class="items-center justify-center">
      <Button variant="outline" class="w-fit" onClick={showToast}>
        Create Event
      </Button>
    </Example>
  );
}
