import { useDesignSystemSearchParams } from "@/lib/search-params";
import { useIsMobile } from "@/registry/hooks/use-mobile";
import { DropdownMenu, DropdownMenuTrigger } from "@/registry/ui/dropdown-menu";
import { Menu } from "../icons/menu";

export default function MenuColorPicker() {
  // Note: setParams is available for future use when menuColor feature is enabled
  const [params, _setParams] = useDesignSystemSearchParams();
  const isMobile = useIsMobile();

  // Get display label for menu color (currently only "default" is supported)
  // menuColor is not yet in the type system, so we access it via type assertion
  const getMenuColor = () => {
    const p = params() as unknown as Record<string, unknown>;
    return (p.menuColor as string | undefined) || "Default";
  };

  return (
    <div class="group/picker relative">
      <DropdownMenu gutter={4} placement={isMobile() ? "top" : "left-start"}>
        <DropdownMenuTrigger
          disabled
          class="relative flex w-[160px] shrink-0 touch-manipulation select-none items-center justify-between rounded-xl border border-foreground/10 bg-muted/50 p-2 transition-colors hover:bg-muted disabled:opacity-50 data-expanded:bg-muted md:w-full md:rounded-lg md:border-transparent md:bg-transparent"
        >
          <div class="flex flex-col justify-start text-left">
            <div class="text-muted-foreground text-xs">Menu Color</div>
            <div class="font-medium text-foreground text-sm">{getMenuColor()}</div>
          </div>
          <Menu class="size-4 text-muted-foreground" />
        </DropdownMenuTrigger>
      </DropdownMenu>
    </div>
  );
}
