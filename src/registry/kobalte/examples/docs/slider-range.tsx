import { Slider } from "@/registry/kobalte/ui/slider";

export default function SliderRange() {
  return <Slider defaultValue={[25, 50]} max={100} step={5} class="mx-auto w-full max-w-xs" />;
}
