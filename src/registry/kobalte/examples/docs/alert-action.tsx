import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/registry/kobalte/ui/alert";
import { Button } from "@/registry/kobalte/ui/button";

export default function AlertActionExample() {
  return (
    <Alert class="max-w-md">
      <AlertTitle>Dark mode is now available</AlertTitle>
      <AlertDescription>Enable it under your profile settings to get started.</AlertDescription>
      <AlertAction>
        <Button size="xs">Enable</Button>
      </AlertAction>
    </Alert>
  );
}
