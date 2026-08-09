import { Progress, ProgressLabel, ProgressValue } from "@/registry/kobalte/ui/progress";

export default function ProgressRange() {
  return (
    <Progress value={5} minValue={0} maxValue={10} class="w-full max-w-sm">
      <div class="flex w-full justify-between">
        <ProgressLabel>5 of 10 tasks completed</ProgressLabel>
        <ProgressValue />
      </div>
    </Progress>
  );
}
