import { useIsMobile } from "@/registry/hooks/use-mobile";
import { DropdownMenu, DropdownMenuTrigger } from "@/registry/ui/dropdown-menu";
import { Lucide } from "../icons/lucide";

export default function IconLibraryPicker() {
  const isMobile = useIsMobile();
  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={isMobile() ? 8 : 0} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger
          disabled
          class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent"
        >
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Icon Library</div>
            <div class="font-medium text-foreground text-sm">Lucide</div>
          </div>
          <Lucide class="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
      </DropdownMenu>
    </div>
  );
}
