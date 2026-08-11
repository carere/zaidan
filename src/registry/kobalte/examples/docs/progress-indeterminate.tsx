import { Progress, ProgressLabel } from "@/registry/kobalte/ui/progress";

export default function ProgressIndeterminate() {
  return (
    <Progress indeterminate class="w-full max-w-sm">
      <ProgressLabel>Processing...</ProgressLabel>
    </Progress>
  );
}
