import { Button } from "@/registry/kobalte/ui/button";
import { createToastManager, Toaster } from "@/registry/kobalte/ui/toast";

const toastManager = createToastManager();

export default function ToastPromise() {
  const showToast = () => {
    void toastManager.promise(
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
    <>
      <Toaster toastManager={toastManager} />
      <Button variant="outline" onClick={showToast}>
        Create Event
      </Button>
    </>
  );
}
