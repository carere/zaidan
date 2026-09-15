import { Separator } from "@/registry/kobalte/ui/separator";

export default function SeparatorVerticalDemo() {
  return (
    <div class="flex h-5 items-center gap-4 text-sm">
      <div>Blog</div>
      <Separator orientation="vertical" />
      <div>Docs</div>
      <Separator orientation="vertical" />
      <div>Source</div>
    </div>
  );
}
