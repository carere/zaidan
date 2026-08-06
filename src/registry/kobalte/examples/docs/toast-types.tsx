import { Button } from "@/registry/kobalte/ui/button";
import { createToastManager, Toaster } from "@/registry/kobalte/ui/toast";

const toastManager = createToastManager();

export default function ToastTypes() {
  return (
    <>
      <Toaster toastManager={toastManager} />
      <div class="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => toastManager.add({ description: "Event has been created." })}
        >
          Default
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toastManager.add({
              type: "success",
              description: "Event has been created.",
            })
          }
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toastManager.add({
              type: "info",
              description: "Arrive 10 minutes before the event.",
            })
          }
        >
          Info
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toastManager.add({
              type: "warning",
              description: "The event cannot start before 8:00 AM.",
            })
          }
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toastManager.add({
              type: "error",
              description: "The event could not be created.",
              priority: "high",
            })
          }
        >
          Error
        </Button>
      </div>
    </>
  );
}
