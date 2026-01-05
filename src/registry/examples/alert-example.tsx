import { Alert, AlertDescription, AlertTitle } from "@/registry/ui/alert";

export default function AlertExample() {
  return (
    <div class="mx-auto flex w-full max-w-lg flex-col gap-4">
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>You can add components to your app using the cli.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
      </Alert>
    </div>
  );
}
