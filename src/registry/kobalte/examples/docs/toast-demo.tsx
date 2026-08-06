import { Button } from "@/registry/kobalte/ui/button";
import { createToastManager, Toaster } from "@/registry/kobalte/ui/toast";

const toastManager = createToastManager();

export default function ToastDemo() {
  const showToast = () => {
    const id = toastManager.add({
      title: "Event created",
      description: "Sunday, December 3 at 9:00 AM",
      actionProps: {
        children: "Undo",
        onClick() {
          toastManager.close(id);
        },
      },
    });
  };

  return (
    <>
      <Toaster toastManager={toastManager} />
      <Button variant="outline" onClick={showToast}>
        Show Toast
      </Button>
    </>
  );
}
