import { Slider } from "@/registry/kobalte/ui/slider";

export default function SliderDisabled() {
  return (
    <Slider defaultValue={[50]} maxValue={100} step={1} disabled class="mx-auto w-full max-w-xs" />
  );
}
