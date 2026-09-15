import { toast } from "solid-sonner";
import { Button } from "@/registry/kobalte/ui/button";
import { Toaster } from "@/registry/kobalte/ui/toast";

export default function ToastPromise() {
  const showToast = () =>
    toast.promise(
      new Promise<{ name: string }>((resolve) => {
        window.setTimeout(() => resolve({ name: "Event" }), 2000);
      }),
      {
        loading: "Creating event…",
        success: (data) => `${data.name} created.`,
        error: "Could not create event.",
      },
    );

  return (
    <>
      <Toaster />
      <Button variant="outline" onClick={showToast}>
        Create Event
      </Button>
    </>
  );
}
