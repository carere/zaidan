import { Slider } from "@/registry/kobalte/ui/slider";

export default function SliderMultiple() {
  return <Slider defaultValue={[10, 20, 70]} max={100} step={10} class="mx-auto w-full max-w-xs" />;
}
