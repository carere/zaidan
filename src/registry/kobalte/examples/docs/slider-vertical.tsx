import { Slider } from "@/registry/kobalte/ui/slider";

export default function SliderVertical() {
  return (
    <div class="mx-auto flex w-full max-w-xs items-center justify-center gap-6">
      <Slider defaultValue={[50]} maxValue={100} step={1} orientation="vertical" class="h-40" />
      <Slider defaultValue={[25]} maxValue={100} step={1} orientation="vertical" class="h-40" />
    </div>
  );
}
