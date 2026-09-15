import { Progress, ProgressLabel, ProgressValue } from "@/registry/kobalte/ui/progress";

export default function ProgressLabelDemo() {
  return (
    <Progress value={56} class="w-full max-w-sm">
      <ProgressLabel>Upload progress</ProgressLabel>
      <ProgressValue />
    </Progress>
  );
}
