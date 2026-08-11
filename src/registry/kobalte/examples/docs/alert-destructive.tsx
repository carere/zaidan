import { AlertCircleIcon } from "lucide-solid";
import { Alert, AlertDescription, AlertTitle } from "@/registry/kobalte/ui/alert";

export default function AlertDestructive() {
  return (
    <Alert variant="destructive" class="max-w-md">
      <AlertCircleIcon />
      <AlertTitle>Payment failed</AlertTitle>
      <AlertDescription>
        Your payment could not be processed. Please check your payment method and try again.
      </AlertDescription>
    </Alert>
  );
}
