import { createSignal, onCleanup, onMount } from "solid-js";
import { Progress } from "@/registry/kobalte/ui/progress";

export default function ProgressDemo() {
  const [progress, setProgress] = createSignal(13);

  onMount(() => {
    const timer = window.setTimeout(() => setProgress(66), 500);
    onCleanup(() => window.clearTimeout(timer));
  });

  return <Progress value={progress()} class="w-[60%]" />;
}
