import { toast } from "solid-sonner";
import { Button } from "@/registry/kobalte/ui/button";
import { Toaster } from "@/registry/kobalte/ui/toast";

export default function ToastDemo() {
  const showToast = () =>
    toast("Event created", {
      description: "Sunday, December 3 at 9:00 AM",
      action: {
        label: "Undo",
        onClick: () => {},
      },
    });

  return (
    <>
      <Toaster />
      <Button variant="outline" onClick={showToast}>
        Show Toast
      </Button>
    </>
  );
}
